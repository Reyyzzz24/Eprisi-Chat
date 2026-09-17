"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRooms } from "@/hooks/useRooms";

// Functional data-layer check for GATE 5 — NOT the mockup-fidelity sidebar
// (that's GATE 7). Exists to prove useRooms actually renders and stays live.
export function RoomList() {
  const { data: rooms, isLoading } = useRooms();

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">No rooms yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1 p-2">
      {rooms.map((room) => (
        <li key={room.rid}>
          <Link
            href={`/channel/${room.rid}?type=${room.type}`}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <span className={room.alert ? "font-semibold" : undefined}>{room.name}</span>
            {room.unread > 0 && <Badge variant="secondary">{room.unread}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
