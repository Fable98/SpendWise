import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { requireAuth } from './middleware/auth.middleware';

import authRoutes from './modules/auth/auth.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import transactionsRoutes from './modules/transactions/transactions.routes';
import budgetsRoutes from './modules/budgets/budgets.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import integrationsRoutes from './modules/integrations/upi/upi.routes';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-SpendWise-Token'],
  })
);

app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', requireAuth, categoriesRoutes);
app.use('/api/v1/transactions', requireAuth, transactionsRoutes);
app.use('/api/v1/budgets', requireAuth, budgetsRoutes);
app.use('/api/v1/analytics', requireAuth, analyticsRoutes);
app.use('/api/v1/integrations', integrationsRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

app.use(errorHandler);

export default app;
