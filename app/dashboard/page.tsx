import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobTable } from '@/components/app/JobTable';
import { JobTableSkeleton } from '@/components/app/JobTableSkeleton';
import type { Job, Status, Platform } from '@/lib/types';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [jobsResult, statusesResult, platformsResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, status:statuses(id,label,color), platform:platforms(id,name), contacts(id,name)')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false }),
    supabase
      .from('statuses')
      .select('id,user_id,label,color,order,created_at,updated_at')
      .eq('user_id', user.id)
      .order('order', { ascending: true }),
    supabase
      .from('platforms')
      .select('id,user_id,name,url,profile_status_id,subscription_type,login_email,last_application_date,personal_rating,notes,created_at,updated_at')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
  ]);

  const jobs = ((jobsResult.data ?? []) as unknown as Job[]);
  const statuses = ((statusesResult.data ?? []) as unknown as Status[]);
  const platforms = ((platformsResult.data ?? []) as unknown as Platform[]);

  return (
    <Suspense fallback={<JobTableSkeleton />}>
      <JobTable
        initialJobs={jobs}
        initialStatuses={statuses}
        initialPlatforms={platforms}
        userId={user.id}
      />
    </Suspense>
  );
}
