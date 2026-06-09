'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Job, Reminder } from '@/lib/types';

export interface JobFilters {
  search: string;
  statusIds: string[];
  platformIds: string[];
  priorities: string[];
  workTypes: string[];
  reminder?: string | null;
}

const EMPTY_FILTERS: JobFilters = {
  search: '',
  statusIds: [],
  platformIds: [],
  priorities: [],
  workTypes: [],
};

function parseArrayParam(params: URLSearchParams, key: string): string[] {
  const val = params.get(key);
  if (!val) return [];
  return val.split(',').filter(Boolean);
}

export function useJobFilters(jobs: Job[], reminders: Reminder[] = []) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: JobFilters = useMemo(() => ({
    search: searchParams.get('q') ?? '',
    statusIds: parseArrayParam(searchParams, 'status'),
    platformIds: parseArrayParam(searchParams, 'platform'),
    priorities: parseArrayParam(searchParams, 'priority'),
    workTypes: parseArrayParam(searchParams, 'type'),
    reminder: searchParams.get('reminder'),
    // date filters removed
  }), [searchParams]);

  const hasActiveFilters = useMemo(() =>
    filters.search !== '' ||
    filters.statusIds.length > 0 ||
    filters.platformIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.workTypes.length > 0 ||
    !!filters.reminder,
    [filters],
  );

  const filteredJobs = useMemo(() => {
    let result = jobs;
    const q = filters.search.toLowerCase();
    if (q) {
      result = result.filter(
        (j) =>
          j.company.toLowerCase().includes(q) ||
          j.role.toLowerCase().includes(q),
      );
    }
    if (filters.statusIds.length > 0) {
      result = result.filter(
        (j) => j.status_id && filters.statusIds.includes(j.status_id),
      );
    }
    if (filters.platformIds.length > 0) {
      result = result.filter(
        (j) =>
          j.source_platform_id &&
          filters.platformIds.includes(j.source_platform_id),
      );
    }
    if (filters.priorities.length > 0) {
      result = result.filter((j) => filters.priorities.includes(j.priority));
    }
    if (filters.workTypes.length > 0) {
      result = result.filter((j) => j.work_type && filters.workTypes.includes(j.work_type));
    }
    // filter by reminder (e.g., 'today')
    if (filters.reminder === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      const jobIdsWithReminders = new Set(reminders.filter((r) => !r.is_done && r.remind_at === today).map((r) => r.job_id));
      result = result.filter((j) => jobIdsWithReminders.has(j.id));
    }
    return result;
  }, [jobs, filters]);

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('status');
    params.delete('platform');
    params.delete('priority');
    params.delete('type');
    params.delete('reminder');
    // date filters removed
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { filters, filteredJobs, hasActiveFilters, setFilter, clearFilters };
}
