'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function JobTableSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border-app bg-surface">
      <div className="flex items-center gap-3 border-b border-border-app bg-surface-muted px-4 py-3">
        <div className="w-10 shrink-0" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32 flex-1" />
        <Skeleton className="h-4 w-[140px] shrink-0" />
        <Skeleton className="h-4 w-[120px] shrink-0" />
        <Skeleton className="h-4 w-[140px] shrink-0" />
        <Skeleton className="h-4 w-[120px] shrink-0" />
        <div className="w-12 shrink-0" />
        <div className="w-24 shrink-0" />
      </div>

      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border-app px-4 py-3 last:border-0"
        >
          <div className="w-10 shrink-0 flex justify-center">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-[110px] shrink-0 rounded-full" />
          <Skeleton className="h-4 w-[90px] shrink-0" />
          <Skeleton className="h-4 w-[110px] shrink-0" />
          <Skeleton className="h-4 w-[80px] shrink-0" />
          <div className="w-12 shrink-0 flex justify-center">
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="w-24 shrink-0 flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
