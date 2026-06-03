'use client';

import { useEffect, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useJobStore } from '@/store/jobStore';
import { usePlatformStore } from '@/store/platformStore';
import { Button } from '@/components/ui/button';
import { JobModal } from '@/components/app/JobModal';

export function DashboardClient({ userId }: { userId: string }) {
  const { fetchJobs, fetchStatuses, jobs, isLoading } = useJobStore();
  const { fetchPlatforms, fetchStatusOptions } = usePlatformStore();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchStatuses();
    fetchPlatforms();
    fetchStatusOptions();
  }, [fetchJobs, fetchStatuses, fetchPlatforms, fetchStatusOptions]);

  return (
    <section aria-labelledby="dashboard-heading">
      <div className="flex items-center justify-between">
        <h1 id="dashboard-heading" className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <Button onClick={() => setAddOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Job
        </Button>
      </div>
      {isLoading ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-app py-20 text-center">
          <p className="text-text-muted">Loading…</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-app py-20 text-center">
          <p className="text-text-muted mb-4">No jobs yet. Add your first application.</p>
          <Button onClick={() => setAddOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Add Job</Button>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-text-muted">{jobs.length} application{jobs.length !== 1 ? 's' : ''} tracked.</p>
        </div>
      )}
      <JobModal open={addOpen} onOpenChange={setAddOpen} userId={userId} />
    </section>
  );
}
