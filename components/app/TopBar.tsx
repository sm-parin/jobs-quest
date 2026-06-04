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
    <header className="flex h-14 items-center gap-3 border-b border-border-app bg-surface px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu" onClick={() => setSheetOpen(true)}>
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </Button>
      <div className="flex items-center gap-2 lg:hidden">
        <BriefcaseIcon className="h-5 w-5 text-brand-500" aria-hidden="true" />
        <span className="font-semibold text-text-primary">Jobs Quest</span>
      </div>
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-semibold">{initials}</AvatarFallback>
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
        <SheetContent side="left" className="w-60 bg-surface p-0">
          <SheetHeader className="flex h-14 items-center gap-2 border-b border-border-app px-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <BriefcaseIcon className="h-5 w-5 text-brand-500" aria-hidden="true" />
              Jobs Quest
            </SheetTitle>
          </SheetHeader>
          <div className="p-3"><NavLinks onNavigate={() => setSheetOpen(false)} /></div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
