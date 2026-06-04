import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { platformSchema } from '@/lib/schemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLATFORM_SELECT = `
  id, user_id, name, url, profile_status_id, subscription_type,
  login_email, last_application_date, personal_rating, notes,
  created_at, updated_at,
  profile_status:platform_status_options(id, label, order)
`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('platforms')
    .select(PLATFORM_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { count: jobs_tracked } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('source_platform_id', id)
    .eq('user_id', user.id)
    .eq('is_archived', false);

  return NextResponse.json({ data: { ...data, jobs_tracked: jobs_tracked ?? 0 } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }
  const body = await request.json();
  const parsed = platformSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ('name' in parsed.data) patch.name = parsed.data.name;
  if ('url' in parsed.data) patch.url = parsed.data.url || null;
  if ('profile_status_id' in parsed.data) patch.profile_status_id = parsed.data.profile_status_id ?? null;
  if ('subscription_type' in parsed.data) patch.subscription_type = parsed.data.subscription_type || null;
  if ('login_email' in parsed.data) patch.login_email = parsed.data.login_email || null;
  if ('personal_rating' in parsed.data) patch.personal_rating = parsed.data.personal_rating ?? null;
  if ('notes' in parsed.data) patch.notes = parsed.data.notes || null;

  const { data, error } = await supabase
    .from('platforms')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(PLATFORM_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A platform with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { count: jobs_tracked } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('source_platform_id', id)
    .eq('user_id', user.id)
    .eq('is_archived', false);

  return NextResponse.json({ data: { ...data, jobs_tracked: jobs_tracked ?? 0 } });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('source_platform_id', id)
    .eq('user_id', user.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Platform has ${count} linked job${count === 1 ? '' : 's'}. Reassign them before deleting.`, count },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('platforms')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
