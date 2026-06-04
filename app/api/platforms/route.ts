import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { platformSchema } from '@/lib/schemas';

const PLATFORM_SELECT = `
  id, user_id, name, url, profile_status_id, subscription_type,
  login_email, last_application_date, personal_rating, notes,
  created_at, updated_at,
  profile_status:platform_status_options(id, label, order)
`;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('platforms')
    .select(PLATFORM_SELECT)
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  const platformIds = (data ?? []).map((p: any) => p.id);
  const counts: Record<string, number> = {};
  if (platformIds.length > 0) {
    const { data: jobCounts } = await supabase
      .from('jobs')
      .select('source_platform_id')
      .in('source_platform_id', platformIds)
      .eq('user_id', user.id)
      .eq('is_archived', false);

    for (const row of jobCounts ?? []) {
      if (row.source_platform_id) {
        counts[row.source_platform_id] = (counts[row.source_platform_id] ?? 0) + 1;
      }
    }
  }

  const enriched = (data ?? []).map((p: any) => ({ ...p, jobs_tracked: counts[p.id] ?? 0 }));
  return NextResponse.json({ data: enriched });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }
  const body = await request.json();
  const parsed = platformSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    name: parsed.data.name,
    url: parsed.data.url || null,
    profile_status_id: parsed.data.profile_status_id ?? null,
    subscription_type: parsed.data.subscription_type || null,
    login_email: parsed.data.login_email || null,
    personal_rating: parsed.data.personal_rating ?? null,
    notes: parsed.data.notes || null,
  };

  const { data, error } = await supabase
    .from('platforms')
    .insert(payload)
    .select(PLATFORM_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A platform with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  return NextResponse.json({ data: { ...data, jobs_tracked: 0 } }, { status: 201 });
}
