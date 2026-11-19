import { Request, Response, NextFunction } from 'express';
import {
  getDashboardSummary,
  getMonthlyTrend,
  getCategoryBreakdown,
  getSpendingByPeriod,
  getBudgetUtilization,
} from './analytics.service';
import { successResponse, errorResponse } from '../../utils/response';

export async function dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const year = parseInt(String(req.query.year || now.getFullYear()));
    const month = parseInt(String(req.query.month || now.getMonth() + 1));
    const data = await getDashboardSummary(req.user!.id, year, month);
    successResponse(res, data, 'Dashboard summary retrieved');
  } catch (err) { next(err); }
}

export async function monthlyTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const months = parseInt(String(req.query.months || '6'));
    const data = await getMonthlyTrend(req.user!.id, Math.min(24, Math.max(1, months)));
    successResponse(res, data, 'Monthly trend retrieved');
  } catch (err) { next(err); }
}

export async function categoryBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const year = parseInt(String(req.query.year || now.getFullYear()));
    const month = parseInt(String(req.query.month || now.getMonth() + 1));
    const type = (req.query.type as 'INCOME' | 'EXPENSE') || 'EXPENSE';
    if (type !== 'INCOME' && type !== 'EXPENSE') {
      errorResponse(res, 'Invalid type', 400, 'VALIDATION_ERROR');
      return;
    }
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const data = await getCategoryBreakdown(req.user!.id, startDate, endDate, type);
    successResponse(res, data, 'Category breakdown retrieved');
  } catch (err) { next(err); }
}

export async function spendingByPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly';
    const now = new Date();
    const year = parseInt(String(req.query.year || now.getFullYear()));
    const month = req.query.month ? parseInt(String(req.query.month)) : undefined;
    const data = await getSpendingByPeriod(req.user!.id, period, year, month);
    successResponse(res, data, 'Spending by period retrieved');
  } catch (err) { next(err); }
}

export async function budgetUtilization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const year = parseInt(String(req.query.year || now.getFullYear()));
    const month = parseInt(String(req.query.month || now.getMonth() + 1));
    const data = await getBudgetUtilization(req.user!.id, year, month);
    successResponse(res, data, 'Budget utilization retrieved');
  } catch (err) { next(err); }
}
