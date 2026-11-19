import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/env';
import { registerUser, loginUser, createSession, destroySession } from './auth.service';
import { successResponse, errorResponse } from '../../utils/response';

function setCookieOptions(res: Response, token: string) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: config.cookieMaxAge,
    path: '/',
  });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await registerUser(req.body);
    const token = createSession(user.id);
    setCookieOptions(res, token);
    successResponse(res, user, 'Registration successful', 201);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'EMAIL_EXISTS') {
      errorResponse(res, 'Email already registered', 409, 'EMAIL_EXISTS');
      return;
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await loginUser(req.body.email, req.body.password);
    const token = createSession(user.id);
    setCookieOptions(res, token);
    successResponse(res, user, 'Login successful');
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'INVALID_CREDENTIALS') {
      errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      return;
    }
    next(err);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[config.cookieName];
  if (token) destroySession(token);
  res.clearCookie(config.cookieName, { path: '/' });
  successResponse(res, null, 'Logged out successfully');
}

export async function me(req: Request, res: Response): Promise<void> {
  successResponse(res, req.user, 'User retrieved');
}
