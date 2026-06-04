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
import { JobCardList } from '@/components/app/JobCardList';
import { Button } from '@/components/ui/button';
import type { Job, Status, Platform, Reminder } from '@/lib/types';
import { useJobStore } from '@/store/jobStore';

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
        'px-5 py-3 text-[11px] font-semibold tracking-widest uppercase transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
        active
          ? 'border-brand-500 text-text-primary'
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
  const [editJob, setEditJob] = useState<Job | undefined>(undefined);
  const { jobs } = useJobStore();

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
          <div className="hidden lg:flex items-center gap-2">
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
        <>
          <div className="hidden lg:block">
            <JobTable
              initialJobs={initialJobs}
              initialStatuses={initialStatuses}
              initialPlatforms={initialPlatforms}
              initialReminders={initialReminders}
              userId={userId}
              addOpen={addOpen}
              onAddOpenChange={setAddOpen}
            />
          </div>
          <div className="lg:hidden">
            <JobCardList
              jobs={jobs.length > 0 ? jobs : initialJobs}
              statuses={initialStatuses}
              reminders={initialReminders}
              onEdit={(job) => {
                setEditJob(job);
              }}
            />
          </div>
        </>
      ) : (
        <ArchivedJobsTable />
      )}

      {/* Add Job modal — controlled from header button or mobile FAB */}
      <JobModal open={addOpen} onOpenChange={setAddOpen} userId={userId} />
      {/* Edit Job modal — triggered from mobile card context menu */}
      {editJob && (
        <JobModal open={!!editJob} onOpenChange={(open) => { if (!open) setEditJob(undefined); }} job={editJob} userId={userId} />
      )}

      {/* Mobile FAB */}
      {currentTab === 'active' && (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add job application"
          className="fixed bottom-6 right-6 z-40 lg:hidden flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
        >
          <PlusIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
