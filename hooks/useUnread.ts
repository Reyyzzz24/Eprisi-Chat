"use client";

import { useRooms } from "./useRooms";

/** Total unread count across all rooms, derived from `useRooms` — which is
 * already kept live via DDP notify-user events — rather than a separate
 * subscription, so there's one realtime source of truth for unread state. */
export function useUnread(): number {
  const { data } = useRooms();
  return (data ?? []).reduce((sum, room) => sum + room.unread, 0);
}
