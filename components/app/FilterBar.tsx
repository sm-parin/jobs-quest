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
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center gap-2">
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
      </div>

      {/* Reset button at extreme right */}
      <div className="ml-auto">
        <Button variant="ghost" size="sm" onClick={() => { setLocalSearch(''); onClearFilters(); }} className="text-text-muted hover:text-text-primary">
          <span className="sr-only">Reset filters</span>
          {/* anticlockwise arrow */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20a8 8 0 10-8 8" transform="rotate(-45 12 12)" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
