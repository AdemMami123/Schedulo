'use client';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

export function Switch({ checked, onChange, className, children }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600',
        className
      )}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
      {children}
    </button>
  );
}
