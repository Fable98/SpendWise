import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export async function listBudgets(userId: string, year?: number, month?: number) {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      ...(year !== undefined && { year }),
      ...(month !== undefined && { month }),
    },
    include: { category: { select: { id: true, name: true, type: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'EXPENSE',
          transactionDate: {
            gte: new Date(budget.year, budget.month - 1, 1),
            lt: new Date(budget.year, budget.month, 1),
          },
        },
        _sum: { amount: true },
      });

      const spent = spending._sum.amount?.toString() ?? '0';
      const budgetAmount = budget.amount.toString();
      const spentNum = parseFloat(spent);
      const budgetNum = parseFloat(budgetAmount);
      const remaining = (budgetNum - spentNum).toFixed(2);
      const utilizationPct = budgetNum > 0 ? Math.round((spentNum / budgetNum) * 100) : 0;

      return {
        ...budget,
        amount: budgetAmount,
        spent,
        remaining,
        utilizationPct,
        isOverBudget: spentNum > budgetNum,
        isWarning: utilizationPct >= 80 && spentNum <= budgetNum,
      };
    })
  );

  return budgetsWithSpending;
}

export async function getBudgetById(id: string, userId: string) {
  const budget = await prisma.budget.findFirst({
    where: { id, userId },
    include: { category: { select: { id: true, name: true, type: true } } },
  });
  if (!budget) return null;

  const spending = await prisma.transaction.aggregate({
    where: {
      userId,
      categoryId: budget.categoryId,
      type: 'EXPENSE',
      transactionDate: {
        gte: new Date(budget.year, budget.month - 1, 1),
        lt: new Date(budget.year, budget.month, 1),
      },
    },
    _sum: { amount: true },
  });

  const spent = spending._sum.amount?.toString() ?? '0';
  const budgetAmount = budget.amount.toString();
  const spentNum = parseFloat(spent);
  const budgetNum = parseFloat(budgetAmount);

  return {
    ...budget,
    amount: budgetAmount,
    spent,
    remaining: (budgetNum - spentNum).toFixed(2),
    utilizationPct: budgetNum > 0 ? Math.round((spentNum / budgetNum) * 100) : 0,
    isOverBudget: spentNum > budgetNum,
    isWarning: spentNum / budgetNum >= 0.8 && spentNum <= budgetNum,
  };
}

export async function createBudget(
  userId: string,
  data: { categoryId: string; amount: string; month: number; year: number }
) {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, OR: [{ userId: null }, { userId }] },
  });
  if (!category) throw Object.assign(new Error('Category not found'), { code: 'CATEGORY_NOT_FOUND' });
  if (category.type !== 'EXPENSE') {
    throw Object.assign(new Error('Budgets can only be set for expense categories'), { code: 'INVALID_CATEGORY_TYPE' });
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      categoryId: data.categoryId,
      amount: new Prisma.Decimal(data.amount),
      month: data.month,
      year: data.year,
    },
    include: { category: { select: { id: true, name: true, type: true } } },
  });
  return { ...budget, amount: budget.amount.toString() };
}

export async function updateBudget(
  id: string,
  userId: string,
  data: { amount?: string; month?: number; year?: number }
) {
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const updateData: Prisma.BudgetUpdateInput = {};
  if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
  if (data.month !== undefined) updateData.month = data.month;
  if (data.year !== undefined) updateData.year = data.year;

  const budget = await prisma.budget.update({
    where: { id },
    data: updateData,
    include: { category: { select: { id: true, name: true, type: true } } },
  });
  return { ...budget, amount: budget.amount.toString() };
}

export async function deleteBudget(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.budget.delete({ where: { id } });
  return true;
}
