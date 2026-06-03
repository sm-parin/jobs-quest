import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-muted', className)}
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-all duration-150"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
