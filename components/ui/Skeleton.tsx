import { cn } from '@/lib/utils';

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
