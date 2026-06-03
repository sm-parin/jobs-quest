'use client';

import { useEffect, useState } from 'react';
import { PlusIcon } from 'lucide-react';

import { usePlatformStore } from '@/store/platformStore';
import { Button } from '@/components/ui/button';
import { PlatformTable } from '@/components/app/PlatformTable';
import { PlatformModal } from '@/components/app/PlatformModal';

export default function PlatformsPage() {
  const { platforms, isLoading, fetchPlatforms, fetchStatusOptions } = usePlatformStore();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    fetchPlatforms();
    fetchStatusOptions();
  }, [fetchPlatforms, fetchStatusOptions]);

  const totalJobs = platforms.reduce((sum, p) => sum + (p.jobs_tracked ?? 0), 0);
  const activeCount = platforms.filter((p) => p.profile_status?.label?.toLowerCase() === 'active').length;

  return (
    <>
      <section aria-labelledby="platforms-heading">
        <div className="flex items-center justify-between">
          <h1 id="platforms-heading" className="text-2xl font-semibold text-text-primary">Platforms</h1>
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Platform
          </Button>
        </div>
        <dl className="mt-4 flex gap-6 rounded-lg border border-border-app bg-surface px-5 py-3">
          <div>
            <dt className="text-xs text-text-muted">Total platforms</dt>
            <dd className="text-lg font-semibold text-text-primary">{platforms.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Active profiles</dt>
            <dd className="text-lg font-semibold text-text-primary">{activeCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Total jobs tracked</dt>
            <dd className="text-lg font-semibold text-text-primary">{totalJobs}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <PlatformTable platforms={platforms} isLoading={isLoading} />
        </div>
      </section>
      <PlatformModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
