import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

export async function listTransactions(
  userId: string,
  query: {
    page?: string;
    limit?: string;
    type?: TransactionType;
    categoryId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }
) {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const where: Prisma.TransactionWhereInput = { userId };
  if (query.type) where.type = query.type;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) {
    where.description = { contains: query.search, mode: 'insensitive' };
  }
  if (query.startDate || query.endDate) {
    where.transactionDate = {};
    if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
    if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
  }

  const allowedSortFields = ['transactionDate', 'amount', 'createdAt'];
  const sortBy = allowedSortFields.includes(query.sortBy || '') ? query.sortBy : 'transactionDate';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy!]: sortOrder },
      include: { category: { select: { id: true, name: true, type: true } } },
    }),
  ]);

  return {
    transactions: transactions.map(serializeTransaction),
    meta: buildPaginationMeta(total, { page, limit }),
  };
}

export async function getTransactionById(id: string, userId: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: { select: { id: true, name: true, type: true } } },
  });
  return tx ? serializeTransaction(tx) : null;
}

export async function createTransaction(
  userId: string,
  data: {
    amount: string;
    type: TransactionType;
    categoryId: string;
    description?: string;
    transactionDate: string;
  }
) {
  // Verify category ownership
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, OR: [{ userId: null }, { userId }] },
  });
  if (!category) throw Object.assign(new Error('Category not found'), { code: 'CATEGORY_NOT_FOUND' });
  if (category.type !== data.type) {
    throw Object.assign(new Error('Category type must match transaction type'), { code: 'TYPE_MISMATCH' });
  }

  const tx = await prisma.transaction.create({
    data: {
      userId,
      categoryId: data.categoryId,
      amount: new Prisma.Decimal(data.amount),
      type: data.type,
      description: data.description,
      transactionDate: new Date(data.transactionDate),
    },
    include: { category: { select: { id: true, name: true, type: true } } },
  });
  return serializeTransaction(tx);
}

export async function updateTransaction(
  id: string,
  userId: string,
  data: {
    amount?: string;
    type?: TransactionType;
    categoryId?: string;
    description?: string | null;
    transactionDate?: string;
  }
) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return null;

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, OR: [{ userId: null }, { userId }] },
    });
    if (!category) throw Object.assign(new Error('Category not found'), { code: 'CATEGORY_NOT_FOUND' });
    const resolvedType = data.type ?? existing.type;
    if (category.type !== resolvedType) {
      throw Object.assign(new Error('Category type must match transaction type'), { code: 'TYPE_MISMATCH' });
    }
  }

  const updateData: Prisma.TransactionUpdateInput = {};
  if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
  if (data.type !== undefined) updateData.type = data.type;
  if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
  if (data.description !== undefined) updateData.description = data.description;
  if (data.transactionDate !== undefined) updateData.transactionDate = new Date(data.transactionDate);

  const tx = await prisma.transaction.update({
    where: { id },
    data: updateData,
    include: { category: { select: { id: true, name: true, type: true } } },
  });
  return serializeTransaction(tx);
}

export async function deleteTransaction(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.transaction.delete({ where: { id } });
  return true;
}

function serializeTransaction(tx: {
  id: string;
  userId: string;
  categoryId: string;
  amount: Prisma.Decimal | { toString(): string };
  type: TransactionType;
  description: string | null;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; type: TransactionType };
}) {
  // Always serialise to exactly 2 decimal places for consistent API output
  const amountStr = parseFloat(tx.amount.toString()).toFixed(2);
  return {
    ...tx,
    amount: amountStr,
  };
}
