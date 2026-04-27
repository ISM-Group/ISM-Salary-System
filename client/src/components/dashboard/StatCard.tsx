import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
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
  /** Stagger order for glass dashboard enter animation (0-based). */
  staggerIndex?: number;
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, staggerIndex = 0, className }: StatCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn('stat-card', className)}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 32,
        delay: reduceMotion ? 0 : staggerIndex * 0.06,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-400 sm:text-sm">{title}</p>
          <p className="break-words text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{value}</p>
          {description && (
            <p className="line-clamp-2 text-[10px] text-slate-600 dark:text-slate-400 sm:text-xs">{description}</p>
          )}
          {trend && (
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={cn(
                  'text-[10px] font-medium sm:text-xs',
                  trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 sm:text-xs">from last month</span>
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 sm:h-12 sm:w-12">
          <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 sm:h-6 sm:w-6" />
        </div>
      </div>
    </motion.div>
  );
}
