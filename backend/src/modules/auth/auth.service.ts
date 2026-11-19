import argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';

// In-memory session store (replace with Redis in production)
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  sessions.set(token, { userId, expiresAt });
  return token;
}

export async function verifySession(token: string): Promise<string | null> {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    sessions.delete(token);
    return null;
  }
  return session.userId;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_EXISTS' });
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }

  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}
