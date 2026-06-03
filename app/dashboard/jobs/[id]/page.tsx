import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobDetailClient } from '@/components/app/JobDetailClient';
import type { Job, Contact, ActivityLog, Reminder } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('jobs')
    .select('company,role')
    .eq('id', id)
    .single();
  if (!data) return { title: 'Job Detail' };
  return { title: `${data.company} — ${data.role}` };
}

export default async function JobDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const backParams = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [jobResult, contactsResult, activityResult, reminderResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, status:statuses(id,label,color), platform:platforms(id,name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('contacts')
      .select('id,job_id,user_id,name,designation,email,phone,created_at,updated_at')
      .eq('job_id', id),
    supabase
      .from('activity_log')
      .select('id,job_id,user_id,old_status_label,new_status_label,stage_date,changed_at')
      .eq('job_id', id)
      .order('changed_at', { ascending: false }),
    supabase
      .from('reminders')
      .select('id,job_id,user_id,remind_at,is_done,created_at,updated_at')
      .eq('job_id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (!jobResult.data) notFound();

  const job = jobResult.data as unknown as Job;
  const contacts = (contactsResult.data ?? []) as unknown as Contact[];
  const activityLog = (activityResult.data ?? []) as unknown as ActivityLog[];
  const reminder = reminderResult.data as unknown as Reminder | null;

  const backSearchParams = new URLSearchParams();
  const keepKeys = ['q', 'status', 'platform', 'priority', 'from', 'to', 'sort', 'dir'];
  for (const key of keepKeys) {
    if (backParams[key]) backSearchParams.set(key, backParams[key]);
  }
  const backHref = backSearchParams.toString()
    ? `/dashboard?${backSearchParams.toString()}`
    : '/dashboard';

  return (
    <JobDetailClient
      job={job}
      contacts={contacts}
      activityLog={activityLog}
      reminder={reminder}
      userId={user.id}
      backHref={backHref}
    />
  );
}
