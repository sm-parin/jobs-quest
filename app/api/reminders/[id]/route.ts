import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const REMINDER_SELECT =
  'id, job_id, user_id, remind_at, is_done, created_at, updated_at, job:jobs(company, role, status:statuses(label, color))';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  // Only allow safe fields
  const allowed: Record<string, unknown> = {};
  if (body.remind_at !== undefined) allowed.remind_at = body.remind_at;
  if (body.is_done !== undefined) allowed.is_done = body.is_done;

  const { data, error } = await supabase
    .from('reminders')
    .update(allowed)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(REMINDER_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: error ? 500 : 404 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
