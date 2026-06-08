'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, ListFilterIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

interface ColumnFilterProps {
  label: string;
  /** null = this column is not the current sort column */
  sortDir?: 'asc' | 'desc' | null;
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  /** Provide options to render a checkbox list filter */
  options?: FilterOption[];
  selectedValues?: string[];
  onFilterChange?: (values: string[]) => void;
  /** Highlight the icon when sort or filter is active */
  isActive?: boolean;
}

export function ColumnFilter({
  label,
  sortDir = null,
  onSortAsc,
  onSortDesc,
  options,
  selectedValues = [],
  onFilterChange,
  isActive,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Recompute position each time panel opens
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = 192;
    const left = Math.min(rect.left, window.innerWidth - panelWidth - 8);
    setPos({ top: rect.bottom + 6, left: Math.max(8, left) });
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggleValue(val: string) {
    if (!onFilterChange) return;
    const next = selectedValues.includes(val)
      ? selectedValues.filter((v) => v !== val)
      : [...selectedValues, val];
    onFilterChange(next);
  }

  const hasSort = !!(onSortAsc || onSortDesc);
  const hasFilter = !!(options && options.length > 0);
  const iconActive = isActive || selectedValues.length > 0 || sortDir !== null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`Filter / sort ${label}`}
        aria-expanded={open}
        className={cn(
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors ml-1',
          iconActive
            ? 'text-brand-500'
            : 'text-text-muted opacity-0 group-hover/th:opacity-60',
        )}
      >
        <ListFilterIcon className="h-3 w-3" />
      </button>

      {mounted && open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 192 }}
          className="rounded-lg border border-border-app bg-surface shadow-xl py-1 text-sm"
          role="dialog"
          aria-label={`${label} filter options`}
        >
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">{label}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-primary"
              aria-label="Close"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>

          {hasSort && (
            <div className="px-1">
              <button
                type="button"
                onClick={() => { onSortAsc?.(); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-muted transition-colors',
                  sortDir === 'asc' && 'text-brand-500 font-medium',
                )}
              >
                <ArrowUpIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Sort A → Z</span>
                {sortDir === 'asc' && <CheckIcon className="ml-auto h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => { onSortDesc?.(); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-muted transition-colors',
                  sortDir === 'desc' && 'text-brand-500 font-medium',
                )}
              >
                <ArrowDownIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Sort Z → A</span>
                {sortDir === 'desc' && <CheckIcon className="ml-auto h-3 w-3" />}
              </button>
            </div>
          )}

          {hasSort && hasFilter && <div className="my-1 border-t border-border-app" />}

          {hasFilter && (
            <div className="max-h-52 overflow-y-auto px-1">
              {options!.map((opt) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-muted transition-colors"
                  >
                    <span className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      checked ? 'border-brand-500 bg-brand-500' : 'border-border-app',
                    )}>
                      {checked && <CheckIcon className="h-2.5 w-2.5 text-white" />}
                    </span>
                    {opt.color && (
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                    )}
                    <span className="flex-1 text-left text-text-primary truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedValues.length > 0 && (
            <>
              <div className="my-1 border-t border-border-app" />
              <div className="px-1">
                <button
                  type="button"
                  onClick={() => onFilterChange?.([])}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-destructive hover:bg-surface-muted transition-colors"
                >
                  Clear filter
                </button>
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
