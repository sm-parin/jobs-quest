'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select or type...',
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // When external value changes, update input display
  React.useEffect(() => {
    if (!inputValue) {
      const selectedOption = options.find((opt) => opt.value === value);
      if (selectedOption) {
        setInputValue(selectedOption.label);
      }
    }
  }, [value, options, inputValue]);

  // Filter options based on input
  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Show dropdown if:
  // - Input is empty (show all)
  // - OR there are matching options
  const showDropdown = open && (inputValue === '' || filtered.length > 0);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    setOpen(true);

    // If input matches an existing option exactly, set that value
    const exactMatch = options.find(
      (opt) => opt.label.toLowerCase() === text.toLowerCase()
    );
    if (exactMatch) {
      onValueChange(exactMatch.value);
    } else {
      // Otherwise, set custom text value
      onValueChange(text || null);
    }
  };

  const handleSelect = (opt: ComboboxOption) => {
    setInputValue(opt.label);
    onValueChange(opt.value);
    setOpen(false);
  };

  const handleFocus = () => {
    setOpen(true);
    // Calculate dropdown position
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleBlur = () => {
    // Small delay to allow click on dropdown options
    setTimeout(() => setOpen(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter') {
      // Confirm current value and close
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 truncate pr-8',
          )}
        />
        <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
      </div>

      {/* Dropdown menu - using fixed positioning to escape modal clipping */}
      {showDropdown && (
        <div
          className="fixed z-50 max-h-64 overflow-y-auto rounded-lg border border-border-app bg-surface shadow-md"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {inputValue === '' ? (
            // Show all options when input is empty
            options.map((opt) => (
              <button
                key={opt.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-colors border-b border-border-app/50 last:border-0"
              >
                {opt.label}
              </button>
            ))
          ) : (
            // Show filtered options
            filtered.map((opt) => (
              <button
                key={opt.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-colors border-b border-border-app/50 last:border-0"
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
