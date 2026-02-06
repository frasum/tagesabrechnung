import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function StatCard({ label, value, icon, variant = 'default', className }: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      }).format(val);
    }
    return val;
  };

  return (
    <div
      className={cn(
        "stat-card",
        variant === 'success' && "border-success/30 bg-success/5",
        variant === 'warning' && "border-warning/30 bg-warning/5",
        variant === 'error' && "border-destructive/30 bg-destructive/5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p
            className={cn(
              "text-2xl font-display font-semibold tabular-nums",
              variant === 'success' && "text-success",
              variant === 'warning' && "text-warning",
              variant === 'error' && "text-destructive"
            )}
          >
            {formatValue(value)}
          </p>
        </div>
        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              variant === 'default' && "bg-primary/10 text-primary",
              variant === 'success' && "bg-success/15 text-success",
              variant === 'warning' && "bg-warning/15 text-warning",
              variant === 'error' && "bg-destructive/15 text-destructive"
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
