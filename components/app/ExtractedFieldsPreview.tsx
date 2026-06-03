'use client';

import { useState } from 'react';
import { AlertTriangleIcon, CheckIcon, Loader2Icon, WandIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ExtractResult {
  company: string | null;
  role: string | null;
  location: string | null;
  salary: string | null;
  confidence: {
    company: 'high' | 'low' | null;
    role: 'high' | 'low' | null;
    location: 'high' | 'low' | null;
    salary: 'high' | 'low' | null;
  };
}

interface ExtractedFieldsPreviewProps {
  result: ExtractResult;
  loading: boolean;
  error: string | null;
  currentValues: { company: string; role: string; location: string; salary: string };
  onApply: (field: 'company' | 'role' | 'location' | 'salary', value: string) => void;
  onApplyAll: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  company: 'Company',
  role: 'Role',
  location: 'Location',
  salary: 'Salary',
};

export function ExtractedFieldsPreview({
  result,
  loading,
  error,
  currentValues,
  onApply,
  onApplyAll,
  onDismiss,
  onRetry,
}: ExtractedFieldsPreviewProps) {
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const liveText =
    !loading && !error && result
      ? `Job details extracted. ${Object.values(result).filter((v) => v && typeof v === 'string').length} fields found.`
      : '';

  const fields = (Object.keys(FIELD_LABELS) as Array<'company' | 'role' | 'location' | 'salary'>).filter(
    (f) => result[f] !== null,
  );

  function handleApply(field: 'company' | 'role' | 'location' | 'salary') {
    onApply(field, result[field]!);
    setApplied((prev) => new Set(prev).add(field));
  }

  function handleApplyAll() {
    fields.forEach((f) => setApplied((prev) => new Set(prev).add(f)));
    onApplyAll();
  }

  return (
    <div role="region" aria-label="Extracted job details" className="rounded-md border border-brand-500/30 bg-brand-50 p-3 space-y-2">
      <p aria-live="polite" className="sr-only">{liveText}</p>

      <div className="flex items-center gap-1.5">
        <WandIcon className="h-4 w-4 text-brand-500" aria-hidden="true" />
        <span className="text-sm font-semibold text-text-primary">
          {loading ? 'Extracting details…' : 'Extracted details'}
        </span>
      </div>

      {loading && (
        <div className="space-y-2 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-14" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-xs font-medium underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && fields.length > 0 && (
        <div className="space-y-1.5">
          {fields.map((field) => {
            const isApplied = applied.has(field);
            const willOverwrite = !!currentValues[field] && currentValues[field] !== result[field];
            const isLowConfidence = result.confidence[field] === 'low';

            return (
              <div key={field} className="flex items-center justify-between gap-2 text-xs">
                <span className="w-16 flex-shrink-0 font-medium text-text-muted">{FIELD_LABELS[field]}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-text-primary" title={result[field]!}>
                  {isLowConfidence && (
                    <span title="Low confidence — verify before applying" aria-label="Low confidence — verify before applying">
                      <AlertTriangleIcon className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                    </span>
                  )}
                  <span className="truncate">{result[field]}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleApply(field)}
                  disabled={isApplied}
                  aria-label={`Apply extracted ${FIELD_LABELS[field]}`}
                  title={willOverwrite && !isApplied ? `This will overwrite '${currentValues[field]}'` : undefined}
                  className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    isApplied
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : willOverwrite
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-brand-500 text-white hover:bg-brand-600'
                  }`}
                >
                  {isApplied ? <CheckIcon className="h-3.5 w-3.5" /> : 'Apply'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && fields.length === 0 && (
        <p className="text-xs text-text-muted">No fields could be extracted from this text.</p>
      )}

      {!loading && !error && fields.length > 0 && (
        <div className="flex items-center gap-3 pt-1 border-t border-brand-500/20">
          <Button type="button" size="sm" className="h-7 text-xs" onClick={handleApplyAll}>Apply all</Button>
          <button type="button" onClick={onDismiss} className="text-xs text-text-muted hover:text-text-primary">Dismiss</button>
        </div>
      )}

      {!loading && (error || fields.length === 0) && (
        <div className="pt-1">
          <button type="button" onClick={onDismiss} className="text-xs text-text-muted hover:text-text-primary">Dismiss</button>
        </div>
      )}
    </div>
  );
}
