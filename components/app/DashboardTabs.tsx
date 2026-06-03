'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsBar } from '@/components/app/StatsBar';
import { OverdueBanner } from '@/components/app/OverdueBanner';
import { JobTable } from '@/components/app/JobTable';
import { ArchivedJobsTable } from '@/components/app/ArchivedJobsTable';
import { JobModal } from '@/components/app/JobModal';
import { ExportButton } from '@/components/app/ExportButton';
import { Button } from '@/components/ui/button';
import type { Job, Status, Platform, Reminder } from '@/lib/types';

interface DashboardTabsProps {
  initialJobs: Job[];
  initialStatuses: Status[];
  initialPlatforms: Platform[];
  initialReminders: Reminder[];
  userId: string;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
        active
          ? 'border-brand-500 text-brand-600'
          : 'border-transparent text-text-muted hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

export function DashboardTabs({
  initialJobs,
  initialStatuses,
  initialPlatforms,
  initialReminders,
  userId,
}: DashboardTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentTab = searchParams.get('tab') ?? 'active';

  const [addOpen, setAddOpen] = useState(false);

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'active') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <StatsBar onArchivedClick={() => setTab('archived')} />

      <OverdueBanner />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        {currentTab === 'active' && (
          <div className="flex items-center gap-2">
            <ExportButton />
            <Button onClick={() => setAddOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Job
            </Button>
          </div>
        )}
      </div>

      <div role="tablist" aria-label="Dashboard sections" className="flex items-center border-b border-border-app">
        <TabButton active={currentTab === 'active'} onClick={() => setTab('active')}>
          Active
        </TabButton>
        <TabButton active={currentTab === 'archived'} onClick={() => setTab('archived')}>
          Archived
        </TabButton>
      </div>

      {currentTab === 'active' ? (
        <JobTable
          initialJobs={initialJobs}
          initialStatuses={initialStatuses}
          initialPlatforms={initialPlatforms}
          initialReminders={initialReminders}
          userId={userId}
          addOpen={addOpen}
          onAddOpenChange={setAddOpen}
        />
      ) : (
        <ArchivedJobsTable />
      )}

      {/* Add Job modal lives here so the tab header button can control it */}
      <JobModal open={addOpen} onOpenChange={setAddOpen} userId={userId} />
    </div>
  );
}
