import { Request, Response, NextFunction } from 'express';
import {
  listTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from './transactions.service';
import { successResponse, errorResponse } from '../../utils/response';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listTransactions(req.user!.id, req.query as Record<string, string>);
    successResponse(res, result.transactions, 'Transactions retrieved', 200, result.meta);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tx = await getTransactionById(req.params.id as string, req.user!.id);
    if (!tx) { errorResponse(res, 'Transaction not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, tx, 'Transaction retrieved');
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tx = await createTransaction(req.user!.id, req.body);
    successResponse(res, tx, 'Transaction created', 201);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'CATEGORY_NOT_FOUND') { errorResponse(res, 'Category not found', 404, 'NOT_FOUND'); return; }
    if (e.code === 'TYPE_MISMATCH') { errorResponse(res, e.message || 'Type mismatch', 400, 'TYPE_MISMATCH'); return; }
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tx = await updateTransaction(req.params.id as string, req.user!.id, req.body);
    if (!tx) { errorResponse(res, 'Transaction not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, tx, 'Transaction updated');
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'CATEGORY_NOT_FOUND') { errorResponse(res, 'Category not found', 404, 'NOT_FOUND'); return; }
    if (e.code === 'TYPE_MISMATCH') { errorResponse(res, e.message || 'Type mismatch', 400, 'TYPE_MISMATCH'); return; }
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteTransaction(req.params.id as string, req.user!.id);
    if (!deleted) { errorResponse(res, 'Transaction not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, null, 'Transaction deleted');
  } catch (err) { next(err); }
}
