import { z } from 'zod';
import { TransactionType } from '@prisma/client';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim(),
    type: z.nativeEnum(TransactionType),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});
