import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { platformStatusOptionSchema } from '@/lib/schemas';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = platformStatusOptionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('platform_status_options')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, user_id, label, order, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await supabase
    .from('platforms')
    .select('id', { count: 'exact', head: true })
    .eq('profile_status_id', id)
    .eq('user_id', user.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `This status is in use by ${count} platform${count === 1 ? '' : 's'}`, count },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('platform_status_options')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
