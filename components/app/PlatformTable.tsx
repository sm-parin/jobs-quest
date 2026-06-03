'use client';

import { useState } from 'react';
import { ArrowUpDownIcon, ExternalLinkIcon, PencilIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import type { Platform } from '@/lib/types';
import { usePlatformStore } from '@/store/platformStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { WarningDialog } from '@/components/ui/WarningDialog';
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

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === 'name'); }
  }

  const sorted = [...platforms].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'personal_rating') cmp = (a.personal_rating ?? 0) - (b.personal_rating ?? 0);
    else if (sortKey === 'jobs_tracked') cmp = (a.jobs_tracked ?? 0) - (b.jobs_tracked ?? 0);
    else if (sortKey === 'last_application_date') cmp = (a.last_application_date ?? '').localeCompare(b.last_application_date ?? '');
    return sortAsc ? cmp : -cmp;
  });

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

  function SortButton({ label, sortBy }: { label: string; sortBy: SortKey }) {
    return (
      <button type="button" onClick={() => toggleSort(sortBy)} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary">
        {label}
        <ArrowUpDownIcon className={cn('h-3 w-3', sortKey === sortBy && 'text-brand-500')} />
      </button>
    );
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
              <th className="px-4 py-2.5 text-left"><SortButton label="Platform" sortBy="name" /></th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Profile Status</th>
              <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-muted md:table-cell">Subscription</th>
              <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-muted lg:table-cell">Login Email</th>
              <th className="px-4 py-2.5 text-left"><SortButton label="Rating" sortBy="personal_rating" /></th>
              <th className="px-4 py-2.5 text-right"><SortButton label="Jobs" sortBy="jobs_tracked" /></th>
              <th className="hidden px-4 py-2.5 text-left md:table-cell"><SortButton label="Last Applied" sortBy="last_application_date" /></th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-text-muted">Actions</th>
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
