"use client";

import { Bell, LogOut, Menu, Settings, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMe } from "@/hooks/useMe";
import { useUnread } from "@/hooks/useUnread";
import { RC_PUBLIC_URL } from "@/lib/rc/config";

import { SidebarContent } from "./SidebarContent";

/** Top bar per mockups/rocketchat/dashboard.jpg. Two deliberate departures
 * from the mockup, both documented in the GATE 7 report rather than faked:
 * - The search field is a REAL client-side filter over the already-loaded
 *   room list (see SidebarContent's `filter` prop), not the mockup's
 *   implied global command-palette / spotlight search — no such endpoint
 *   is in SCOPE.md's MVP list, and a decorative "⌘K" box that does nothing
 *   would be exactly the "jangan karang fitur" WRAPPER_PROMPT.md forbids.
 * - The bell shows a real unread-count dot (derived from `useUnread`), but
 *   clicking it is inert — there is no notification center in SCOPE.md's
 *   MVP list either. */
export function Navbar({
  siteName,
  logoUrl,
  filter,
  onFilterChange,
}: {
  siteName: string;
  logoUrl: string;
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  const { data: me } = useMe();
  const unread = useUnread();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = Boolean(me?.roles && (me.roles as string[]).includes("admin"));

  async function handleLogout() {
    await fetch("/api/rc/session/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SheetTitle>{siteName} navigation</SheetTitle>
          <SidebarContent siteName={siteName} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        {logoUrl && <Image src={logoUrl} alt="" width={24} height={24} className="size-6 shrink-0" unoptimized />}
        <span className="font-heading text-base font-bold text-sidebar-foreground">{siteName}</span>
      </div>

      <div className="mx-auto w-full max-w-md">
        <Input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter your rooms…"
          className="h-8 border-transparent bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-foreground/50"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="relative shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
        aria-label={unread > 0 ? `${unread} unread` : "No unread"}
      >
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-sidebar-accent">
            <Avatar size="sm">
              {me?.username && <AvatarImage src={`/api/rc-avatar/${me.username}`} alt="" />}
              <AvatarFallback>{me?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{me?.name ?? me?.username}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`${RC_PUBLIC_URL}/account`}>
              <Settings /> Account settings
            </a>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <a href={`${RC_PUBLIC_URL}/admin`}>
                <ShieldCheck /> Admin
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
            <LogOut /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
