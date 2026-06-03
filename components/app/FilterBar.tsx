'use client';

import { useCallback, useRef, useState } from 'react';
import { SearchIcon, XIcon, SlidersHorizontalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/MultiSelect';
import type { Status, Platform } from '@/lib/types';
import type { JobFilters } from '@/hooks/useJobFilters';

interface FilterBarProps {
  filters: JobFilters;
  statuses: Status[];
  platforms: Platform[];
  hasActiveFilters: boolean;
  onSetFilter: (key: string, value: string | null) => void;
  onClearFilters: () => void;
}

const PRIORITY_OPTIONS: MultiSelectOption[] = [
  { value: 'high', label: 'High', color: 'var(--color-destructive)' },
  { value: 'medium', label: 'Medium', color: 'var(--color-brand-500)' },
  { value: 'low', label: 'Low', color: 'var(--color-text-muted)' },
];

export function FilterBar({
  filters,
  statuses,
  platforms,
  hasActiveFilters,
  onSetFilter,
  onClearFilters,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = useState(filters.search);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        onSetFilter('q', value || null);
      }, 300);
    },
    [onSetFilter],
  );

  const statusOptions: MultiSelectOption[] = statuses.map((s) => ({
    value: s.id,
    label: s.label,
    color: s.color,
  }));

  const platformOptions: MultiSelectOption[] = platforms.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const activeFilterCount = [
    filters.statusIds.length > 0,
    filters.platformIds.length > 0,
    filters.priorities.length > 0,
    filters.dateFrom !== '' || filters.dateTo !== '',
  ].filter(Boolean).length;

  const filterControls = (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelect
        label="Status"
        options={statusOptions}
        selected={filters.statusIds}
        onChange={(vals) => onSetFilter('status', vals.join(',') || null)}
      />
      <MultiSelect
        label="Platform"
        options={platformOptions}
        selected={filters.platformIds}
        onChange={(vals) => onSetFilter('platform', vals.join(',') || null)}
      />
      <MultiSelect
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priorities}
        onChange={(vals) => onSetFilter('priority', vals.join(',') || null)}
      />
      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onSetFilter('from', e.target.value || null)}
          aria-label="Stage date from"
          className="h-8 w-36 text-xs"
        />
        <span className="text-text-muted text-xs">–</span>
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onSetFilter('to', e.target.value || null)}
          aria-label="Stage date to"
          className="h-8 w-36 text-xs"
        />
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-destructive hover:text-destructive">
          Clear all
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search company or role..."
            className="pl-8 pr-8 h-8 text-sm"
            aria-label="Search jobs"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="hidden lg:flex">{filterControls}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('flex lg:hidden gap-1.5', activeFilterCount > 0 && 'border-brand-500 text-brand-600')}
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
        >
          <SlidersHorizontalIcon className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
      <div className="flex lg:hidden md:flex hidden">{filterControls}</div>
      {mobileOpen && (
        <div className="lg:hidden rounded-lg border border-border-app bg-surface p-3 shadow-sm">
          {filterControls}
        </div>
      )}
    </div>
  );
}
