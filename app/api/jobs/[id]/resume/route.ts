import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface Params {
  params: Promise<{ id: string }>;
}

/** POST /api/jobs/[id]/resume — upload a resume file */
export async function POST(request: NextRequest, { params }: Params) {
  const { id: jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify job ownership
  const { data: job } = await supabase
    .from('jobs')
    .select('id, resume_path')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Parse multipart/form-data
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only PDF, DOC, and DOCX files are accepted' },
      { status: 400 },
    );
  }

  // Validate size
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 });
  }

  const filename = (file as File).name ?? `resume.${file.type.split('/').pop()}`;
  const storagePath = `${user.id}/${jobId}/${filename}`;

  // Delete old resume from Storage if one exists
  if (job.resume_path) {
    await supabase.storage.from('resumes').remove([job.resume_path]);
  }

  // Upload new file
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: 'Upload failed', details: uploadError.message },
      { status: 500 },
    );
  }

  // Persist the storage path in the jobs table
  const { error: dbError } = await supabase
    .from('jobs')
    .update({ resume_path: storagePath })
    .eq('id', jobId)
    .eq('user_id', user.id);

  if (dbError) {
    // Clean up orphaned file on DB failure
    await supabase.storage.from('resumes').remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: { resume_path: storagePath, filename } },
    { status: 201 },
  );
}

/** GET /api/jobs/[id]/resume — generate a 60-minute signed download URL */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: job } = await supabase
    .from('jobs')
    .select('id, resume_path')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!job.resume_path) {
    return NextResponse.json(
      { error: 'No resume uploaded for this job' },
      { status: 404 },
    );
  }

  const expiresIn = 60 * 60; // 60 minutes in seconds
  const { data: signed, error } = await supabase.storage
    .from('resumes')
    .createSignedUrl(job.resume_path, expiresIn);

  if (error || !signed) {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  return NextResponse.json({ data: { url: signed.signedUrl, expires_at: expiresAt } });
}

/** DELETE /api/jobs/[id]/resume — remove the resume file and clear resume_path */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: job } = await supabase
    .from('jobs')
    .select('id, resume_path')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (job.resume_path) {
    await supabase.storage.from('resumes').remove([job.resume_path]);
  }

  await supabase
    .from('jobs')
    .update({ resume_path: null })
    .eq('id', jobId)
    .eq('user_id', user.id);

  return new NextResponse(null, { status: 204 });
}
