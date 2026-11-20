import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../config/prisma';
import { errorResponse } from '../../../utils/response';

export async function requireIntegrationToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawToken =
      (req.headers['x-spendwise-token'] as string) ||
      (req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].slice(7)
        : undefined);

    if (!rawToken || rawToken.length < 24) {
      errorResponse(res, 'Missing or invalid X-SpendWise-Token header', 401, 'UNAUTHORIZED');
      return;
    }

    // O(1) Candidate lookup by first 12 characters prefix
    const prefix = rawToken.slice(0, 12);
    const candidates = await prisma.integrationToken.findMany({
      where: { tokenPrefix: prefix, isActive: true },
      select: { id: true, userId: true, tokenHash: true },
    });

    if (candidates.length === 0) {
      errorResponse(res, 'Invalid integration token', 401, 'UNAUTHORIZED');
      return;
    }

    const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const matched = candidates.find((cand) => {
      try {
        const a = Buffer.from(cand.tokenHash, 'utf8');
        const b = Buffer.from(computedHash, 'utf8');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      } catch {
        return false;
      }
    });

    if (!matched) {
      errorResponse(res, 'Invalid integration token', 401, 'UNAUTHORIZED');
      return;
    }

    // Asynchronously record last usage timestamp without blocking request
    prisma.integrationToken
      .update({
        where: { id: matched.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    // Attach authenticated user identity
    req.user = { id: matched.userId } as any;
    next();
  } catch {
    errorResponse(res, 'Integration authentication failed', 500, 'AUTH_ERROR');
  }
}
