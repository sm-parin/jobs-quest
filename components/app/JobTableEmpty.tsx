'use client';

import { BriefcaseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JobTableEmptyProps {
  hasFilters: boolean;
  onAddJob: () => void;
  onClearFilters: () => void;
}

export function JobTableEmpty({ hasFilters, onAddJob, onClearFilters }: JobTableEmptyProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-text-primary font-medium mb-1">No jobs match your filters</p>
        <p className="text-sm text-text-muted mb-4">Try adjusting your search or filters</p>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50">
        <BriefcaseIcon className="h-10 w-10 text-brand-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">No jobs yet</h2>
      <p className="text-sm text-text-muted mb-6">Start tracking your first application</p>
      <Button onClick={onAddJob}>Add Job</Button>
    </div>
  );
}
