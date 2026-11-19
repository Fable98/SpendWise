import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  sessionSecret: requireEnv('SESSION_SECRET'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  cookieName: 'spendwise_session',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  bcryptRounds: 12,
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
  authRateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 20,
  },
};
