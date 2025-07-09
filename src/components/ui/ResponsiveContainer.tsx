'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveContainerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'page' | 'section' | 'card' | 'form';
  spacing?: 'tight' | 'normal' | 'loose';
}

const ResponsiveContainer = forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ className, variant = 'section', spacing = 'normal', children, ...props }, ref) => {
    const variants = {
      page: 'min-h-screen p-4 sm:p-6 lg:p-8',
      section: 'p-4 sm:p-6',
      card: 'p-3 sm:p-4 lg:p-6',
      form: 'p-4 sm:p-6 max-w-2xl mx-auto',
    };

    const spacings = {
      tight: 'space-y-3 sm:space-y-4',
      normal: 'space-y-4 sm:space-y-6',
      loose: 'space-y-6 sm:space-y-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          spacings[spacing],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveContainer.displayName = 'ResponsiveContainer';

export { ResponsiveContainer };
