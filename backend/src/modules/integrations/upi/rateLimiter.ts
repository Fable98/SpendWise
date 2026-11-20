import rateLimit from 'express-rate-limit';

/**
 * Dedicated rate limiter for the public webhook endpoint.
 * Limits to 30 requests per minute per IP / token.
 */
export const upiWebhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    message: 'Too many integration webhook requests, please try again shortly.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req) => {
    const rawToken = (req.headers['x-spendwise-token'] as string) || '';
    if (rawToken.length >= 12) {
      return rawToken.slice(0, 12);
    }
    return req.ip || '127.0.0.1';
  },
});
