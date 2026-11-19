import { z } from 'zod';
import { TransactionType } from '@prisma/client';

export const createTransactionSchema = z.object({
  body: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal string'),
    type: z.nativeEnum(TransactionType),
    categoryId: z.string().uuid(),
    description: z.string().max(500).optional(),
    transactionDate: z.string().datetime(),
  }),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    type: z.nativeEnum(TransactionType).optional(),
    categoryId: z.string().uuid().optional(),
    description: z.string().max(500).optional().nullable(),
    transactionDate: z.string().datetime().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const listTransactionsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    type: z.nativeEnum(TransactionType).optional(),
    categoryId: z.string().uuid().optional(),
    search: z.string().max(200).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    sortBy: z.enum(['transactionDate', 'amount', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
