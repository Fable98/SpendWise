import crypto from 'crypto';
import { Prisma, TransactionSource, SyncStatus } from '@prisma/client';
import { prisma } from '../../../config/prisma';
import { IngestionPayload } from './types';
import { scrubRawPayload } from './scrubber';
import { parseUpi } from './parser';
import { computeFingerprint, findDuplicateOrNearMatch } from './deduplication';
import { resolveCategory } from './categorizer';

/**
 * Generates a high-entropy API token for the mobile listener.
 * Raw format: spw_live_<64 hex chars>
 */
export async function generateIntegrationToken(userId: string, name: string) {
  const randomEntropy = crypto.randomBytes(32).toString('hex');
  const rawToken = `spw_live_${randomEntropy}`;
  const tokenPrefix = rawToken.slice(0, 12);
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await prisma.integrationToken.create({
    data: {
      userId,
      name: name.trim() || 'Android Companion',
      tokenPrefix,
      tokenHash,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      isActive: true,
      createdAt: true,
    },
  });

  return {
    ...record,
    rawToken, // Only returned once at creation time
  };
}

export async function listIntegrationTokens(userId: string) {
  return prisma.integrationToken.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeIntegrationToken(id: string, userId: string) {
  const existing = await prisma.integrationToken.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.integrationToken.delete({ where: { id } });
  return true;
}

export async function listCategoryRules(userId: string) {
  return prisma.categoryRule.findMany({
    where: { userId },
    include: { category: { select: { id: true, name: true, type: true } } },
    orderBy: { priority: 'desc' },
  });
}

export async function createCategoryRule(
  userId: string,
  data: { categoryId: string; keyword: string; priority?: number }
) {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, OR: [{ userId: null }, { userId }] },
  });
  if (!category) {
    throw Object.assign(new Error('Category not found'), { code: 'CATEGORY_NOT_FOUND' });
  }

  return prisma.categoryRule.create({
    data: {
      userId,
      categoryId: data.categoryId,
      keyword: data.keyword.trim().toLowerCase(),
      priority: data.priority ?? 0,
    },
    include: { category: { select: { id: true, name: true, type: true } } },
  });
}

export async function deleteCategoryRule(id: string, userId: string) {
  const existing = await prisma.categoryRule.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.categoryRule.delete({ where: { id } });
  return true;
}

/**
 * Core ingestion logic for live UPI notification or SMS.
 */
export async function ingestUpiPayload(userId: string, payload: IngestionPayload) {
  const rawText = `${payload.title ? payload.title + ' ' : ''}${payload.body || ''}`.trim();
  const scrubbed = scrubRawPayload(rawText);

  if (!scrubbed) {
    return {
      action: 'REJECTED' as const,
      message: 'Empty payload provided',
    };
  }

  const pkgIdentifier = payload.packageName || payload.sender || 'com.google.android.apps.nbu.paisa.user';
  const parsed = parseUpi(pkgIdentifier, scrubbed, payload.timestamp);

  if (!parsed || parsed.amount <= 0) {
    return {
      action: 'REJECTED' as const,
      message: 'Payload did not match any financial debit or credit templates',
      rawScrubbed: scrubbed,
    };
  }

  // Determine review status based on confidence
  const syncStatus: SyncStatus =
    parsed.confidence >= 0.85
      ? 'PROCESSED'
      : parsed.confidence >= 0.5
      ? 'PENDING_REVIEW'
      : 'REJECTED';

  const transactionDate = parsed.timestamp || new Date();
  const fingerprint = computeFingerprint({
    userId,
    amount: parsed.amount,
    type: parsed.type,
    merchant: parsed.merchant,
    date: transactionDate,
  });

  // Run cascading deduplication
  const match = await findDuplicateOrNearMatch(userId, parsed, fingerprint, 3);

  if (match) {
    // If incoming transaction has new details (like UTR or merchant) that existing lacks, enrich it!
    const canEnrichUtr = !match.transaction.externalId && Boolean(parsed.utr);
    const canEnrichMerchant = !match.transaction.merchantName && Boolean(parsed.merchant);

    if (canEnrichUtr || canEnrichMerchant) {
      const updateData: Prisma.TransactionUpdateInput = {};

      if (canEnrichUtr) {
        updateData.externalId = parsed.utr;
      }
      if (canEnrichMerchant) {
        updateData.merchantName = parsed.merchant;
        if (!match.transaction.description || match.transaction.description === 'UPI Transaction') {
          updateData.description = `UPI: ${parsed.merchant}`;
        }
      }

      await prisma.transaction.update({
        where: { id: match.transaction.id },
        data: updateData,
      });

      return {
        action: 'MERGED' as const,
        transactionId: match.transaction.id,
        message: 'Enriched existing transaction with companion alert details',
        matchType: match.matchType,
      };
    }

    // Otherwise it is an identical duplicate
    return {
      action: 'DUPLICATE' as const,
      transactionId: match.transaction.id,
      message: 'Transaction already recorded',
      matchType: match.matchType,
    };
  }

  // Brand new unique transaction -> resolve category & insert
  const category = await resolveCategory(userId, parsed.merchant, parsed.type);

  const resolvedSource: TransactionSource =
    payload.source === 'BANK_SMS' ? 'BANK_SMS' : 'GPAY_NOTIFICATION';

  const created = await prisma.transaction.create({
    data: {
      userId,
      categoryId: category.id,
      amount: new Prisma.Decimal(parsed.amount.toFixed(2)),
      type: parsed.type,
      description: parsed.merchant ? `UPI: ${parsed.merchant}` : 'UPI Transaction',
      transactionDate,
      source: resolvedSource,
      externalId: parsed.utr || null,
      fingerprint,
      merchantName: parsed.merchant || null,
      rawPayload: scrubbed,
      confidence: new Prisma.Decimal(parsed.confidence.toFixed(2)),
      syncStatus,
    },
    include: {
      category: { select: { id: true, name: true, type: true } },
    },
  });

  return {
    action: 'CREATED' as const,
    transactionId: created.id,
    amount: parseFloat(created.amount.toString()).toFixed(2),
    type: created.type,
    merchant: created.merchantName,
    category: created.category,
    externalId: created.externalId,
    status: created.syncStatus,
    confidence: parsed.confidence,
    strategy: parsed.strategy,
  };
}
