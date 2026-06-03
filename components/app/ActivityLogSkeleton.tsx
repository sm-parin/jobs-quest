import { Skeleton } from '@/components/ui/Skeleton';

export function ActivityLogSkeleton() {
  return (
    <div className="mt-3 space-y-0">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" />
            {i < 2 && <div className="mt-1 w-px flex-1 bg-border-app" />}
          </div>
          <div className="flex-1 space-y-1.5 pb-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
