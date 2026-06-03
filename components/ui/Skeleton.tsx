import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Skeleton — matches the shape of real content; never a generic spinner.
// Usage:  <Skeleton className="h-4 w-32" />
//         <Skeleton variant="avatar" />
// ---------------------------------------------------------------------------

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'avatar' | 'badge';
}

export function Skeleton({ className, variant = 'default' }: SkeletonProps) {
  const variantClass =
    variant === 'avatar'
      ? 'h-10 w-10 rounded-full'
      : variant === 'badge'
        ? 'h-5 w-20 rounded-md'
        : 'h-4 w-full rounded-md';

  return (
    <div
      className={cn('animate-pulse bg-muted', variantClass, className)}
      aria-hidden="true"
    />
  );
}
