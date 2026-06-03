'use client';

import { useTheme } from 'next-themes';
import { MonitorIcon, SunIcon, MoonIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const THEMES = ['system', 'light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

const NEXT_THEME: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const ICON: Record<Theme, React.ElementType> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

const LABEL: Record<Theme, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const current = (theme as Theme) ?? 'system';
  const Icon = ICON[current];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`${LABEL[current]} — click to switch`}
      title={LABEL[current]}
      onClick={() => setTheme(NEXT_THEME[current])}
      className="h-8 w-8 text-text-muted hover:text-text-primary"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
