import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-brand-600 hover:bg-brand-500 text-white focus:ring-brand-500 shadow-lg shadow-brand-900/25',
    secondary:
      'bg-surface-600 hover:bg-surface-500 text-white focus:ring-surface-500',
    ghost:
      'bg-transparent hover:bg-surface-700 text-gray-300 hover:text-white focus:ring-surface-500',
    danger:
      'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500 shadow-lg shadow-red-900/25',
    outline:
      'border border-surface-600 hover:border-brand-500 text-gray-300 hover:text-white bg-transparent focus:ring-brand-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
    </button>
  );
}
