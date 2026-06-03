'use client';

import { useEffect, useRef, useState } from 'react';
import { DownloadIcon, FileTextIcon, Loader2Icon, UploadIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getResumeFilename } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/button';

// Module-level signed URL cache keyed by jobId
const signedUrlCache = new Map<string, { url: string; fetchedAt: number }>();
const CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes

type UploadState = 'no_resume' | 'uploading' | 'has_resume' | 'error';

interface ResumeSectionProps {
  jobId: string;
  initialResumePath: string | null;
}

export function ResumeSection({ jobId, initialResumePath }: ResumeSectionProps) {
  const [resumePath, setResumePath] = useState(initialResumePath);
  const [state, setState] = useState<UploadState>(initialResumePath ? 'has_resume' : 'no_resume');
  const [progress, setProgress] = useState(0);
  const [uploadingFilename, setUploadingFilename] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const dragCounter = useRef(0);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const errorLiveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
    };
  }, []);

  function announce(msg: string) {
    if (liveRef.current) liveRef.current.textContent = msg;
  }
  function announceError(msg: string) {
    if (errorLiveRef.current) errorLiveRef.current.textContent = msg;
  }

  function validateFile(file: File): string | null {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) return 'Only PDF, DOC, and DOCX files are accepted';
    if (file.size > 5 * 1024 * 1024) return 'File exceeds 5MB limit';
    return null;
  }

  function uploadFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      announceError(validationError);
      setState('error');
      return;
    }

    setErrorMessage(null);
    const truncated = file.name.length > 30 ? file.name.slice(0, 27) + '…' : file.name;
    setUploadingFilename(truncated);
    setState('uploading');
    setProgress(0);
    announce(`Uploading ${file.name}... 0% complete`);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setProgress(pct);
        announce(`Uploading ${file.name}... ${pct}% complete`);
      }
    });

    xhr.addEventListener('load', () => {
      xhrRef.current = null;
      if (xhr.status === 201) {
        let body: Record<string, unknown> = {};
        try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        const newPath: string = (body.data as { resume_path: string }).resume_path;
        setResumePath(newPath);
        setState('has_resume');
        signedUrlCache.delete(jobId);
        announce('Resume uploaded successfully');
        toast.success('Resume uploaded');
      } else {
        let body: Record<string, unknown> = {};
        try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        const msg = (body.error as string) ?? 'Upload failed. Please try again.';
        setErrorMessage(msg);
        announceError(msg);
        setState('error');
      }
    });

    xhr.addEventListener('error', () => {
      xhrRef.current = null;
      const msg = 'Upload failed. Please try again.';
      setErrorMessage(msg);
      announceError(msg);
      setState('error');
    });

    xhr.addEventListener('abort', () => {
      xhrRef.current = null;
      setState('no_resume');
    });

    xhr.open('POST', `/api/jobs/${jobId}/resume`);
    xhr.send(formData);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      setErrorMessage('Please drop one file at a time');
      announceError('Please drop one file at a time');
      setState('error');
      return;
    }
    setErrorMessage(null);
    uploadFile(files[0]);
  }

  function handleCancelUpload() {
    xhrRef.current?.abort();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleDownload() {
    const cached = signedUrlCache.get(jobId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      window.open(cached.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setDownloadLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/resume`);
      if (!res.ok) { toast.error('Could not generate download link'); return; }
      const { data } = await res.json();
      signedUrlCache.set(jobId, { url: data.url, fetchedAt: Date.now() });
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not generate download link');
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handleRemoveConfirmed() {
    setRemoveConfirm(false);
    const res = await fetch(`/api/jobs/${jobId}/resume`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      signedUrlCache.delete(jobId);
      setResumePath(null);
      setState('no_resume');
      toast.success('Resume removed');
    } else {
      toast.error('Failed to remove resume');
    }
  }

  // ── Uploading state ────────────────────────────────────────────────────
  if (state === 'uploading') {
    return (
      <div className="space-y-2">
        <p aria-live="polite" ref={liveRef} className="sr-only" />
        <div className="rounded-md border border-border-app bg-surface-muted px-3 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="max-w-[220px] truncate text-xs text-text-primary" title={uploadingFilename}>
              {uploadingFilename}
            </span>
            <button type="button" onClick={handleCancelUpload} className="text-text-muted hover:text-destructive transition-colors" aria-label="Cancel upload">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <ProgressBar value={progress} />
          <p className="text-xs text-text-muted">{progress}%</p>
        </div>
      </div>
    );
  }

  // ── Has resume state ───────────────────────────────────────────────────
  if (state === 'has_resume' && resumePath) {
    const filename = getResumeFilename(resumePath);
    return (
      <div className="space-y-2">
        <p aria-live="polite" ref={liveRef} className="sr-only" />
        <div className="flex items-center gap-2 rounded-md border border-border-app bg-surface-muted px-3 py-2">
          <FileTextIcon className="h-5 w-5 flex-shrink-0 text-brand-500" />
          <span className="flex-1 truncate text-xs text-text-primary" title={filename}>{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={downloadLoading} className="gap-1.5 text-xs">
            {downloadLoading ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <DownloadIcon className="h-3.5 w-3.5" />}
            Download
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 text-xs">
            Replace
          </Button>
        </div>
        {removeConfirm ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Remove resume?</span>
            <button type="button" onClick={handleRemoveConfirmed} className="font-medium text-destructive hover:underline">Yes</button>
            <button type="button" onClick={() => setRemoveConfirm(false)} className="text-text-muted hover:text-text-primary">Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setRemoveConfirm(true)} className="text-xs text-destructive hover:underline">Remove</button>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>
    );
  }

  // ── No resume / error state ────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <p aria-live="polite" ref={liveRef} className="sr-only" />
      <p aria-live="assertive" ref={errorLiveRef} className="sr-only" />
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors outline-none',
          'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          isDragOver
            ? 'border-brand-500 bg-brand-50'
            : 'border-border-app hover:border-brand-500/50 hover:bg-surface-muted',
        )}
      >
        <UploadIcon className="h-6 w-6 text-text-muted" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text-primary">Upload resume</p>
          <p className="text-xs text-text-muted">PDF, DOC, DOCX up to 5MB</p>
        </div>
        <Button type="button" variant="outline" size="sm" tabIndex={-1} className="pointer-events-none text-xs">
          Choose file
        </Button>
      </div>
      {state === 'error' && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
