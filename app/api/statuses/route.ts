import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('statuses')
    .select('id, user_id, label, color, order, created_at, updated_at')
    .eq('user_id', user.id)
    .order('order', { ascending: true });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }
  const body = await request.json();
  const { label, color, order } = body;
  if (!label) return NextResponse.json({ error: 'Label is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('statuses')
    .insert({ user_id: user.id, label, color: color ?? '#94a3b8', order: order ?? 0 })
    .select('id, user_id, label, color, order, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
