'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SendIcon,
  LoaderIcon,
  TrophyIcon,
  BarChart2Icon,
  CalendarDaysIcon,
  BellIcon,
  ArchiveIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import { Skeleton } from '@/components/ui/Skeleton';
import type { StatsResponse } from '@/lib/types';

interface StatsBarProps {
  onArchivedClick?: () => void;
}

type LoadState = 'loading' | 'loaded' | 'error';

function StatCard({
  icon: Icon,
  value,
  label,
  subtext,
  highlight,
  badge,
  onClick,
  className,
}: {
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  subtext?: string;
  highlight?: boolean;
  badge?: number;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={cn(
        'relative flex min-w-[140px] flex-shrink-0 flex-col gap-2 rounded-md border border-border-app bg-surface p-4 transition-shadow',
        onClick && 'cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      <div className="relative w-fit">
        <Icon className="h-5 w-5 text-text-muted" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <div>
        <p
          className={cn(
            'text-2xl font-bold text-text-primary leading-none',
            highlight && 'text-brand-500',
          )}
        >
          {value}
        </p>
        {subtext && <p className="mt-0.5 text-xs text-text-muted">{subtext}</p>}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex min-w-[140px] flex-shrink-0 flex-col gap-2 rounded-md border border-border-app bg-surface p-4">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-7 w-12" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function StatsBar({ onArchivedClick }: StatsBarProps) {
  const lastMutatedAt = useJobStore((s) => s.lastMutatedAt);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      if (!isFirstLoad.current) setRefreshing(true);

      try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('fetch failed');
        const body = await res.json();
        if (!cancelled) {
          setStats(body.data);
          setLoadState('loaded');
        }
      } catch {
        if (!cancelled && isFirstLoad.current) setLoadState('error');
      } finally {
        if (!cancelled) {
          setRefreshing(false);
          isFirstLoad.current = false;
        }
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMutatedAt]);

  if (loadState === 'error') {
    return (
      <p className="text-xs text-text-muted py-2">Stats unavailable</p>
    );
  }

  if (loadState === 'loading') {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const s = stats!;

  let rateSubtext: string | undefined;
  if (s.response_rate !== null) {
    if (s.response_rate >= 50) rateSubtext = 'Above average';
    else if (s.response_rate >= 20) rateSubtext = 'Keep going';
    else rateSubtext = 'Room to grow';
  }

  return (
    <div className="relative">
      {refreshing && (
        <RefreshCwIcon className="absolute right-0 top-0 h-3.5 w-3.5 animate-spin text-text-muted" />
      )}
      <div className="flex gap-3 overflow-x-auto pb-1 lg:overflow-x-hidden">
        <StatCard icon={SendIcon} value={s.total_applied} label="Applications" />
        <StatCard icon={LoaderIcon} value={s.in_progress} label="In Progress" />
        <StatCard
          icon={TrophyIcon}
          value={s.offers}
          label="Offers"
          highlight={s.offers > 0}
        />
        <StatCard
          icon={BarChart2Icon}
          value={s.response_rate !== null ? `${s.response_rate}%` : '—'}
          label="Response Rate"
          subtext={rateSubtext}
        />
        <StatCard icon={CalendarDaysIcon} value={s.applied_this_week} label="Applied This Week" />
        <StatCard
          icon={BellIcon}
          value={s.total_active_reminders}
          label="Upcoming"
          badge={s.overdue_reminders}
        />
        <StatCard
          icon={ArchiveIcon}
          value={s.archived_count}
          label="Archived"
          onClick={onArchivedClick}
        />
      </div>
    </div>
  );
}
