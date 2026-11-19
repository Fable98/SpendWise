import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'income' | 'expense' | 'neutral' | 'warning' | 'success' | 'danger';
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  const variants = {
    income: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    expense: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
    neutral: 'bg-surface-600 text-gray-300 ring-1 ring-surface-500',
    warning: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    danger: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
