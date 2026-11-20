import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireIntegrationToken } from './auth.middleware';
import { upiWebhookRateLimiter } from './rateLimiter';
import {
  handleUpiWebhook,
  getTokens,
  createToken,
  deleteToken,
  getRules,
  createRule,
  deleteRule,
} from './upi.controller';

const router = Router();

// Public Webhook endpoint (protected by custom token middleware and dedicated rate limiter)
router.post('/upi/webhook', upiWebhookRateLimiter, requireIntegrationToken, handleUpiWebhook);

// User-Authenticated Token Management routes (session auth)
router.get('/tokens', requireAuth, getTokens);
router.post('/tokens', requireAuth, createToken);
router.delete('/tokens/:id', requireAuth, deleteToken);

// User-Authenticated Category Rules routes (session auth)
router.get('/rules', requireAuth, getRules);
router.post('/rules', requireAuth, createRule);
router.delete('/rules/:id', requireAuth, deleteRule);

export default router;
