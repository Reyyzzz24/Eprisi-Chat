"use client";

import type { IRoom, ISubscription } from "@rocket.chat/core-typings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribeStream } from "@/lib/rc/ddp";
import { rcRest, type RoomType } from "@/lib/rc/rest";

import { useMe } from "./useMe";

export type RoomListItem = {
  rid: string;
  type: RoomType;
  name: string;
  unread: number;
  alert: boolean;
  updatedAt: string;
};

function toDateString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mergeRoomsAndSubs(rooms: IRoom[], subs: ISubscription[]): RoomListItem[] {
  const roomById = new Map(rooms.map((r) => [r._id, r]));
  return subs
    .map((sub): RoomListItem => {
      const room = roomById.get(sub.rid);
      return {
        rid: sub.rid,
        type: (sub.t as RoomType) ?? "c",
        name: sub.fname || sub.name || room?.name || sub.rid,
        unread: sub.unread ?? 0,
        alert: Boolean(sub.alert),
        updatedAt: toDateString(room?._updatedAt ?? sub._updatedAt),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Room list with unread/sorting per SCOPE.md, kept live via
 * `notify-user/<uid>/{rooms-changed,subscriptions-changed}` (confirmed
 * reachable in GATE 1 spike #9). On any such event we simply invalidate and
 * refetch the two REST calls rather than hand-patching the cache — the
 * payloads are cheap and this avoids a whole class of merge-drift bugs. */
export function useRooms() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const [roomsRes, subsRes] = await Promise.all([rcRest.roomsGet(), rcRest.subscriptionsGet()]);
      return mergeRoomsAndSubs(roomsRes.update, subsRes.update);
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const uid = me?._id;
    if (!uid) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["rooms"] });
    const unsubRooms = subscribeStream("notify-user", [`${uid}/rooms-changed`], invalidate);
    const unsubSubs = subscribeStream("notify-user", [`${uid}/subscriptions-changed`], invalidate);
    return () => {
      unsubRooms();
      unsubSubs();
    };
  }, [me?._id, queryClient]);

  return query;
}
