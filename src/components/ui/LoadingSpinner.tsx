interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6 sm:h-8 sm:w-8',
    lg: 'h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`spinner-modern ${sizeClasses[size]}`}></div>
    </div>
  );
}
