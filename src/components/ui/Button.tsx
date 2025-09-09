'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseClasses = 'btn-modern inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md tap-highlight-none touch-target';
    
    const variants = {
      primary: 'gradient-primary text-white hover:shadow-indigo-500/25 focus:ring-indigo-500',
      secondary: 'gradient-secondary text-white hover:shadow-blue-500/25 focus:ring-blue-500',
      outline: 'border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-indigo-500',
      ghost: 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-500',
      destructive: 'gradient-accent text-white hover:shadow-red-500/25 focus:ring-red-500',
    };

    const sizes = {
      sm: 'px-3 sm:px-4 py-2 text-sm min-h-[38px]',
      md: 'px-4 sm:px-6 py-2.5 sm:py-3 text-sm min-h-[44px]',
      lg: 'px-6 sm:px-8 py-3 sm:py-4 text-base min-h-[48px]',
    };

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && <LoadingSpinner size="sm" className="mr-2" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
