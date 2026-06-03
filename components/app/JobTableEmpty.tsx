'use client';

import { BriefcaseIcon, SearchXIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface JobTableEmptyProps {
  hasFilters: boolean;
  onAddJob: () => void;
  onClearFilters: () => void;
}

export function JobTableEmpty({ hasFilters, onAddJob, onClearFilters }: JobTableEmptyProps) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="No jobs match your filters"
        description="Try adjusting your search or filters"
        action={{ label: 'Clear filters', onClick: onClearFilters }}
        size="md"
      />
    );
  }

  return (
    <EmptyState
      icon={BriefcaseIcon}
      title="No jobs yet"
      description="Start tracking your first application"
      action={{ label: 'Add Job', onClick: onAddJob }}
      size="lg"
    />
  );
}
