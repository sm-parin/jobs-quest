import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CONTACT_SELECT = 'id, job_id, user_id, name, designation, email, phone, created_at, updated_at';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get('job_id');
  if (!jobId) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_SELECT)
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const contacts = (Array.isArray(body) ? body : [body]) as {
    job_id: string;
    name: string;
    designation?: string | null;
    email?: string | null;
    phone?: string | null;
  }[];

  if (!contacts.length || contacts.some((c) => !c.name || !c.job_id)) {
    return NextResponse.json({ error: 'Each contact requires job_id and name' }, { status: 400 });
  }

  const rows = contacts.map(({ job_id, name, designation, email, phone }) => ({
    user_id: user.id,
    job_id,
    name,
    designation: designation ?? null,
    email: email ?? null,
    phone: phone ?? null,
  }));

  const { data, error } = await supabase
    .from('contacts')
    .insert(rows)
    .select(CONTACT_SELECT);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
