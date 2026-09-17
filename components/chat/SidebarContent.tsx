"use client";

import { Hash, Lock, Plus, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { useRooms, type RoomListItem } from "@/hooks/useRooms";

import { CreateChannelDialog } from "./CreateChannelDialog";

function RoomRow({ room, active, onNavigate }: { room: RoomListItem; active: boolean; onNavigate?: () => void }) {
  const Icon = room.type === "p" ? Lock : room.type === "d" ? User : Hash;
  return (
    <Link
      href={`/channel/${room.rid}?type=${room.type}`}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent"
      }`}
    >
      <Icon className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{room.name}</span>
      {room.unread > 0 && (
        <Badge variant="secondary" className="ml-auto shrink-0">
          {room.unread}
        </Badge>
      )}
    </Link>
  );
}

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2.5 py-1">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-6 w-full bg-sidebar-accent" />
      ))}
    </div>
  );
}

/** Sidebar body shared by the desktop column (AppShell) and the mobile
 * drawer (Sheet, triggered from Navbar) — per WRAPPER_PROMPT.md GATE 7's
 * "sidebar jadi drawer di mobile" requirement, this is the single source
 * of truth for its content so the two never drift apart. */
export function SidebarContent({
  siteName,
  filter = "",
  onNavigate,
}: {
  siteName: string;
  filter?: string;
  onNavigate?: () => void;
}) {
  const { data: rooms, isLoading } = useRooms();
  const { data: me } = useMe();
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = rooms ?? [];
    return q ? list.filter((r) => r.name.toLowerCase().includes(q)) : list;
  }, [rooms, filter]);

  const channels = filtered.filter((r) => r.type === "c");
  const privateRooms = filtered.filter((r) => r.type === "p");
  const directMessages = filtered.filter((r) => r.type === "d");

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="truncate font-heading text-sm font-semibold">{siteName} Workspace</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <SectionSkeleton />
        ) : (
          <>
            <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
              <span className="text-xs font-semibold tracking-wide text-sidebar-foreground/60 uppercase">
                Text channels
              </span>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                aria-label="Create channel"
                className="rounded p-0.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            {channels.length === 0 ? (
              <p className="px-2.5 py-1 text-xs text-sidebar-foreground/50">No channels yet.</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {channels.map((room) => (
                  <RoomRow key={room.rid} room={room} active={pathname === `/channel/${room.rid}`} onNavigate={onNavigate} />
                ))}
              </div>
            )}

            {privateRooms.length > 0 && (
              <>
                <div className="px-2.5 pt-4 pb-1">
                  <span className="text-xs font-semibold tracking-wide text-sidebar-foreground/60 uppercase">
                    Private rooms
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {privateRooms.map((room) => (
                    <RoomRow key={room.rid} room={room} active={pathname === `/channel/${room.rid}`} onNavigate={onNavigate} />
                  ))}
                </div>
              </>
            )}

            {directMessages.length > 0 && (
              <>
                <div className="px-2.5 pt-4 pb-1">
                  <span className="text-xs font-semibold tracking-wide text-sidebar-foreground/60 uppercase">
                    Direct messages
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {directMessages.map((room) => (
                    <RoomRow key={room.rid} room={room} active={pathname === `/channel/${room.rid}`} onNavigate={onNavigate} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-sidebar-border px-3 py-3">
        <Avatar size="sm">
          {me?.username && <AvatarImage src={`/api/rc-avatar/${me.username}`} alt="" />}
          <AvatarFallback>{me?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{me?.name ?? me?.username ?? "…"}</p>
          <p className="text-xs text-primary">Active now</p>
        </div>
      </div>

      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
