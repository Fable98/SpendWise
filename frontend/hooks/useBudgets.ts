'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Budget } from '@/types';

export function useBudgets(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));

  return useQuery<Budget[]>({
    queryKey: ['budgets', { year, month }],
    queryFn: async () => {
      const res = await api.get(`/budgets?${params.toString()}`);
      return res.data.data;
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      categoryId: string;
      amount: string;
      month: number;
      year: number;
    }) => {
      const res = await api.post('/budgets', data);
      return res.data.data as Budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; amount?: string; month?: number; year?: number }) => {
      const res = await api.patch(`/budgets/${id}`, data);
      return res.data.data as Budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/budgets/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
