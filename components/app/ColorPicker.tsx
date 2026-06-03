'use client';

import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#94a3b8',
  '#60a5fa',
  '#a78bfa',
  '#f59e0b',
  '#22c55e',
  '#ef4444',
  '#6b7280',
  '#3b82f6',
  '#ec4899',
  '#f97316',
  '#10b981',
  '#8b5cf6',
] as const;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Select a color">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(
            'h-6 w-6 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-110',
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
