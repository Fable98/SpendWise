'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingUp, LogIn, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

function LoginFormContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const { login, register: registerUser } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      await login.mutateAsync(data);
      toast('Welcome back!', 'success');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please try again.';
      toast(message, 'error');
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast('Account created! Welcome to SpendWise.', 'success');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.';
      toast(message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/40">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">SpendWise</span>
        </div>

        {/* Card */}
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-8 shadow-2xl">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-surface-700 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={cn(
                'flex-1 pb-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer',
                mode === 'login'
                  ? 'border-brand-500 text-brand-400 font-semibold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={cn(
                'flex-1 pb-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer',
                mode === 'register'
                  ? 'border-brand-500 text-brand-400 font-semibold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                <p className="text-gray-400 mt-1 text-sm">Sign in to your account</p>
              </div>

              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={loginForm.formState.errors.email?.message}
                  {...loginForm.register('email')}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={loginForm.formState.errors.password?.message}
                  {...loginForm.register('password')}
                />
                <Button
                  type="submit"
                  className="w-full mt-2"
                  size="lg"
                  isLoading={login.isPending}
                >
                  Sign In
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Create account</h1>
                <p className="text-gray-400 mt-1 text-sm">Start managing your finances</p>
              </div>

              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <Input
                  label="Full name"
                  placeholder="John Doe"
                  autoComplete="name"
                  error={registerForm.formState.errors.name?.message}
                  {...registerForm.register('name')}
                />
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={registerForm.formState.errors.email?.message}
                  {...registerForm.register('email')}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  error={registerForm.formState.errors.password?.message}
                  {...registerForm.register('password')}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={registerForm.formState.errors.confirmPassword?.message}
                  {...registerForm.register('confirmPassword')}
                />
                <Button
                  type="submit"
                  className="w-full mt-2"
                  size="lg"
                  isLoading={registerUser.isPending}
                >
                  Create Account
                </Button>
              </form>
            </>
          )}
        </div>

        {mode === 'login' ? (
          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('register')}
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
            >
              Create one
            </button>
          </p>
        ) : (
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-900" />}>
      <LoginFormContent />
    </Suspense>
  );
}
