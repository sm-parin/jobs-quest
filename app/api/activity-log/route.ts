import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get('job_id');
  if (!jobId) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('activity_log')
    .select('id, job_id, user_id, old_status_label, new_status_label, stage_date, changed_at')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .order('changed_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
