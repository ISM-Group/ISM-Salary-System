import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('stat-card animate-slide-up', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground break-words">{value}</p>
          {description && (
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 flex-wrap">
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">from last month</span>
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
        </div>
      </div>
    </div>
  );
}
