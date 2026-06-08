'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Job } from '@/lib/types';

export type SortKey =
  | 'company'
  | 'role'
  | 'status'
  | 'platform'
  | 'work_type'
  | 'stage_date'
  | 'priority'
  | 'updated_at';

export type SortDir = 'asc' | 'desc';

export interface CurrentSort {
  key: SortKey | null;
  dir: SortDir;
}

const PRIORITY_ORDER: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export function useJobSort(jobs: Job[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentSort: CurrentSort = useMemo(() => ({
    key: (searchParams.get('sort') as SortKey | null) ?? null,
    dir: (searchParams.get('dir') as SortDir) ?? 'asc',
  }), [searchParams]);

  const sortedJobs = useMemo(() => {
    if (!currentSort.key) return jobs;
    const { key, dir } = currentSort;
    const multiplier = dir === 'asc' ? 1 : -1;

    return [...jobs].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (key) {
        case 'company':
          aVal = a.company.toLowerCase();
          bVal = b.company.toLowerCase();
          break;
        case 'role':
          aVal = a.role.toLowerCase();
          bVal = b.role.toLowerCase();
          break;
        case 'status':
          aVal = (a.status?.label ?? '').toLowerCase();
          bVal = (b.status?.label ?? '').toLowerCase();
          break;
        case 'platform':
          aVal = (a.platform?.name ?? '').toLowerCase();
          bVal = (b.platform?.name ?? '').toLowerCase();
          break;
        case 'work_type':
          aVal = (a.work_type ?? '').toLowerCase();
          bVal = (b.work_type ?? '').toLowerCase();
          break;
        case 'stage_date':
          aVal = a.stage_date ?? '';
          bVal = b.stage_date ?? '';
          break;
        case 'priority':
          aVal = PRIORITY_ORDER[a.priority] ?? 99;
          bVal = PRIORITY_ORDER[b.priority] ?? 99;
          break;
        case 'updated_at':
          aVal = a.updated_at;
          bVal = b.updated_at;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
      return 0;
    });
  }, [jobs, currentSort]);

  function setSort(key: SortKey, forcedDir?: SortDir) {
    const params = new URLSearchParams(searchParams.toString());
    if (forcedDir !== undefined) {
      params.set('sort', key);
      params.set('dir', forcedDir);
    } else if (currentSort.key === key) {
      if (currentSort.dir === 'asc') {
        params.set('sort', key);
        params.set('dir', 'desc');
      } else {
        params.delete('sort');
        params.delete('dir');
      }
    } else {
      params.set('sort', key);
      params.set('dir', 'asc');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { sortedJobs, currentSort, setSort };
}
