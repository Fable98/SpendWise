'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardSummary, MonthlyTrendItem, CategoryBreakdownItem } from '@/types';

export function useDashboardSummary(year: number, month: number) {
  return useQuery<DashboardSummary>({
    queryKey: ['analytics', 'dashboard', { year, month }],
    queryFn: async () => {
      const res = await api.get(`/analytics/dashboard?year=${year}&month=${month}`);
      return res.data.data;
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useMonthlyTrend(months = 6) {
  return useQuery<MonthlyTrendItem[]>({
    queryKey: ['analytics', 'monthly-trend', months],
    queryFn: async () => {
      const res = await api.get(`/analytics/monthly-trend?months=${months}`);
      return res.data.data;
    },
  });
}

export function useCategoryBreakdown(year: number, month: number, type: 'INCOME' | 'EXPENSE' = 'EXPENSE') {
  return useQuery<CategoryBreakdownItem[]>({
    queryKey: ['analytics', 'category-breakdown', { year, month, type }],
    queryFn: async () => {
      const res = await api.get(`/analytics/category-breakdown?year=${year}&month=${month}&type=${type}`);
      return res.data.data;
    },
  });
}

export function useBudgetUtilization(year: number, month: number) {
  return useQuery({
    queryKey: ['analytics', 'budget-utilization', { year, month }],
    queryFn: async () => {
      const res = await api.get(`/analytics/budget-utilization?year=${year}&month=${month}`);
      return res.data.data;
    },
  });
}
