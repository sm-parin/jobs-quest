'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, StarIcon } from 'lucide-react';
import { toast } from 'sonner';

import { platformSchema, type PlatformValues } from '@/lib/schemas';
import { usePlatformStore } from '@/store/platformStore';
import type { Platform } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface PlatformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: Platform;
}

export function PlatformModal({ open, onOpenChange, platform }: PlatformModalProps) {
  const { platformStatusOptions, addPlatform, updatePlatform } = usePlatformStore();
  const isEdit = !!platform;
  const [ratingHover, setRatingHover] = useState<number | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<PlatformValues>({
    resolver: zodResolver(platformSchema),
    defaultValues: { name: '', url: '', profile_status_id: null, subscription_type: '', login_email: '', personal_rating: null, notes: '' },
  });

  useEffect(() => {
    if (open) {
      reset(platform
        ? { name: platform.name, url: platform.url ?? '', profile_status_id: platform.profile_status_id ?? null, subscription_type: platform.subscription_type ?? '', login_email: platform.login_email ?? '', personal_rating: platform.personal_rating ?? null, notes: platform.notes ?? '' }
        : { name: '', url: '', profile_status_id: null, subscription_type: '', login_email: '', personal_rating: null, notes: '' });
    }
  }, [open, platform, reset]);

  async function onSubmit(values: PlatformValues) {
    const result = isEdit && platform ? await updatePlatform(platform.id, values) : await addPlatform(values);
    if (!result) { toast.error(isEdit ? 'Failed to update platform' : 'Failed to add platform'); return; }
    toast.success(isEdit ? 'Platform updated' : 'Platform added');
    onOpenChange(false);
  }

  const rating = watch('personal_rating');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? 'Edit Platform' : 'Add Platform'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Platform name <span aria-hidden>*</span></Label>
            <Input id="p-name" placeholder="e.g. LinkedIn" aria-describedby={errors.name ? 'p-name-err' : undefined} {...register('name')} />
            {errors.name && <p id="p-name-err" role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-url">URL</Label>
            <Input id="p-url" type="url" placeholder="https://" {...register('url')} />
            {errors.url && <p role="alert" className="text-sm text-destructive">{errors.url.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-status">Profile Status</Label>
            <Select value={watch('profile_status_id') ?? ''} onValueChange={(v) => setValue('profile_status_id', v || null)}>
              <SelectTrigger id="p-status"><SelectValue placeholder="Select status" /></SelectTrigger>
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
          <div className="space-y-1.5">
            <Label htmlFor="p-email">Login email</Label>
            <Input id="p-email" type="email" {...register('login_email')} />
            {errors.login_email && <p role="alert" className="text-sm text-destructive">{errors.login_email.message}</p>}
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
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add platform'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
