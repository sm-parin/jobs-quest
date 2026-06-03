'use client';

import { JobCard } from '@/components/app/JobCard';
import type { Job, Status, Reminder } from '@/lib/types';

interface JobCardListProps {
  jobs: Job[];
  statuses: Status[];
  reminders: Reminder[];
  onEdit: (job: Job) => void;
}

export function JobCardList({ jobs, statuses, reminders, onEdit }: JobCardListProps) {
  const reminderMap = new Map(reminders.map((r) => [r.job_id, r]));

  return (
    <div aria-label="Job applications" role="list">
      {jobs.map((job) => (
        <div key={job.id} role="listitem">
          <JobCard
            job={job}
            statuses={statuses}
            reminder={reminderMap.get(job.id)}
            onEdit={onEdit}
          />
        </div>
      ))}
    </div>
  );
}
