'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { IntegrationToken, CategoryRule } from '@/types';

export function useIntegrationTokens() {
  return useQuery<IntegrationToken[]>({
    queryKey: ['integrations', 'tokens'],
    queryFn: async () => {
      const res = await api.get('/integrations/tokens');
      return res.data.data;
    },
  });
}

export function useCreateIntegrationToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await api.post('/integrations/tokens', data);
      return res.data.data as IntegrationToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'tokens'] });
    },
  });
}

export function useRevokeIntegrationToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/integrations/tokens/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'tokens'] });
    },
  });
}

export function useCategoryRules() {
  return useQuery<CategoryRule[]>({
    queryKey: ['integrations', 'rules'],
    queryFn: async () => {
      const res = await api.get('/integrations/rules');
      return res.data.data;
    },
  });
}

export function useCreateCategoryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { categoryId: string; keyword: string; priority?: number }) => {
      const res = await api.post('/integrations/rules', data);
      return res.data.data as CategoryRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'rules'] });
    },
  });
}

export function useDeleteCategoryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/integrations/rules/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'rules'] });
    },
  });
}
