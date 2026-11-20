'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Transaction, TransactionFilters, PaginationMeta } from '@/types';

export function useTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.search) params.set('search', filters.search);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

  return useQuery<{ transactions: Transaction[]; meta: PaginationMeta }>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const res = await api.get(`/transactions?${params.toString()}`);
      return { transactions: res.data.data, meta: res.data.meta };
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useTransaction(id: string) {
  return useQuery<Transaction>({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const res = await api.get(`/transactions/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      amount: string;
      type: string;
      categoryId: string;
      description?: string;
      transactionDate: string;
    }) => {
      const res = await api.post('/transactions', data);
      return res.data.data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Transaction> & { id: string }) => {
      const res = await api.patch(`/transactions/${id}`, data);
      return res.data.data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
