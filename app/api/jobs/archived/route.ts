import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const JOB_SELECT =
  'id, user_id, company, role, location, url, source, source_platform_id, status_id, priority, salary, stage_date, stage_date_label, notes, resume_path, job_description, is_archived, created_at, updated_at, status:statuses(id, label, color), platform:platforms(id, name)';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('user_id', user.id)
    .eq('is_archived', true)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
