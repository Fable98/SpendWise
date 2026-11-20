import crypto from 'crypto';
import { Prisma, Transaction } from '@prisma/client';
import { prisma } from '../../../config/prisma';
import { ParsedTxn } from './types';

export type DeduplicationResult =
  | { matchType: 'EXACT_UTR'; transaction: Transaction }
  | { matchType: 'FINGERPRINT'; transaction: Transaction }
  | { matchType: 'PROXIMITY_WINDOW'; transaction: Transaction }
  | null;

/**
 * Computes a deterministic SHA-256 fingerprint bucketed into 5-minute intervals.
 */
export function computeFingerprint(params: {
  userId: string;
  amount: number;
  type: string;
  merchant?: string;
  date: Date;
}): string {
  // Quantize date to a 5-minute bucket (300,000 ms)
  const bucket = Math.floor(params.date.getTime() / 300000);
  const normalizedMerchant = (params.merchant || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
  const raw = `${params.userId}:${params.amount.toFixed(2)}:${params.type}:${normalizedMerchant}:${bucket}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Cascading duplicate & fuzzy match check:
 * 1. Exact UTR lookup
 * 2. 5-minute bucketed fingerprint lookup
 * 3. ±3-minute time window lookup (amount + type proximity match)
 */
export async function findDuplicateOrNearMatch(
  userId: string,
  parsed: ParsedTxn,
  fingerprint: string,
  windowMinutes = 3
): Promise<DeduplicationResult> {
  // Tier 1: Exact UTR lookup
  if (parsed.utr) {
    const existingByUtr = await prisma.transaction.findFirst({
      where: { userId, externalId: parsed.utr },
    });
    if (existingByUtr) {
      return { matchType: 'EXACT_UTR', transaction: existingByUtr };
    }
  }

  // Tier 2: 5-minute Fingerprint lookup
  const existingByFingerprint = await prisma.transaction.findFirst({
    where: { userId, fingerprint },
  });
  if (existingByFingerprint) {
    return { matchType: 'FINGERPRINT', transaction: existingByFingerprint };
  }

  // Tier 3: Proximity window lookup (±3 minutes)
  const baseTime = parsed.timestamp || new Date();
  const minDate = new Date(baseTime.getTime() - windowMinutes * 60 * 1000);
  const maxDate = new Date(baseTime.getTime() + windowMinutes * 60 * 1000);

  const existingInWindow = await prisma.transaction.findFirst({
    where: {
      userId,
      type: parsed.type,
      amount: new Prisma.Decimal(parsed.amount.toFixed(2)),
      transactionDate: {
        gte: minDate,
        lte: maxDate,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingInWindow) {
    return { matchType: 'PROXIMITY_WINDOW', transaction: existingInWindow };
  }

  return null;
}
