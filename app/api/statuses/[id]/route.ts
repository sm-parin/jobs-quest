import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const { label, color, order } = body;

  // Block label/color edits for system statuses
  if (label !== undefined || color !== undefined) {
    const { data: existing } = await supabase
      .from('statuses')
      .select('is_system')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (existing?.is_system) {
      return NextResponse.json({ error: 'This status cannot be modified' }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from('statuses')
    .update({ label, color, order })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, user_id, label, color, order, is_system, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
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

  // Block deletion of system statuses
  const { data: existing } = await supabase
    .from('statuses')
    .select('is_system')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (existing?.is_system) {
    return NextResponse.json({ error: 'This status cannot be deleted' }, { status: 403 });
  }

  const { count } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status_id', id)
    .eq('user_id', user.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `${count} job${count === 1 ? '' : 's'} use this status. Reassign them before deleting.`, count },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('statuses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
