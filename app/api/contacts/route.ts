import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { contactBatchSchema } from '@/lib/schemas';

const CONTACT_SELECT = 'id, job_id, user_id, name, designation, email, phone, created_at, updated_at';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get('job_id');
  if (!jobId) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });

  // Validate job ownership before returning contacts
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_SELECT)
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const parsed = contactBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { job_id, contacts } = parsed.data;

  // Validate job ownership before inserting
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', job_id)
    .eq('user_id', user.id)
    .single();

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rows = contacts.map(({ name, designation, email, phone }) => ({
    user_id: user.id,
    job_id,
    name,
    designation: designation || null,
    email: email || null,
    phone: phone || null,
  }));

  const { data, error } = await supabase
    .from('contacts')
    .insert(rows)
    .select(CONTACT_SELECT);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
