import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { verifySession } from '../modules/auth/auth.service';
import { errorResponse } from '../utils/response';
import { config } from '../config/env';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionToken = req.cookies?.[config.cookieName];
    if (!sessionToken) {
      errorResponse(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    const userId = await verifySession(sessionToken);
    if (!userId) {
      res.clearCookie(config.cookieName);
      errorResponse(res, 'Session expired or invalid', 401, 'SESSION_EXPIRED');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      res.clearCookie(config.cookieName);
      errorResponse(res, 'User not found', 401, 'USER_NOT_FOUND');
      return;
    }

    req.user = user;
    next();
  } catch {
    errorResponse(res, 'Authentication error', 500, 'AUTH_ERROR');
  }
}
