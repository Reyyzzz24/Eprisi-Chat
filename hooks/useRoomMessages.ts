"use client";

import type { IMessage } from "@rocket.chat/core-typings";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribeStream } from "@/lib/rc/ddp";
import { rcRest, type RoomType } from "@/lib/rc/rest";

const PAGE_SIZE = 50;

type MessagesData = { pages: IMessage[][]; pageParams: unknown[] };

function tsOf(msg: IMessage): number {
  return new Date(msg.ts as unknown as string).getTime();
}

// GATE 5 finding (not previously documented in RESULTS.md/SCOPE.md):
// REST responses (chat.sendMessage, channels.history) serialize dates as
// plain ISO strings, but DDP stream payloads serialize them as EJSON
// `{ $date: <ms> }` objects (confirmed against a live message in
// spike/07-RESULT.md's own logged payload). Left unnormalized, `new
// Date(...)` on a DDP-sourced message renders "Invalid Date" in the UI —
// reproduced during GATE 5's realtime test. Every message coming off a DDP
// stream must be normalized to the REST shape before entering the cache, so
// nothing downstream needs to know the two sources disagree.
function normalizeDate(value: unknown): string {
  if (value && typeof value === "object" && "$date" in (value as Record<string, unknown>)) {
    return new Date((value as { $date: number }).$date).toISOString();
  }
  if (typeof value === "string") return value;
  return new Date(value as string | number).toISOString();
}

function normalizeMessage(msg: IMessage): IMessage {
  return {
    ...msg,
    ts: normalizeDate(msg.ts) as unknown as IMessage["ts"],
    ...(msg._updatedAt ? { _updatedAt: normalizeDate(msg._updatedAt) as unknown as IMessage["_updatedAt"] } : {}),
  };
}

/** Paginated (backward, per WRAPPER_PROMPT.md GATE 5) + realtime room
 * message feed. Combines a React Query `useInfiniteQuery` for REST history
 * with a DDP `room-messages` subscription that writes into the SAME cache
 * key, so there's exactly one source of truth per WRAPPER_PROMPT.md's
 * explicit requirement — not two parallel stores that can drift.
 *
 * Dedup strategy for the documented "message can arrive twice" case (REST
 * response to our own send + the DDP echo of that same send): the optimistic
 * send mutation inserts a `temp-*` placeholder; both the mutation's own
 * `onSuccess` and the DDP handler below reconcile that placeholder by id
 * first, then by (temp + matching text) as a fallback for whichever of the
 * two arrives first. A message already present by real `_id` is replaced
 * in place, never duplicated. */
export function useRoomMessages(rid: string, type: RoomType) {
  const queryClient = useQueryClient();
  const queryKey = ["room-messages", rid] as const;

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const res = await rcRest.history(type, rid, { count: PAGE_SIZE, latest: pageParam });
      return [...res.messages].sort((a, b) => tsOf(a) - tsOf(b));
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.length > 0 ? (lastPage[0].ts as unknown as string) : undefined),
    enabled: Boolean(rid),
  });

  useEffect(() => {
    if (!rid) return;
    const reconcile = (incoming: IMessage) => {
      queryClient.setQueryData<MessagesData>(queryKey, (old) => {
        if (!old) return old;
        let replaced = false;
        const pages = old.pages.map((page) =>
          page.map((m) => {
            if (replaced) return m;
            if (m._id === incoming._id) {
              replaced = true;
              return incoming;
            }
            if (String(m._id).startsWith("temp-") && m.msg === incoming.msg) {
              replaced = true;
              return incoming;
            }
            return m;
          }),
        );
        if (replaced) return { ...old, pages };
        const last = pages[pages.length - 1] ?? [];
        const nextPages = [...pages.slice(0, -1), [...last, incoming]];
        return { ...old, pages: nextPages };
      });
    };

    const unsubscribe = subscribeStream("room-messages", [rid], (incoming: unknown) => {
      reconcile(normalizeMessage(incoming as IMessage));
    });
    return unsubscribe;
  }, [rid, queryClient]);

  const sendMessage = useMutation({
    mutationFn: (text: string) => rcRest.sendMessage(rid, text),
    onMutate: async (text: string) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic = {
        _id: tempId,
        rid,
        msg: text,
        ts: new Date().toISOString(),
        u: { _id: "pending", username: "…" },
      } as unknown as IMessage;
      queryClient.setQueryData<MessagesData>(queryKey, (old) => {
        if (!old) return old;
        const pages = [...old.pages];
        pages[pages.length - 1] = [...(pages[pages.length - 1] ?? []), optimistic];
        return { ...old, pages };
      });
      return { tempId };
    },
    onSuccess: (res, _text, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData<MessagesData>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => page.map((m) => (m._id === ctx.tempId ? res.message : m))),
        };
      });
    },
    onError: (_err, _text, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData<MessagesData>(queryKey, (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page) => page.filter((m) => m._id !== ctx.tempId)) };
      });
    },
  });

  const editMessage = useMutation({
    mutationFn: ({ msgId, text }: { msgId: string; text: string }) => rcRest.updateMessage(rid, msgId, text),
    onSuccess: (res) => {
      queryClient.setQueryData<MessagesData>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => page.map((m) => (m._id === res.message._id ? res.message : m))),
        };
      });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (msgId: string) => rcRest.deleteMessage(rid, msgId),
    onSuccess: (_res, msgId) => {
      queryClient.setQueryData<MessagesData>(queryKey, (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page) => page.filter((m) => m._id !== msgId)) };
      });
    },
  });

  return {
    ...query,
    sendMessage: sendMessage.mutate,
    sending: sendMessage.isPending,
    editMessage: editMessage.mutate,
    deleteMessage: deleteMessage.mutate,
  };
}
