import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { job_id, remind_at } = body;
  if (!job_id || !remind_at) {
    return NextResponse.json({ error: 'job_id and remind_at are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('reminders')
    .insert({ job_id, remind_at, user_id: user.id, is_done: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
