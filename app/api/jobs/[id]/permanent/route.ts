import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership before hard delete
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
