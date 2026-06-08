'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuIcon, BriefcaseIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NavLinks } from '@/components/app/AppSidebar';
import { StatsBar } from '@/components/app/StatsBar';
import { ThemeToggle } from '@/components/app/ThemeToggle';

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
    <header className="flex h-16 items-center gap-4 border-b border-border-app bg-surface px-6">
      <Button variant="ghost" size="icon" aria-label="Open navigation menu" onClick={() => setSheetOpen(true)}>
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </Button>
      <div className="flex items-center gap-2">
        <BriefcaseIcon className="h-4 w-4 text-brand-500" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-wide text-text-primary">Jobs Quest</span>
      </div>
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-72 bg-surface p-0">
          <SheetHeader className="flex h-16 items-center gap-2 border-b border-border-app px-5">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <BriefcaseIcon className="h-4 w-4 text-brand-500" aria-hidden="true" />
              Jobs Quest
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <div className="hidden lg:block mb-3">
              <StatsBar onArchivedClick={() => setSheetOpen(false)} />
            </div>
            <NavLinks onNavigate={() => setSheetOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
