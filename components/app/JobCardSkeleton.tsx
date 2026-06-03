import { Skeleton } from '@/components/ui/Skeleton';

export function JobCardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading job applications">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border-app bg-surface p-4 mb-3"
          aria-hidden="true"
        >
          {/* Top row: priority dot + company + menu */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-surface-muted" />
              <Skeleton className="h-4 w-28 bg-surface-muted" />
            </div>
            <Skeleton className="h-7 w-7 rounded-md bg-surface-muted" />
          </div>
          {/* Role */}
          <Skeleton className="h-3 w-40 mb-3 bg-surface-muted" />
          {/* Status badge + platform */}
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-20 rounded-full bg-surface-muted" />
            <Skeleton className="h-5 w-16 rounded-full bg-surface-muted" />
          </div>
          {/* Bottom: stage date + salary */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24 bg-surface-muted" />
            <Skeleton className="h-3 w-16 bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
