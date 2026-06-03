'use client';

import { useState, useRef } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function MultiSelect({ label, options, selected, onChange, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerLabel =
    selected.length === 0 ? label : `${label} · ${selected.length}`;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'gap-1.5',
          selected.length > 0 && 'border-brand-500 text-brand-600',
        )}
      >
        {selected.length > 0 && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
        )}
        {triggerLabel}
        <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            className={cn(
              'absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border-app bg-popover shadow-md',
              'py-1 overflow-hidden',
            )}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          >
            {options.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-surface-muted transition-colors"
                >
                  {opt.color ? (
                    <span
                      className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                  ) : (
                    <span className="inline-block h-2 w-2 flex-shrink-0" />
                  )}
                  <span className="flex-1">{opt.label}</span>
                  {isSelected && <CheckIcon className="h-3.5 w-3.5 text-brand-500" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
