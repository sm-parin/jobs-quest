import { ArchivedJobsTable } from '@/components/app/ArchivedJobsTable';

export const metadata = { title: 'Archived Jobs — Jobs Quest' };

export default function ArchivedPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Archived Jobs</h1>
        <p className="text-sm text-text-muted mt-1">
          Jobs you&apos;ve archived are stored here. Restore or permanently delete them.
        </p>
      </div>
      <ArchivedJobsTable />
    </div>
  );
}
