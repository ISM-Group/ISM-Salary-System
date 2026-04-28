import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

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
      <div className="relative" role="status" aria-label="Loading">
        <div className={cn('animate-spin rounded-full border-accent/25 border-t-accent', sizeClasses[size])} />
        <div className="absolute inset-1 rounded-full border border-primary/10" />
      </div>
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
    <div className="content-enter flex min-h-[400px] items-center justify-center">
      <div className="glass-panel flex w-full max-w-sm flex-col items-center gap-5 p-8 text-center">
        <div className="grid w-full gap-3">
          <div className="skeleton mx-auto h-3 w-28" />
          <div className="skeleton h-16 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </div>
        </div>
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}

export function TableLoadingRows({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="p-4">
              <div className={cn('skeleton h-4', columnIndex === 0 ? 'w-28' : 'w-full')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SummaryCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="content-enter grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass-panel p-4">
          <SkeletonBlock className="mb-3 h-3 w-24" />
          <SkeletonBlock className="h-7 w-16" />
          <SkeletonBlock className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function FormCardSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="glass-panel content-enter p-4 sm:p-6">
      <SkeletonBlock className="mb-5 h-5 w-40" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="mt-5 h-10 w-32" />
    </div>
  );
}

export function TableCardSkeleton({
  rows = 6,
  columns = 5,
  titleWidth = 'w-36',
}: {
  rows?: number;
  columns?: number;
  titleWidth?: string;
}) {
  return (
    <div className="glass-panel content-enter overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-4 sm:px-6">
        <SkeletonBlock className={cn('h-5', titleWidth)} />
        <SkeletonBlock className="h-9 w-28" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            <TableLoadingRows rows={rows} columns={columns} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PageSkeleton({
  variant = 'table',
}: {
  variant?: 'dashboard' | 'form' | 'table' | 'form-table';
}) {
  if (variant === 'dashboard') {
    return (
      <div className="content-enter space-y-6">
        <SummaryCardsSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <TableCardSkeleton rows={5} columns={3} />
          <TableCardSkeleton rows={5} columns={3} />
        </div>
        <TableCardSkeleton rows={6} columns={4} />
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className="content-enter space-y-6">
        <FormCardSkeleton fields={8} />
      </div>
    );
  }

  if (variant === 'form-table') {
    return (
      <div className="content-enter space-y-6">
        <FormCardSkeleton />
        <SummaryCardsSkeleton />
        <TableCardSkeleton />
      </div>
    );
  }

  return (
    <div className="content-enter space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <SkeletonBlock className="h-10 w-full sm:w-64" />
          <SkeletonBlock className="h-10 w-full sm:w-32" />
          <SkeletonBlock className="h-10 w-full sm:w-28" />
        </div>
        <SkeletonBlock className="h-10 w-full sm:w-32" />
      </div>
      <TableCardSkeleton />
    </div>
  );
}

export function SectionLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="content-enter grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-14 w-full" />
      ))}
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
        <AlertCircle className="h-6 w-6 text-destructive" />
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
