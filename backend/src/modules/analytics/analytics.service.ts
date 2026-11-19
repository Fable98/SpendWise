import { prisma } from '../../config/prisma';

export async function getDashboardSummary(userId: string, year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [allTimeAgg, monthlyAgg, recentTransactions] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, transactionDate: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
      take: 10,
      include: { category: { select: { id: true, name: true, type: true } } },
    }),
  ]);

  const totalIncome = allTimeAgg.find((r) => r.type === 'INCOME')?._sum.amount?.toString() ?? '0';
  const totalExpenses = allTimeAgg.find((r) => r.type === 'EXPENSE')?._sum.amount?.toString() ?? '0';
  const monthlyIncome = monthlyAgg.find((r) => r.type === 'INCOME')?._sum.amount?.toString() ?? '0';
  const monthlyExpenses = monthlyAgg.find((r) => r.type === 'EXPENSE')?._sum.amount?.toString() ?? '0';

  const balance = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toFixed(2);
  const monthlySavings = (parseFloat(monthlyIncome) - parseFloat(monthlyExpenses)).toFixed(2);

  return {
    totalIncome,
    totalExpenses,
    balance,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    recentTransactions: recentTransactions.map((t) => ({ ...t, amount: t.amount.toString() })),
  };
}

export async function getMonthlyTrend(userId: string, months: number = 6) {
  const results = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const agg = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        transactionDate: { gte: date, lt: nextDate },
      },
      _sum: { amount: true },
    });

    results.push({
      month: date.toISOString().slice(0, 7),
      income: agg.find((r) => r.type === 'INCOME')?._sum.amount?.toString() ?? '0',
      expenses: agg.find((r) => r.type === 'EXPENSE')?._sum.amount?.toString() ?? '0',
    });
  }

  return results;
}

export async function getCategoryBreakdown(
  userId: string,
  startDate: Date,
  endDate: Date,
  type: 'INCOME' | 'EXPENSE' = 'EXPENSE'
) {
  const result = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type,
      transactionDate: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const withCategories = await Promise.all(
    result.map(async (r) => {
      const category = await prisma.category.findUnique({
        where: { id: r.categoryId },
        select: { name: true, type: true },
      });
      return {
        categoryId: r.categoryId,
        categoryName: category?.name ?? 'Unknown',
        total: r._sum.amount?.toString() ?? '0',
      };
    })
  );

  return withCategories;
}

export async function getSpendingByPeriod(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  year: number,
  month?: number
) {
  if (period === 'daily' && month) {
    const daysInMonth = new Date(year, month, 0).getDate();

    const results = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, month - 1, day);
      const dayEnd = new Date(year, month - 1, day + 1);
      const agg = await prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          transactionDate: { gte: dayStart, lt: dayEnd },
        },
        _sum: { amount: true },
      });
      results.push({ date: dayStart.toISOString().slice(0, 10), amount: agg._sum.amount?.toString() ?? '0' });
    }
    return results;
  }

  if (period === 'monthly') {
    return getMonthlyTrend(userId, 12);
  }

  if (period === 'yearly') {
    const results = [];
    for (let y = year - 4; y <= year; y++) {
      const agg = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          transactionDate: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) },
        },
        _sum: { amount: true },
      });
      results.push({
        year: y,
        income: agg.find((r) => r.type === 'INCOME')?._sum.amount?.toString() ?? '0',
        expenses: agg.find((r) => r.type === 'EXPENSE')?._sum.amount?.toString() ?? '0',
      });
    }
    return results;
  }

  return [];
}

export async function getBudgetUtilization(userId: string, year: number, month: number) {
  const budgets = await prisma.budget.findMany({
    where: { userId, year, month },
    include: { category: { select: { id: true, name: true } } },
  });

  return Promise.all(
    budgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'EXPENSE',
          transactionDate: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
        _sum: { amount: true },
      });

      const spent = parseFloat(spending._sum.amount?.toString() ?? '0');
      const limit = parseFloat(budget.amount.toString());

      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        limit: budget.amount.toString(),
        spent: spent.toFixed(2),
        remaining: (limit - spent).toFixed(2),
        utilizationPct: limit > 0 ? Math.round((spent / limit) * 100) : 0,
        isOverBudget: spent > limit,
      };
    })
  );
}
