'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { useDashboardSummary, useMonthlyTrend, useCategoryBreakdown } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate, getCurrentMonth, getMonthName } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { month, year } = getCurrentMonth();
  const [selectedYear] = useState(year);
  const [selectedMonth] = useState(month);

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(selectedYear, selectedMonth);
  const { data: trend, isLoading: trendLoading } = useMonthlyTrend(6);
  const { data: breakdown, isLoading: breakdownLoading } = useCategoryBreakdown(selectedYear, selectedMonth);

  const summaryCards = summary
    ? [
        {
          label: 'Total Balance',
          value: formatCurrency(summary.balance),
          icon: Wallet,
          positive: parseFloat(summary.balance) >= 0,
          color: 'brand',
          sub: 'All time',
        },
        {
          label: 'Total Income',
          value: formatCurrency(summary.totalIncome),
          icon: TrendingUp,
          positive: true,
          color: 'green',
          sub: 'All time',
        },
        {
          label: 'Total Expenses',
          value: formatCurrency(summary.totalExpenses),
          icon: TrendingDown,
          positive: false,
          color: 'red',
          sub: 'All time',
        },
        {
          label: 'Monthly Savings',
          value: formatCurrency(summary.monthlySavings),
          icon: PiggyBank,
          positive: parseFloat(summary.monthlySavings) >= 0,
          color: 'purple',
          sub: `${getMonthName(selectedMonth)} ${selectedYear}`,
        },
      ]
    : [];

  const colorMap = {
    brand: { bg: 'bg-brand-500/10', icon: 'text-brand-400', border: 'border-brand-500/20' },
    green: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
    red: { bg: 'bg-red-500/10', icon: 'text-red-400', border: 'border-red-500/20' },
    purple: { bg: 'bg-violet-500/10', icon: 'text-violet-400', border: 'border-violet-500/20' },
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {getGreeting()},{' '}
            <span className="text-brand-400">{user?.name?.split(' ')[0] ?? 'there'}</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            {getMonthName(selectedMonth)} {selectedYear} overview
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryLoading
            ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : summaryCards.map((card) => {
                const c = colorMap[card.color as keyof typeof colorMap];
                const Icon = card.icon;
                return (
                  <Card key={card.label} variant="elevated" className={`border ${c.border}`}>
                    <CardBody className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {card.label}
                          </p>
                          <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                          <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${c.icon}`} />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Income vs Expenses trend */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Income vs Expenses</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
            </CardHeader>
            <CardBody>
              {trendLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : trend && trend.length > 0 ? (
                <IncomeExpenseChart data={trend} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                  No data yet — add some transactions!
                </div>
              )}
            </CardBody>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </CardHeader>
            <CardBody>
              {breakdownLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : breakdown ? (
                <CategoryPieChart data={breakdown} />
              ) : null}
            </CardBody>
          </Card>
        </div>

        {/* Recent transactions */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Your latest activity</p>
            </div>
            <a
              href="/transactions"
              className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              View all →
            </a>
          </CardHeader>
          <CardBody className="p-0">
            {summaryLoading ? (
              <div className="p-6 space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-2 w-1/4" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : summary?.recentTransactions && summary.recentTransactions.length > 0 ? (
              <div className="divide-y divide-surface-700">
                {summary.recentTransactions.slice(0, 8).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 px-6 py-3.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'INCOME'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {tx.type === 'INCOME' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {tx.description || tx.category?.name || 'Transaction'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tx.category?.name} · {formatDate(tx.transactionDate)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-sm font-semibold ${
                          tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-700 flex items-center justify-center mb-3">
                  <Wallet className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-gray-400 font-medium">No transactions yet</p>
                <p className="text-gray-600 text-sm mt-1">
                  Add your first transaction to get started
                </p>
                <a
                  href="/transactions"
                  className="mt-4 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  Add transaction →
                </a>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
