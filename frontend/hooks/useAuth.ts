'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/types';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post('/auth/login', data);
      return res.data.data as User;
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(['auth', 'me'], userData);
      router.push('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const res = await api.post('/auth/register', data);
      return res.data.data as User;
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(['auth', 'me'], userData);
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
