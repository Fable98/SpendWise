import { Request, Response, NextFunction } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categories.service';
import { successResponse, errorResponse } from '../../utils/response';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await getCategories(req.user!.id);
    successResponse(res, categories, 'Categories retrieved');
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await getCategoryById(req.params.id as string, req.user!.id);
    if (!category) { errorResponse(res, 'Category not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, category, 'Category retrieved');
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await createCategory(req.user!.id, req.body);
    successResponse(res, category, 'Category created', 201);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await updateCategory(req.params.id as string, req.user!.id, req.body);
    if (!category) { errorResponse(res, 'Category not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, category, 'Category updated');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteCategory(req.params.id as string, req.user!.id);
    if (!deleted) { errorResponse(res, 'Category not found', 404, 'NOT_FOUND'); return; }
    successResponse(res, null, 'Category deleted');
  } catch (err) { next(err); }
}
