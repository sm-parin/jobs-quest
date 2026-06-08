'use client';

import { useEffect, useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusOptionRow } from '@/components/app/StatusOptionRow';
import { ColorPicker } from '@/components/app/ColorPicker';
import { WarningDialog } from '@/components/ui/WarningDialog';
import type { Status, PlatformStatusOption } from '@/lib/types';

interface StatusListProps<T extends { id: string; label: string; order: number; color?: string; is_system?: boolean }> {
  items: T[];
  showColor: boolean;
  onAdd: (label: string, color?: string) => Promise<void>;
  onEdit: (id: string, label: string, color?: string) => Promise<void>;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}

function StatusList<T extends { id: string; label: string; order: number; color?: string; is_system?: boolean }>({
  items, showColor, onAdd, onEdit, onDelete, onReorder,
}: StatusListProps<T>) {
  const [addLabel, setAddLabel] = useState('');
  const [addColor, setAddColor] = useState('#94a3b8');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, oldIdx, newIdx).map((i) => i.id));
  }

  async function handleAdd() {
    if (!addLabel.trim()) return;
    setAdding(true);
    await onAdd(addLabel.trim(), showColor ? addColor : undefined);
    setAdding(false);
    setAddLabel('');
    setAddColor('#94a3b8');
    setShowAddForm(false);
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[swapIdx]] = [reordered[swapIdx], reordered[index]];
    onReorder(reordered.map((i) => i.id));
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, idx) => (
            <StatusOptionRow key={item.id} item={item} showColor={showColor} onEdit={onEdit} onDelete={onDelete}
              onMoveUp={() => moveItem(idx, 'up')} onMoveDown={() => moveItem(idx, 'down')}
              isFirst={idx === 0} isLast={idx === items.length - 1} />
          ))}
        </SortableContext>
      </DndContext>
      {showAddForm && (
        <div className="rounded-md border border-border-app bg-surface p-3 space-y-2">
          <Input value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder="Status name" aria-label="New status label"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddForm(false); }} autoFocus />
          {showColor && <ColorPicker value={addColor} onChange={setAddColor} />}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={adding || !addLabel.trim()}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {!showAddForm && (
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <PlusIcon className="mr-1 h-3.5 w-3.5" />Add Status
        </Button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [jobStatuses, setJobStatuses] = useState<Status[]>([]);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatusOption[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'job' | 'platform'; label: string; count?: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [defaultEmail, setDefaultEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    fetch('/api/statuses').then((r) => r.json()).then(({ data }) => setJobStatuses(data ?? []));
    fetch('/api/platform-status-options').then((r) => r.json()).then(({ data }) => setPlatformStatuses(data ?? []));
    setDefaultEmail(localStorage.getItem('jq_default_email') ?? '');
  }, []);

  const addJobStatus = useCallback(async (label: string, color?: string) => {
    const res = await fetch('/api/statuses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, color: color ?? '#94a3b8', order: jobStatuses.length }) });
    if (!res.ok) { toast.error('Failed to add status'); return; }
    const { data } = await res.json();
    setJobStatuses((prev) => [...prev, data]);
    toast.success('Status added');
  }, [jobStatuses.length]);

  const editJobStatus = useCallback(async (id: string, label: string, color?: string) => {
    const res = await fetch(`/api/statuses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, color }) });
    if (!res.ok) { toast.error('Failed to update status'); return; }
    const { data } = await res.json();
    setJobStatuses((prev) => prev.map((s) => (s.id === id ? data : s)));
    toast.success('Status updated');
  }, []);

  const reorderJobStatuses = useCallback(async (ids: string[]) => {
    const reordered = ids.map((id, idx) => ({ ...jobStatuses.find((s) => s.id === id)!, order: idx }));
    setJobStatuses(reordered);
    await Promise.all(reordered.map((s) => fetch(`/api/statuses/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: s.order }) })));
  }, [jobStatuses]);

  const deleteJobStatus = useCallback((id: string) => {
    const item = jobStatuses.find((s) => s.id === id);
    if (item) setDeleteTarget({ id, type: 'job', label: item.label });
  }, [jobStatuses]);

  const addPlatformStatus = useCallback(async (label: string) => {
    const res = await fetch('/api/platform-status-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, order: platformStatuses.length }) });
    if (!res.ok) { toast.error('Failed to add status'); return; }
    const { data } = await res.json();
    setPlatformStatuses((prev) => [...prev, data]);
    toast.success('Status added');
  }, [platformStatuses.length]);

  const editPlatformStatus = useCallback(async (id: string, label: string) => {
    const res = await fetch(`/api/platform-status-options/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
    if (!res.ok) { toast.error('Failed to update status'); return; }
    const { data } = await res.json();
    setPlatformStatuses((prev) => prev.map((s) => (s.id === id ? data : s)));
    toast.success('Status updated');
  }, []);

  const reorderPlatformStatuses = useCallback(async (ids: string[]) => {
    const reordered = ids.map((id, idx) => ({ ...platformStatuses.find((s) => s.id === id)!, order: idx }));
    setPlatformStatuses(reordered);
    await Promise.all(reordered.map((s) => fetch(`/api/platform-status-options/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: s.order }) })));
  }, [platformStatuses]);

  const deletePlatformStatus = useCallback((id: string) => {
    const item = platformStatuses.find((s) => s.id === id);
    if (item) setDeleteTarget({ id, type: 'platform', label: item.label });
  }, [platformStatuses]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const url = deleteTarget.type === 'job' ? `/api/statuses/${deleteTarget.id}` : `/api/platform-status-options/${deleteTarget.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.status === 204) {
      if (deleteTarget.type === 'job') setJobStatuses((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      else setPlatformStatuses((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success('Status deleted');
      setDeleteTarget(null);
    } else {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? 'Failed to delete status');
      if (body.count) setDeleteTarget((prev) => prev ? { ...prev, count: body.count } : null);
      else setDeleteTarget(null);
    }
    setDeleting(false);
  }

  const warningDescription = deleteTarget?.count
    ? `${deleteTarget.count} ${deleteTarget.type === 'job' ? 'job' : 'platform'}${deleteTarget.count === 1 ? '' : 's'} use "${deleteTarget.label}". Reassign them before deleting.`
    : `Are you sure you want to delete "${deleteTarget?.label}"? This cannot be undone.`;

  function saveDefaultEmail() {
    setSavingEmail(true);
    localStorage.setItem('jq_default_email', defaultEmail);
    toast.success('Saved');
    setSavingEmail(false);
  }

  const [seedingReferral, setSeedingReferral] = useState(false);
  async function seedReferralStatuses() {
    const REFERRAL_STATUSES = [
      { label: 'Referral Requested', color: '#a78bfa' },
      { label: 'Referred', color: '#818cf8' },
      { label: 'Referral Accepted', color: '#34d399' },
      { label: 'Referral Declined', color: '#f87171' },
    ];
    setSeedingReferral(true);
    let added = 0;
    for (const s of REFERRAL_STATUSES) {
      const res = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: s.label, color: s.color, order: jobStatuses.length + added }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setJobStatuses((prev) => [...prev, data]);
        added++;
      }
    }
    setSeedingReferral(false);
    if (added > 0) toast.success(`Added ${added} referral status${added === 1 ? '' : 'es'}`);
    else toast.error('No statuses added');
  }

  return (
    <section aria-labelledby="settings-heading">
      <h1 id="settings-heading" className="mb-6 text-2xl font-semibold text-text-primary">Settings</h1>
      <Tabs defaultValue="job-statuses">
        <TabsList className="mb-6">
          <TabsTrigger value="job-statuses">Job Statuses</TabsTrigger>
          <TabsTrigger value="platform-statuses">Platform Statuses</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="job-statuses">
          <p className="mb-4 text-sm text-text-muted">Manage the statuses that appear in your job pipeline. Drag to reorder.</p>
          <StatusList items={jobStatuses} showColor onAdd={addJobStatus} onEdit={editJobStatus} onDelete={deleteJobStatus} onReorder={reorderJobStatuses} />
          <div className="mt-6 flex items-center gap-3 rounded-md border border-dashed border-border-app p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">Referral Statuses</p>
              <p className="text-xs text-text-muted">Add preset statuses for tracking referral progress.</p>
            </div>
            <Button variant="outline" size="sm" onClick={seedReferralStatuses} disabled={seedingReferral}>
              {seedingReferral ? 'Adding…' : 'Add referral statuses'}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="platform-statuses">
          <p className="mb-4 text-sm text-text-muted">Manage the profile status options shown in the Platforms page. Drag to reorder.</p>
          <StatusList items={platformStatuses} showColor={false} onAdd={addPlatformStatus} onEdit={editPlatformStatus} onDelete={deletePlatformStatus} onReorder={reorderPlatformStatuses} />
        </TabsContent>
        <TabsContent value="profile">
          <div className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="default-email">Default email for applications</Label>
              <p className="text-xs text-text-muted">Pre-filled when adding new jobs.</p>
              <Input
                id="default-email"
                type="email"
                value={defaultEmail}
                onChange={(e) => setDefaultEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button onClick={saveDefaultEmail} disabled={savingEmail} size="sm">
              {savingEmail ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      <WarningDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Delete Status" description={warningDescription}
        confirmLabel={deleteTarget?.count ? 'Cannot Delete' : 'Delete'} onConfirm={deleteTarget?.count ? () => setDeleteTarget(null) : confirmDelete} isLoading={deleting} />
    </section>
  );
}
