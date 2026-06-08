'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileTextIcon, Loader2, StarIcon, UploadIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { platformSchema, type PlatformValues } from '@/lib/schemas';
import { usePlatformStore } from '@/store/platformStore';
import type { Platform } from '@/lib/types';
import { getResumeFilename } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Platform Info', 'Account & Notes'] as const;

interface PlatformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: Platform;
}

export function PlatformModal({ open, onOpenChange, platform }: PlatformModalProps) {
  const { platformStatusOptions, addPlatform, updatePlatform, setPlatformResumePath } = usePlatformStore();
  const isEdit = !!platform;
  const [step, setStep] = useState(1);
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [platformResumeFile, setPlatformResumeFile] = useState<File | null>(null);
  const [removePlatformResume, setRemovePlatformResume] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, watch, reset, trigger, formState: { errors, isSubmitting } } = useForm<PlatformValues>({
    resolver: zodResolver(platformSchema),
    defaultValues: { name: '', url: '', profile_status_id: null, subscription_type: '', login_email: '', personal_rating: null, notes: '' },
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      setPlatformResumeFile(null);
      setRemovePlatformResume(false);
      reset(platform
        ? { name: platform.name, url: platform.url ?? '', profile_status_id: platform.profile_status_id ?? null, subscription_type: platform.subscription_type ?? '', login_email: platform.login_email ?? '', personal_rating: platform.personal_rating ?? null, notes: platform.notes ?? '' }
        : { name: '', url: '', profile_status_id: null, subscription_type: '', login_email: '', personal_rating: null, notes: '' });
    }
  }, [open, platform, reset]);

  async function onSubmit(values: PlatformValues) {
    const result = isEdit && platform ? await updatePlatform(platform.id, values) : await addPlatform(values);
    if (!result) { toast.error(isEdit ? 'Failed to update platform' : 'Failed to add platform'); return; }

    const platformId = result.id;

    // Handle resume deletion
    if (removePlatformResume && result.resume_path) {
      await fetch(`/api/platforms/${platformId}/resume`, { method: 'DELETE' });
      setPlatformResumePath(platformId, null);
    }

    // Handle resume upload
    if (platformResumeFile) {
      setIsUploadingResume(true);
      const formData = new FormData();
      formData.append('file', platformResumeFile);
      const res = await fetch(`/api/platforms/${platformId}/resume`, { method: 'POST', body: formData });
      setIsUploadingResume(false);
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        setPlatformResumePath(platformId, (body.data?.resume_path as string | undefined) ?? null);
      } else {
        toast.error('Platform saved but resume upload failed');
      }
    }

    toast.success(isEdit ? 'Platform updated' : 'Platform added');
    onOpenChange(false);
  }

  async function handleNext() {
    const valid = await trigger(['name']);
    if (!valid) return;
    setStep(2);
  }

  const rating = watch('personal_rating');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Platform' : 'Add Platform'}</DialogTitle>
        </DialogHeader>

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-1 py-1">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  isActive ? 'bg-brand-500 text-white' : isDone ? 'bg-brand-100 text-brand-600' : 'bg-surface-muted text-text-muted'
                )}>
                  {s}
                </div>
                <span className={cn(
                  'text-xs font-medium hidden sm:block truncate',
                  isActive ? 'text-text-primary' : 'text-text-muted'
                )}>
                  {label}
                </span>
                {s < STEP_LABELS.length && (
                  <div className={cn('flex-1 h-px mx-1 shrink-0 min-w-[8px]', isDone ? 'bg-brand-400' : 'bg-border-app')} />
                )}
              </div>
            );
          })}
        </div>

        <form className="space-y-4">

          {/* ── Step 1: Platform Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Platform name <span aria-hidden>*</span></Label>
                <Input id="p-name" placeholder="e.g. LinkedIn" aria-describedby={errors.name ? 'p-name-err' : undefined} {...register('name')} />
                {errors.name && <p id="p-name-err" role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-url">URL</Label>
                <Input id="p-url" type="url" placeholder="https://" {...register('url')} />
                {errors.url && <p role="alert" className="text-xs text-destructive">{errors.url.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-status">Profile Status</Label>
                <Select value={watch('profile_status_id') ?? ''} onValueChange={(v) => setValue('profile_status_id', v || null)}>
                  <SelectTrigger id="p-status">
                    <span className="truncate">
                      {watch('profile_status_id') ? platformStatusOptions.find((o) => o.id === watch('profile_status_id'))?.label : 'Select status'}
                    </span>
                    <SelectValue className="sr-only">{platformStatusOptions.find((o) => o.id === watch('profile_status_id'))?.label ?? ''}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {platformStatusOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sub">Subscription type</Label>
                <Input id="p-sub" placeholder="Free, Premium…" {...register('subscription_type')} />
              </div>
            </div>
          )}

          {/* ── Step 2: Account & Notes ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Login email</Label>
                <Input id="p-email" type="email" {...register('login_email')} />
                {errors.login_email && <p role="alert" className="text-xs text-destructive">{errors.login_email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Personal rating</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                      onClick={() => setValue('personal_rating', rating === star ? null : star)}
                      onMouseEnter={() => setRatingHover(star)} onMouseLeave={() => setRatingHover(null)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                      <StarIcon className={cn('h-6 w-6 transition-colors', (ratingHover ?? rating ?? 0) >= star ? 'fill-brand-500 text-brand-500' : 'fill-none text-text-muted')} />
                    </button>
                  ))}
                  {rating && <button type="button" className="ml-1 text-xs text-text-muted underline" onClick={() => setValue('personal_rating', null)}>Clear</button>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-notes">Notes</Label>
                <Textarea id="p-notes" rows={3} {...register('notes')} />
              </div>

              {/* ── Resume ── */}
              <div className="space-y-1.5">
                <Label>Resume</Label>
                {/* Show existing resume (edit mode) unless marked for removal */}
                {isEdit && platform?.resume_path && !removePlatformResume && !platformResumeFile && (
                  <div className="flex items-center gap-2 rounded-md border border-border-app bg-surface-muted px-3 py-2">
                    <FileTextIcon className="h-4 w-4 shrink-0 text-text-muted" />
                    <span className="flex-1 truncate text-sm text-text-primary">{getResumeFilename(platform.resume_path)}</span>
                    <button
                      type="button"
                      aria-label="Remove resume"
                      onClick={() => setRemovePlatformResume(true)}
                      className="text-text-muted hover:text-destructive"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {/* Show selected new file preview */}
                {platformResumeFile && (
                  <div className="flex items-center gap-2 rounded-md border border-brand-500/40 bg-brand-500/5 px-3 py-2">
                    <FileTextIcon className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="flex-1 truncate text-sm text-text-primary">{platformResumeFile.name}</span>
                    <button
                      type="button"
                      aria-label="Remove selected file"
                      onClick={() => { setPlatformResumeFile(null); if (resumeInputRef.current) resumeInputRef.current.value = ''; }}
                      className="text-text-muted hover:text-destructive"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {/* Upload button */}
                {!platformResumeFile && (
                  <>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      id="p-resume"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 5 * 1024 * 1024) { toast.error('File exceeds 5MB limit'); return; }
                        setPlatformResumeFile(f);
                        setRemovePlatformResume(false);
                      }}
                    />
                    <label
                      htmlFor="p-resume"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border-app px-3 py-2 text-sm text-text-muted hover:border-brand-500 hover:text-brand-500 transition-colors"
                    >
                      <UploadIcon className="h-3.5 w-3.5" />
                      {isEdit && platform?.resume_path && !removePlatformResume ? 'Replace resume' : 'Upload resume'}
                    </label>
                    <p className="text-xs text-text-muted mt-1">PDF, DOC or DOCX · max 5 MB. Jobs linked to this platform with pre-Applied status will be auto-updated.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center gap-2 pt-3 border-t border-border-app">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="ghost" size="sm" className="text-text-muted" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < STEP_LABELS.length ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting || isUploadingResume}
                onClick={() => { void handleSubmit(onSubmit)(); }}
              >
                {(isSubmitting || isUploadingResume) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Add platform'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
