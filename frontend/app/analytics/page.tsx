'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import {
  useDashboardSummary,
  useMonthlyTrend,
  useCategoryBreakdown,
  useBudgetUtilization,
} from '@/hooks/useAnalytics';
import { formatCurrency, getMonthName, getCurrentMonth, formatPercent } from '@/lib/utils';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: getMonthName(i + 1),
}));

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

export default function AnalyticsPage() {
  const { month, year } = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [trendMonths, setTrendMonths] = useState(6);
  const [breakdownType, setBreakdownType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(selectedYear, selectedMonth);
  const { data: trend, isLoading: trendLoading } = useMonthlyTrend(trendMonths);
  const { data: breakdown, isLoading: breakdownLoading } = useCategoryBreakdown(selectedYear, selectedMonth, breakdownType);
  const { data: budgetUtil, isLoading: budgetLoading } = useBudgetUtilization(selectedYear, selectedMonth);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header + controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-gray-400 mt-1 text-sm">Financial insights and trends</p>
          </div>
          <div className="flex gap-2">
            <Select
              options={MONTHS}
              value={String(selectedMonth)}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-36"
            />
            <Select
              options={YEARS}
              value={String(selectedYear)}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>

        {/* Monthly summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Monthly Income', value: summary?.monthlyIncome, color: 'text-emerald-400' },
            { label: 'Monthly Expenses', value: summary?.monthlyExpenses, color: 'text-red-400' },
            { label: 'Monthly Savings', value: summary?.monthlySavings, color: 'text-brand-400' },
            { label: 'Net Balance', value: summary?.balance, color: parseFloat(summary?.balance ?? '0') >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map((s) => (
            <Card key={s.label}>
              <CardBody className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-24 mt-2" />
                ) : (
                  <p className={`text-lg font-bold mt-1 ${s.color}`}>
                    {s.value ? formatCurrency(s.value) : '—'}
                  </p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Trend chart */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Income vs Expenses Trend</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Monthly comparison</p>
            </div>
            <Select
              options={[
                { value: '3', label: 'Last 3 months' },
                { value: '6', label: 'Last 6 months' },
                { value: '12', label: 'Last 12 months' },
              ]}
              value={String(trendMonths)}
              onChange={(e) => setTrendMonths(Number(e.target.value))}
              className="w-40"
            />
          </CardHeader>
          <CardBody>
            {trendLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : trend && trend.length > 0 ? (
              <IncomeExpenseChart data={trend} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                No trend data available
              </div>
            )}
          </CardBody>
        </Card>

        {/* Category breakdown + Budget utilization */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Category Breakdown</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  {getMonthName(selectedMonth)} {selectedYear}
                </p>
              </div>
              <Select
                options={[
                  { value: 'EXPENSE', label: 'Expenses' },
                  { value: 'INCOME', label: 'Income' },
                ]}
                value={breakdownType}
                onChange={(e) => setBreakdownType(e.target.value as 'INCOME' | 'EXPENSE')}
                className="w-28"
              />
            </CardHeader>
            <CardBody>
              {breakdownLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : breakdown ? (
                <CategoryPieChart data={breakdown} />
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              {budgetLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)
              ) : !budgetUtil || (budgetUtil as Array<unknown>).length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No budgets set for this month
                </div>
              ) : (
                (budgetUtil as Array<{
                  budgetId: string;
                  categoryName: string;
                  limit: string;
                  spent: string;
                  remaining: string;
                  utilizationPct: number;
                  isOverBudget: boolean;
                }>).map((b) => (
                  <div key={b.budgetId} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-medium">{b.categoryName}</span>
                      <span
                        className={
                          b.isOverBudget
                            ? 'text-red-400 font-semibold'
                            : b.utilizationPct >= 80
                            ? 'text-amber-400 font-semibold'
                            : 'text-gray-400'
                        }
                      >
                        {formatPercent(b.utilizationPct)}
                      </span>
                    </div>
                    <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.isOverBudget
                            ? 'bg-red-500'
                            : b.utilizationPct >= 80
                            ? 'bg-amber-400'
                            : 'bg-brand-500'
                        }`}
                        style={{ width: `${Math.min(100, b.utilizationPct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatCurrency(b.spent)} spent</span>
                      <span>of {formatCurrency(b.limit)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
