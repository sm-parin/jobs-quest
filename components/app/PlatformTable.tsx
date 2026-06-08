'use client';

import { useMemo, useState } from 'react';
import { ExternalLinkIcon, FileTextIcon, PencilIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import type { Platform } from '@/lib/types';
import { usePlatformStore } from '@/store/platformStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { WarningDialog } from '@/components/ui/WarningDialog';
import { ColumnFilter, type FilterOption } from '@/components/ui/ColumnFilter';
import { PlatformModal } from '@/components/app/PlatformModal';
import { cn } from '@/lib/utils';

type SortKey = 'name' | 'personal_rating' | 'jobs_tracked' | 'last_application_date';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StarDisplay({ rating }: { rating: number | null }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon key={s} className={cn('h-3.5 w-3.5', (rating ?? 0) >= s ? 'fill-brand-500 text-brand-500' : 'fill-none text-muted')} />
      ))}
    </div>
  );
}

const RATING_OPTIONS: FilterOption[] = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: '★'.repeat(n) }));

interface PlatformTableProps {
  platforms: Platform[];
  isLoading: boolean;
}

export function PlatformTable({ platforms, isLoading }: PlatformTableProps) {
  const { deletePlatform } = usePlatformStore();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [editTarget, setEditTarget] = useState<Platform | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Platform | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Column filters
  const [filterRatings, setFilterRatings] = useState<string[]>([]);
  const [filterStatusIds, setFilterStatusIds] = useState<string[]>([]);

  function setSort(key: SortKey, dir?: 'asc' | 'desc') {
    if (dir !== undefined) { setSortKey(key); setSortAsc(dir === 'asc'); }
    else if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === 'name'); }
  }

  const sorted = useMemo(() => {
    let result = [...platforms];
    // Apply filters
    if (filterRatings.length > 0) {
      result = result.filter((p) => p.personal_rating && filterRatings.includes(String(p.personal_rating)));
    }
    if (filterStatusIds.length > 0) {
      result = result.filter((p) => p.profile_status_id && filterStatusIds.includes(p.profile_status_id));
    }
    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'personal_rating') cmp = (a.personal_rating ?? 0) - (b.personal_rating ?? 0);
      else if (sortKey === 'jobs_tracked') cmp = (a.jobs_tracked ?? 0) - (b.jobs_tracked ?? 0);
      else if (sortKey === 'last_application_date') cmp = (a.last_application_date ?? '').localeCompare(b.last_application_date ?? '');
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [platforms, sortKey, sortAsc, filterRatings, filterStatusIds]);

  // Derive status options from data
  const statusOptions: FilterOption[] = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of platforms) {
      if (p.profile_status_id && p.profile_status) {
        seen.set(p.profile_status_id, p.profile_status.label);
      }
    }
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [platforms]);

  // filterHeader helper
  function filterHeader(
    key: SortKey,
    label: string,
    className: string,
    filterOptions?: FilterOption[],
    selectedValues?: string[],
    onFilterChange?: (vals: string[]) => void,
  ) {
    const dir = sortKey === key ? (sortAsc ? 'asc' as const : 'desc' as const) : null;
    return (
      <th scope="col" className={cn('group/th whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-text-muted', className)}>
        <span className="inline-flex items-center gap-0.5">
          <button type="button" onClick={() => setSort(key)} className="hover:text-text-primary transition-colors">
            {label}
          </button>
          <ColumnFilter
            label={label}
            sortDir={dir}
            onSortAsc={() => setSort(key, 'asc')}
            onSortDesc={() => setSort(key, 'desc')}
            options={filterOptions}
            selectedValues={selectedValues}
            onFilterChange={onFilterChange}
            isActive={(selectedValues?.length ?? 0) > 0 || sortKey === key}
          />
        </span>
      </th>
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deletePlatform(deleteTarget.id);
    setDeleting(false);
    if (result.ok) { toast.success('Platform deleted'); setDeleteTarget(null); }
    else toast.error(result.error ?? 'Failed to delete platform');
  }

  function handleDeleteClick(platform: Platform) {
    if ((platform.jobs_tracked ?? 0) > 0) {
      toast.error(`This platform has ${platform.jobs_tracked} linked job${platform.jobs_tracked === 1 ? '' : 's'}. Reassign them before deleting.`);
      return;
    }
    setDeleteTarget(platform);
  }

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (platforms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-app py-20 text-center">
        <p className="text-text-muted mb-4">No platforms added yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border-app">
        <table className="w-full text-sm">
          <thead className="border-b border-border-app bg-surface-muted">
            <tr>
              {filterHeader('name', 'Platform', 'min-w-[160px]')}
              <th scope="col" className="group/th px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                <span className="inline-flex items-center gap-0.5">
                  Profile Status
                  <ColumnFilter
                    label="Profile Status"
                    options={statusOptions}
                    selectedValues={filterStatusIds}
                    onFilterChange={setFilterStatusIds}
                    isActive={filterStatusIds.length > 0}
                  />
                </span>
              </th>
              <th scope="col" className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-muted md:table-cell">Subscription</th>
              <th scope="col" className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-muted lg:table-cell">Login Email</th>
              {filterHeader('personal_rating', 'Rating', '', RATING_OPTIONS, filterRatings, setFilterRatings)}
              {filterHeader('jobs_tracked', 'Jobs', 'text-right')}
              {filterHeader('last_application_date', 'Last Applied', 'hidden md:table-cell')}
              <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Resume</th>
              <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-app bg-surface">
            {sorted.map((p) => (
              <tr key={p.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">
                  <div className="flex items-center gap-2">
                    {p.name}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.name}`} className="text-text-muted hover:text-brand-500">
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.profile_status ? <Badge variant="secondary">{p.profile_status.label}</Badge> : <span className="text-text-muted">—</span>}
                </td>
                <td className="hidden px-4 py-3 text-text-muted md:table-cell">{p.subscription_type ?? '—'}</td>
                <td className="hidden max-w-[180px] px-4 py-3 lg:table-cell">
                  {p.login_email ? <span className="truncate block text-text-muted" title={p.login_email}>{p.login_email}</span> : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-4 py-3"><StarDisplay rating={p.personal_rating} /></td>
                <td className="px-4 py-3 text-right text-text-muted">{p.jobs_tracked ?? 0}</td>
                <td className="hidden px-4 py-3 text-text-muted md:table-cell">{formatDate(p.last_application_date)}</td>
                <td className="px-4 py-3">
                  {p.resume_path ? (
                    <button type="button" onClick={async () => {
                      const res = await fetch(`/api/platforms/${p.id}/resume`);
                      if (res.ok) { const { url } = await res.json() as { url: string }; window.open(url, '_blank'); }
                      else toast.error('Failed to load resume');
                    }} className="flex items-center gap-1 text-xs text-brand-500 hover:underline">
                      <FileTextIcon className="h-3.5 w-3.5" />View
                    </button>
                  ) : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => setEditTarget(p)}><PencilIcon className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(p)}><Trash2Icon className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PlatformModal open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)} platform={editTarget ?? undefined} />
      <WarningDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Delete Platform" description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" onConfirm={confirmDelete} isLoading={deleting} />
    </>
  );
}
