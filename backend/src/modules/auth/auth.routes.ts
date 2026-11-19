import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { registerSchema, loginSchema } from './auth.schema';
import { config } from '../../config/env';

const router = Router();

const authLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
  message: { success: false, message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

export default router;
