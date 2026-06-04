'use client';

import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Pencil, Trash2, Check, X, LockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/app/ColorPicker';
import { cn } from '@/lib/utils';

interface StatusItem {
  id: string;
  label: string;
  color?: string;
  order: number;
  is_system?: boolean;
}

interface StatusOptionRowProps {
  item: StatusItem;
  showColor?: boolean;
  onEdit: (id: string, label: string, color?: string) => Promise<void>;
  onDelete: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function StatusOptionRow({
  item,
  showColor = false,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: StatusOptionRowProps) {
  const [editing, setEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(item.label);
  const [colorValue, setColorValue] = useState(item.color ?? '#94a3b8');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  function startEdit() {
    setLabelValue(item.label);
    setColorValue(item.color ?? '#94a3b8');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function saveEdit() {
    if (!labelValue.trim()) return;
    setSaving(true);
    await onEdit(item.id, labelValue.trim(), showColor ? colorValue : undefined);
    setSaving(false);
    setEditing(false);
  }

  function cancelEdit() {
    setLabelValue(item.label);
    setColorValue(item.color ?? '#94a3b8');
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 rounded-md border border-border-app bg-surface p-2',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        aria-label={`Drag to reorder ${item.label}`}
        className="mt-1 cursor-grab touch-none text-text-muted hover:text-text-primary active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col gap-2">
        {editing ? (
          <>
            <div className="flex items-center gap-2">
              {showColor && (
                <div
                  className="h-5 w-5 flex-shrink-0 rounded-full border border-border-app"
                  style={{ backgroundColor: colorValue }}
                />
              )}
              <Input
                ref={inputRef}
                value={labelValue}
                onChange={(e) => setLabelValue(e.target.value)}
                className="h-7 text-sm"
                aria-label="Status label"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
            </div>
            {showColor && <ColorPicker value={colorValue} onChange={setColorValue} />}
          </>
        ) : (
          <div className="flex items-center gap-2">
            {showColor && item.color && (
              <div
                className="h-4 w-4 flex-shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
            )}
            <span className="text-sm text-text-primary">{item.label}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 focus:opacity-100" aria-label={`Move ${item.label} up`} disabled={isFirst} onClick={onMoveUp}>
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 focus:opacity-100" aria-label={`Move ${item.label} down`} disabled={isLast} onClick={onMoveDown}>
          <ChevronDown className="h-3 w-3" />
        </Button>

        {editing ? (
          <>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Save" disabled={saving} onClick={saveEdit}>
              <Check className="h-3 w-3 text-brand-500" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Cancel" onClick={cancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (item.is_system || item.label?.toLowerCase() === 'applied') ? (
          <div className="flex items-center gap-1 px-1" title="System status — cannot be edited or deleted">
            <LockIcon className="h-3 w-3 text-text-muted" aria-hidden />
            <span className="text-[10px] text-text-muted font-medium">System</span>
          </div>
        ) : (
          <>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${item.label}`} onClick={startEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete ${item.label}`} onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
