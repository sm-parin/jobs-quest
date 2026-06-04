'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BriefcaseIcon, ArchiveIcon, SettingsIcon, LayoutGridIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: BriefcaseIcon },
  { href: '/dashboard/platforms', label: 'Platforms', icon: LayoutGridIcon },
  { href: '/dashboard?tab=archived', label: 'Archived', icon: ArchiveIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  return (
    <nav aria-label="Main navigation">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const [hrefPath, hrefQuery] = href.split('?');
          let isActive: boolean;
          if (hrefQuery) {
            // Match both path and the tab query param
            const expected = new URLSearchParams(hrefQuery).get('tab');
            isActive = pathname === hrefPath && tab === expected;
          } else if (hrefPath === '/dashboard') {
            // Dashboard is active only when no tab param is set
            isActive = pathname === '/dashboard' && !tab;
          } else {
            isActive = pathname === hrefPath || pathname.startsWith(hrefPath + '/');
          }
          return (
            <li key={href}>
              <Link href={href} onClick={onNavigate} aria-current={isActive ? 'page' : undefined}
                className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-500' : 'text-text-muted hover:bg-surface-muted hover:text-text-primary')}>
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border-app lg:bg-surface">
      <div className="flex h-14 items-center gap-2 border-b border-border-app px-4">
        <BriefcaseIcon className="h-5 w-5 text-brand-500" aria-hidden="true" />
        <span className="font-semibold text-text-primary">Jobs Quest</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks />
      </div>
    </aside>
  );
}
