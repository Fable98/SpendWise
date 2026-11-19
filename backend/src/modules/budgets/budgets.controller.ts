import { Request, Response, NextFunction } from 'express';
import { listBudgets, getBudgetById, createBudget, updateBudget, deleteBudget } from './budgets.service';
import { successResponse, errorResponse } from '../../utils/response';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = req.query.year ? parseInt(String(req.query.year)) : undefined;
    const month = req.query.month ? parseInt(String(req.query.month)) : undefined;
    const budgets = await listBudgets(req.user!.id, year, month);
    successResponse(res, budgets, 'Budgets retrieved');
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const budget = await getBudgetById(req.params.id as string, req.user!.id);
    if (!budget) { errorResponse(res, 'Budget not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, budget, 'Budget retrieved');
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const budget = await createBudget(req.user!.id, req.body);
    successResponse(res, budget, 'Budget created', 201);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'CATEGORY_NOT_FOUND') { errorResponse(res, 'Category not found', 404, 'NOT_FOUND'); return; }
    if (e.code === 'INVALID_CATEGORY_TYPE') { errorResponse(res, e.message!, 400, 'INVALID_CATEGORY_TYPE'); return; }
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const budget = await updateBudget(req.params.id as string, req.user!.id, req.body);
    if (!budget) { errorResponse(res, 'Budget not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, budget, 'Budget updated');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteBudget(req.params.id as string, req.user!.id);
    if (!deleted) { errorResponse(res, 'Budget not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, null, 'Budget deleted');
  } catch (err) { next(err); }
}
