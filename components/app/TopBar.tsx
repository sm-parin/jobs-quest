'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuIcon, BriefcaseIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { NavLinks } from '@/components/app/AppSidebar';

interface TopBarProps {
  user: Pick<User, 'id' | 'email'>;
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'JQ';

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border-app bg-surface px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation menu"
        onClick={() => setSheetOpen(true)}
      >
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* App name (mobile only — desktop shows in sidebar) */}
      <div className="flex items-center gap-2 lg:hidden">
        <BriefcaseIcon className="h-5 w-5 text-brand-500" aria-hidden="true" />
        <span className="font-semibold text-text-primary">Jobs Quest</span>
      </div>

      <div className="flex-1" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="User menu" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile slide-in nav */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-60 bg-surface p-0">
          <SheetHeader className="flex h-14 items-center gap-2 border-b border-border-app px-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <BriefcaseIcon className="h-5 w-5 text-brand-500" aria-hidden="true" />
              Jobs Quest
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <NavLinks onNavigate={() => setSheetOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
