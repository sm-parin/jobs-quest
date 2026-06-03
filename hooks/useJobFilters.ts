'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Job } from '@/lib/types';

export interface JobFilters {
  search: string;
  statusIds: string[];
  platformIds: string[];
  priorities: string[];
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: JobFilters = {
  search: '',
  statusIds: [],
  platformIds: [],
  priorities: [],
  dateFrom: '',
  dateTo: '',
};

function parseArrayParam(params: URLSearchParams, key: string): string[] {
  const val = params.get(key);
  if (!val) return [];
  return val.split(',').filter(Boolean);
}

export function useJobFilters(jobs: Job[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: JobFilters = useMemo(() => ({
    search: searchParams.get('q') ?? '',
    statusIds: parseArrayParam(searchParams, 'status'),
    platformIds: parseArrayParam(searchParams, 'platform'),
    priorities: parseArrayParam(searchParams, 'priority'),
    dateFrom: searchParams.get('from') ?? '',
    dateTo: searchParams.get('to') ?? '',
  }), [searchParams]);

  const hasActiveFilters = useMemo(() =>
    filters.search !== '' ||
    filters.statusIds.length > 0 ||
    filters.platformIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '',
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
    if (filters.dateFrom) {
      result = result.filter(
        (j) => j.stage_date && j.stage_date >= filters.dateFrom,
      );
    }
    if (filters.dateTo) {
      result = result.filter(
        (j) => j.stage_date && j.stage_date <= filters.dateTo,
      );
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
    params.delete('from');
    params.delete('to');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { filters, filteredJobs, hasActiveFilters, setFilter, clearFilters };
}
