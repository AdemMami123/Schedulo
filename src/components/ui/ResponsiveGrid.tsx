'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveGridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: {
    mobile?: 1 | 2 | 3 | 4 | 5 | 6;
    tablet?: 1 | 2 | 3 | 4 | 5 | 6;
    desktop?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  gap?: 'tight' | 'normal' | 'loose';
}

const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ 
    className, 
    columns = { mobile: 1, tablet: 2, desktop: 3 }, 
    gap = 'normal', 
    children, 
    ...props 
  }, ref) => {
    const { mobile = 1, tablet = 2, desktop = 3 } = columns;
    
    const gridCols: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    };

    const gaps = {
      tight: 'gap-3 sm:gap-4',
      normal: 'gap-4 sm:gap-6',
      loose: 'gap-6 sm:gap-8',
    };

    const responsiveClasses = cn(
      'grid',
      gridCols[mobile],
      tablet && `sm:${gridCols[tablet]}`,
      desktop && `lg:${gridCols[desktop]}`,
      gaps[gap]
    );

    return (
      <div
        ref={ref}
        className={cn(responsiveClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveGrid.displayName = 'ResponsiveGrid';

export { ResponsiveGrid };
