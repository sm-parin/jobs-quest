'use client';

import { useEffect, useRef, useState } from 'react';
import { PlusIcon, UserXIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { contactInputSchema } from '@/lib/schemas';
import { ContactCard } from '@/components/app/ContactCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Contact } from '@/lib/types';

interface ContactPanelProps {
  jobId: string;
  initialContacts: Contact[];
  onContactsChange?: (contacts: Contact[]) => void;
}

interface FormState {
  name: string;
  designation: string;
  email: string;
  phone: string;
}

export function ContactPanel({ jobId, initialContacts, onContactsChange }: ContactPanelProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', designation: '', email: '', phone: '' });
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addFormOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [addFormOpen]);

  function updateContacts(updated: Contact[]) {
    setContacts(updated);
    onContactsChange?.(updated);
  }

  function handleContactUpdated(updated: Contact) {
    updateContacts(contacts.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleContactDeleted(id: string) {
    updateContacts(contacts.filter((c) => c.id !== id));
  }

  function resetForm() {
    setForm({ name: '', designation: '', email: '', phone: '' });
    setValidationErrors({});
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAddFormOpen(false);
      resetForm();
    }
  }

  async function handleAdd(e: React.FormEvent) {
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
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          contacts: [
            {
              name: parsed.data.name,
              designation: parsed.data.designation || null,
              email: parsed.data.email || null,
              phone: parsed.data.phone || null,
            },
          ],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Failed to add contact');
        return;
      }
      updateContacts([...contacts, ...(body.data ?? [])]);
      setAddFormOpen(false);
      resetForm();
      toast.success('Contact added');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Points of Contact</h2>
          {contacts.length > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-muted px-1.5 text-xs font-medium text-text-muted">
              {contacts.length}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddFormOpen((v) => !v)}
          className="h-7 gap-1.5 text-xs"
          aria-label="Add contact"
          aria-expanded={addFormOpen}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add Contact
        </Button>
      </div>

      {/* Empty state */}
      {contacts.length === 0 && !addFormOpen && (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 py-6 text-center">
          <UserXIcon className="h-8 w-8 text-text-muted" strokeWidth={1.5} />
          <p className="text-sm font-medium text-text-primary">No contacts added</p>
          <p className="text-xs text-text-muted">Add the recruiter or hiring manager details</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddFormOpen(true)}
            className="mt-1 gap-1.5 text-xs"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Contact
          </Button>
        </div>
      )}

      {/* Contact list */}
      {contacts.length > 0 && (
        <div className="mt-3 space-y-2">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onUpdated={handleContactUpdated}
              onDeleted={handleContactDeleted}
            />
          ))}
        </div>
      )}

      {/* Add form */}
      {addFormOpen && (
        <div
          className={cn(
            'mt-3 rounded-md border border-brand-500/30 bg-surface-muted p-3',
          )}
          onKeyDown={handleKeyDown}
        >
          <form onSubmit={handleAdd} className="space-y-2">
            <p className="text-xs font-medium text-text-muted">New contact</p>
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
                  setAddFormOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
