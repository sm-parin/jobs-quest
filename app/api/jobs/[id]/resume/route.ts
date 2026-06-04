import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic byte signatures for each allowed MIME type (validates actual file content)
const FILE_MAGIC: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/msword': [[0xd0, 0xcf, 0x11, 0xe0]], // OLE2 compound document (DOC)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4b, 0x03, 0x04], // ZIP local file header (DOCX)
  ],
};

async function hasMagicBytes(file: Blob, mimeType: string): Promise<boolean> {
  const signatures = FILE_MAGIC[mimeType];
  if (!signatures) return false;
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  return signatures.some((sig) => sig.every((byte, i) => header[i] === byte));
}

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

  // Validate actual file content matches the declared MIME type (prevents spoofed extensions)
  if (!await hasMagicBytes(file, file.type)) {
    return NextResponse.json(
      { error: 'File content does not match the declared type' },
      { status: 400 },
    );
  }

  // Sanitize filename: strip path traversal and non-safe characters
  const rawName = (file as File).name ?? `resume.${file.type.split('/').pop()}`;
  const filename = path.basename(rawName).replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 200) || 'resume';
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
      { error: 'Upload failed' },
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
