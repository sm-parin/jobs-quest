'use client';

import { useCallback, useRef, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { JobFilters } from '@/hooks/useJobFilters';

interface FilterBarProps {
  filters: JobFilters;
  hasActiveFilters: boolean;
  onSetFilter: (key: string, value: string | null) => void;
  onClearFilters: () => void;
}

export function FilterBar({
  filters,
  hasActiveFilters,
  onSetFilter,
  onClearFilters,
}: FilterBarProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 max-w-sm min-w-48">
        <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted pointer-events-none" />
        <Input
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search company or role…"
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

      {/* Date range */}
      <div className="flex items-center gap-1 shrink-0">
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
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-destructive hover:text-destructive shrink-0">
          Clear all
        </Button>
      )}
    </div>
  );
}
