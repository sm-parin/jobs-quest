'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordValues) {
    setServerError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold text-text-primary">Check your email</h1>
        <p className="text-sm text-text-muted">
          We sent a password reset link to your email address.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold text-text-primary">Reset your password</h1>
      <p className="mb-6 text-sm text-text-muted">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {serverError && (
        <div role="alert" className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link href="/login" className="text-brand-500 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
