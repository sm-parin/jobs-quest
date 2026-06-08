'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search or type...',
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const handleSelect = (val: string) => {
    onValueChange(val);
    setSearchTerm('');
    setOpen(false);
  };

  const handleCustomSubmit = (customText: string) => {
    if (customText.trim()) {
      onValueChange(customText.trim());
      setSearchTerm('');
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? searchTerm : displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 truncate pr-8',
          )}
        />
        <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
      </div>

      {open && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border-app bg-surface shadow-md">
            {/* Search input in dropdown */}
            <div className="sticky top-0 border-b border-border-app bg-surface p-2">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="h-7 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            {/* Options */}
            <div>
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-colors border-b border-border-app/50 last:border-0"
                >
                  {opt.label}
                </button>
              ))}

              {/* Custom entry option */}
              {searchTerm && !filtered.some((opt) => opt.label.toLowerCase() === searchTerm.toLowerCase()) && (
                <button
                  onClick={() => handleCustomSubmit(searchTerm)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-colors text-brand-500 font-medium"
                >
                  Use "{searchTerm}" as custom value
                </button>
              )}

              {filtered.length === 0 && !searchTerm && (
                <div className="px-3 py-4 text-sm text-text-muted text-center">
                  No options found.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
