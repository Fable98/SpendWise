import { Router } from 'express';
import {
  dashboard,
  monthlyTrend,
  categoryBreakdown,
  spendingByPeriod,
  budgetUtilization,
} from './analytics.controller';

const router = Router();

router.get('/dashboard', dashboard);
router.get('/monthly-trend', monthlyTrend);
router.get('/category-breakdown', categoryBreakdown);
router.get('/spending', spendingByPeriod);
router.get('/budget-utilization', budgetUtilization);

export default router;
