import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const FILE_MAGIC: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'application/msword': [[0xd0, 0xcf, 0x11, 0xe0]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4b, 0x03, 0x04],
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

/**
 * Copies a file from one Supabase Storage path to another within the 'resumes' bucket.
 * Returns the destination path on success, or null on failure.
 */
async function copyStorageFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourcePath: string,
  destPath: string,
  contentType: string,
): Promise<boolean> {
  const { data: blob, error: downloadError } = await supabase.storage
    .from('resumes')
    .download(sourcePath);
  if (downloadError || !blob) return false;

  const arrayBuffer = await blob.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(destPath, arrayBuffer, { contentType, upsert: true });
  return !uploadError;
}

/** POST /api/platforms/[id]/resume — upload a resume for a platform */
export async function POST(request: NextRequest, { params }: Params) {
  const { id: platformId } = await params;
  if (!UUID_RE.test(platformId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify platform ownership
  const { data: platform } = await supabase
    .from('platforms')
    .select('id, resume_path')
    .eq('id', platformId)
    .eq('user_id', user.id)
    .single();
  if (!platform) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Parse multipart/form-data
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only PDF, DOC, and DOCX files are accepted' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 });
  }
  if (!await hasMagicBytes(file, file.type)) {
    return NextResponse.json({ error: 'File content does not match the declared type' }, { status: 400 });
  }

  const rawName = (file as File).name ?? `resume.${file.type.split('/').pop()}`;
  const filename = path.basename(rawName).replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 200) || 'resume';
  const storagePath = `${user.id}/platforms/${platformId}/${filename}`;

  // Delete old platform resume from Storage if one exists
  if (platform.resume_path && platform.resume_path !== storagePath) {
    await supabase.storage.from('resumes').remove([platform.resume_path]);
  }

  // Upload new file
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Update platform record
  const { error: dbError } = await supabase
    .from('platforms')
    .update({ resume_path: storagePath })
    .eq('id', platformId)
    .eq('user_id', user.id);

  if (dbError) {
    await supabase.storage.from('resumes').remove([storagePath]);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // ── Auto-sync to linked jobs that are pre-Applied ──────────────────────────
  // Find the user's system "Applied" status to get its order threshold
  const { data: appliedStatus } = await supabase
    .from('statuses')
    .select('order')
    .eq('user_id', user.id)
    .eq('is_system', true)
    .single();

  if (appliedStatus !== null) {
    const appliedOrder: number = appliedStatus.order;

    // Find linked non-archived jobs with their status order
    const { data: linkedJobs } = await supabase
      .from('jobs')
      .select('id, resume_path, status_id, status:statuses(order)')
      .eq('source_platform_id', platformId)
      .eq('user_id', user.id)
      .eq('is_archived', false);

    for (const job of linkedJobs ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusOrder: number | null = (job.status as any)?.order ?? null;
      const isPreApplied = statusOrder === null || statusOrder < appliedOrder;
      if (!isPreApplied) continue;

      const jobDestPath = `${user.id}/${job.id}/${filename}`;

      // Delete old job resume if it exists and differs
      if (job.resume_path && job.resume_path !== jobDestPath) {
        await supabase.storage.from('resumes').remove([job.resume_path]);
      }

      const copied = await copyStorageFile(supabase, storagePath, jobDestPath, file.type);
      if (copied) {
        await supabase
          .from('jobs')
          .update({ resume_path: jobDestPath })
          .eq('id', job.id)
          .eq('user_id', user.id);
      }
    }
  }

  return NextResponse.json({ data: { resume_path: storagePath } }, { status: 201 });
}

/** GET /api/platforms/[id]/resume — get a 60-min signed URL for the platform resume */
export async function GET(
  _request: NextRequest,
  { params }: Params,
) {
  const { id: platformId } = await params;
  if (!UUID_RE.test(platformId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: platform } = await supabase
    .from('platforms')
    .select('resume_path')
    .eq('id', platformId)
    .eq('user_id', user.id)
    .single();

  if (!platform) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!platform.resume_path) return NextResponse.json({ error: 'No resume attached' }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from('resumes')
    .createSignedUrl(platform.resume_path, 60 * 60);

  if (error || !signed) return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}

/** DELETE /api/platforms/[id]/resume — remove the platform resume */
export async function DELETE(
  _request: NextRequest,
  { params }: Params,
) {
  const { id: platformId } = await params;
  if (!UUID_RE.test(platformId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: platform } = await supabase
    .from('platforms')
    .select('resume_path')
    .eq('id', platformId)
    .eq('user_id', user.id)
    .single();

  if (!platform) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!platform.resume_path) return new NextResponse(null, { status: 204 });

  await supabase.storage.from('resumes').remove([platform.resume_path]);

  const { error: dbError } = await supabase
    .from('platforms')
    .update({ resume_path: null })
    .eq('id', platformId)
    .eq('user_id', user.id);

  if (dbError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
