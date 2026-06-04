import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });

  const { data, error } = await supabase
    .from('jobs')
    .select('id')
    .eq('user_id', user.id)
    .eq('url', url)
    .eq('is_archived', false)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  if (data) {
    return NextResponse.json({ data: { exists: true, jobId: data.id } });
  }
  return NextResponse.json({ data: { exists: false } });
}
