import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { activityLogSchema } from '@/lib/schemas';

const LOG_SELECT = 'id, job_id, old_status_label, new_status_label, changed_at';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get('job_id');
  if (!jobId) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });

  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : null;

  // Validate job ownership
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Run count and data queries in parallel
  const [countResult, dataResult] = await Promise.all([
    supabase
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('user_id', user.id),
    (() => {
      let q = supabase
        .from('activity_log')
        .select(LOG_SELECT)
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false });
      if (limit) q = q.limit(limit);
      return q;
    })(),
  ]);

  if (dataResult.error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({
    data: dataResult.data ?? [],
    total: countResult.count ?? 0,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const parsed = activityLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { job_id, old_status_label, new_status_label } = parsed.data;

  // Validate job ownership
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', job_id)
    .eq('user_id', user.id)
    .single();

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      job_id,
      user_id: user.id,
      old_status_label: old_status_label ?? null,
      new_status_label,
    })
    .select(LOG_SELECT)
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
