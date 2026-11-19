import { z } from 'zod';

export const createBudgetSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid(),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }),
});

export const updateBudgetSchema = z.object({
  body: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});
