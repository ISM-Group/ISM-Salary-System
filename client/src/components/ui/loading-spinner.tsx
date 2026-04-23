import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional additional CSS classes */
  className?: string;
  /** Text to display below the spinner */
  text?: string;
}

/**
 * Animated loading spinner component for indicating async operations.
 * Supports multiple sizes and optional loading text.
 */
// PUBLIC_INTERFACE
export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-primary/30 border-t-primary',
          sizeClasses[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

/**
 * Full-page loading state component with centered spinner.
 * Used as a page-level loading indicator.
 */
// PUBLIC_INTERFACE
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

/**
 * Error state component displayed when data fetching fails.
 * Shows an error message with an optional retry button.
 */
// PUBLIC_INTERFACE
export function PageError({
  message = 'Failed to load data',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-destructive/10 p-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
