'use client';

import { useEffect, useRef, useState } from 'react';
import { MailIcon, PencilIcon, PhoneIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { contactInputSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Contact } from '@/lib/types';

interface ContactCardProps {
  contact: Contact;
  onUpdated: (contact: Contact) => void;
  onDeleted: (id: string) => void;
}

interface FormState {
  name: string;
  designation: string;
  email: string;
  phone: string;
}

type Mode = 'view' | 'edit' | 'delete-confirm';

export function ContactCard({ contact, onUpdated, onDeleted }: ContactCardProps) {
  const [mode, setMode] = useState<Mode>('view');
  const [form, setForm] = useState<FormState>({
    name: contact.name,
    designation: contact.designation ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fading, setFading] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'edit' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [mode]);

  function resetForm() {
    setForm({
      name: contact.name,
      designation: contact.designation ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
    });
    setValidationErrors({});
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setMode('view');
      resetForm();
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const parsed = contactInputSchema.safeParse({
      name: form.name,
      designation: form.designation || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
    });

    if (!parsed.success) {
      setValidationErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    setValidationErrors({});
    setSaving(true);

    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsed.data.name,
          designation: parsed.data.designation || null,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Failed to update contact');
        return;
      }
      onUpdated(body.data as Contact);
      setMode('view');
      toast.success('Contact updated');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Failed to delete contact');
        setMode('view');
        return;
      }
      setFading(true);
      setTimeout(() => onDeleted(contact.id), 300);
    } catch {
      toast.error('Failed to delete contact');
      setMode('view');
    } finally {
      setDeleting(false);
    }
  }

  if (mode === 'edit') {
    return (
      <div
        className="rounded-md border border-border-app bg-surface-muted p-3"
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSave} className="space-y-2">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input
              ref={nameInputRef}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Jane Smith"
              className="h-8 text-sm"
              aria-required="true"
            />
            {validationErrors.name && (
              <p className="mt-0.5 text-xs text-destructive">{validationErrors.name[0]}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={form.designation}
              onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
              placeholder="Hiring Manager"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="jane@co.com"
              className="h-8 text-sm"
            />
            {validationErrors.email && (
              <p className="mt-0.5 text-xs text-destructive">{validationErrors.email[0]}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+1 555 0100"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode('view');
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-md border border-border-app bg-surface-muted p-3 transition-opacity duration-300',
        fading && 'opacity-0',
      )}
    >
      {/* Accessible live region for delete confirmation announcement */}
      <p ref={liveRef} className="sr-only" aria-live="polite" />

      {/* Action buttons — visible on hover or focus-within */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          aria-label={`Edit contact ${contact.name}`}
          title="Edit contact"
          onClick={() => setMode('edit')}
          className="rounded p-1 text-text-muted transition-colors hover:bg-surface hover:text-brand-500"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Delete contact ${contact.name}`}
          title="Delete contact"
          onClick={() => {
            setMode('delete-confirm');
            if (liveRef.current) liveRef.current.textContent = `Remove ${contact.name}?`;
          }}
          className="rounded p-1 text-text-muted transition-colors hover:bg-surface hover:text-destructive"
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="pr-14 text-sm font-semibold text-text-primary">{contact.name}</p>
      {contact.designation && (
        <p className="text-xs text-text-muted">{contact.designation}</p>
      )}
      <div className="mt-1 space-y-0.5">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex max-w-full items-center gap-1 text-xs text-brand-500 hover:underline"
            title={contact.email}
          >
            <MailIcon className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-1 text-xs text-text-muted hover:underline"
          >
            <PhoneIcon className="h-3.5 w-3.5 flex-shrink-0" />
            {contact.phone}
          </a>
        )}
      </div>

      {/* Inline delete confirmation */}
      {mode === 'delete-confirm' && (
        <div className="mt-2 rounded-md border border-destructive/20 bg-[hsl(0_86%_97%)] p-2.5 text-xs dark:bg-[hsl(0_40%_15%)]">
          <p className="font-medium text-destructive">Remove {contact.name}?</p>
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center rounded bg-destructive px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Yes, remove'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('view');
                if (liveRef.current) liveRef.current.textContent = '';
              }}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
