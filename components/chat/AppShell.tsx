"use client";

import { useState, type ReactNode } from "react";

import { ErrorBoundary } from "@/components/chat/ErrorBoundary";
import { Navbar } from "@/components/chat/Navbar";
import { SidebarContent } from "@/components/chat/SidebarContent";

/** Dashboard shell per mockups/rocketchat/dashboard.jpg — navbar + sidebar +
 * main content. The mockup's separate multi-workspace icon-rail (avatars
 * for "HQ"/"PR" alongside the current workspace) has no equivalent in
 * Rocket.Chat, which is a single-workspace-per-instance system — per
 * explicit user decision (GATE 7), it's dropped entirely rather than
 * faked, folding into one 262px sidebar that matches RC's actual
 * navigational model. */
export function AppShell({
  children,
  siteName,
  logoUrl,
}: {
  children: ReactNode;
  siteName: string;
  logoUrl: string;
}) {
  const [filter, setFilter] = useState("");

  return (
    <div className="flex h-dvh flex-col">
      <Navbar siteName={siteName} logoUrl={logoUrl} filter={filter} onFilterChange={setFilter} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[262px] shrink-0 border-r border-sidebar-border md:flex">
          <SidebarContent siteName={siteName} filter={filter} />
        </aside>
        <main className="flex min-h-0 flex-1 flex-col bg-background">
          <ErrorBoundary label="app-shell-main">{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
