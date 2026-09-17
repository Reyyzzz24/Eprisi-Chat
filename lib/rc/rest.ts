"use client";

import type { IMessage, IRoom, ISubscription } from "@rocket.chat/core-typings";

// Thin client over the BFF proxy (`app/api/rc/[...path]/route.ts`), never
// over RC directly — the browser has no way to reach RC's internal network
// address and no reason to: the httpOnly session cookie already goes along
// with every same-origin fetch automatically. Every path here must also
// exist in `lib/rc/allowlist.ts` or the proxy 404s it.

class RcApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function rcFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/rc/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    throw new RcApiError(body?.error ?? `Request to ${path} failed with ${res.status}`, res.status);
  }
  return body as T;
}

export { RcApiError };

export type RoomType = "c" | "p" | "d";

function historyPath(type: RoomType): string {
  if (type === "p") return "v1/groups.history";
  if (type === "d") return "v1/im.history";
  return "v1/channels.history";
}

function createPath(type: RoomType): string {
  if (type === "p") return "v1/groups.create";
  if (type === "d") return "v1/im.create";
  return "v1/channels.create";
}

export const rcRest = {
  me: () => rcFetch<{ success: true; _id: string; username: string; name?: string; [key: string]: unknown }>("v1/me"),

  roomsGet: (updatedSince?: string) =>
    rcFetch<{ success: true; update: IRoom[]; remove: IRoom[] }>(
      `v1/rooms.get${updatedSince ? `?updatedSince=${encodeURIComponent(updatedSince)}` : ""}`,
    ),

  subscriptionsGet: (updatedSince?: string) =>
    rcFetch<{ success: true; update: ISubscription[]; remove: ISubscription[] }>(
      `v1/subscriptions.get${updatedSince ? `?updatedSince=${encodeURIComponent(updatedSince)}` : ""}`,
    ),

  history: (type: RoomType, roomId: string, opts: { count?: number; oldest?: string; latest?: string } = {}) => {
    const params = new URLSearchParams({ roomId, count: String(opts.count ?? 50) });
    if (opts.oldest) params.set("oldest", opts.oldest);
    if (opts.latest) params.set("latest", opts.latest);
    return rcFetch<{ success: true; messages: IMessage[] }>(`${historyPath(type)}?${params.toString()}`);
  },

  createRoom: (type: RoomType, nameOrUsername: string) =>
    rcFetch<{ success: true; channel?: IRoom; group?: IRoom; room?: IRoom }>(createPath(type), {
      method: "POST",
      body: JSON.stringify(type === "d" ? { username: nameOrUsername } : { name: nameOrUsername }),
    }),

  sendMessage: (rid: string, msg: string) =>
    rcFetch<{ success: true; message: IMessage }>("v1/chat.sendMessage", {
      method: "POST",
      body: JSON.stringify({ message: { rid, msg } }),
    }),

  updateMessage: (roomId: string, msgId: string, text: string) =>
    rcFetch<{ success: true; message: IMessage }>("v1/chat.update", {
      method: "POST",
      body: JSON.stringify({ roomId, msgId, text }),
    }),

  deleteMessage: (roomId: string, msgId: string) =>
    rcFetch<{ success: true }>("v1/chat.delete", {
      method: "POST",
      body: JSON.stringify({ roomId, msgId }),
    }),

  react: (messageId: string, emoji: string, shouldReact: boolean) =>
    rcFetch<{ success: true }>("v1/chat.react", {
      method: "POST",
      body: JSON.stringify({ messageId, emoji, shouldReact }),
    }),

  search: (roomId: string, searchText: string, count = 20) =>
    rcFetch<{ success: true; messages: IMessage[] }>(
      `v1/chat.search?roomId=${encodeURIComponent(roomId)}&searchText=${encodeURIComponent(searchText)}&count=${count}`,
    ),

  setStatus: (status: "online" | "away" | "busy" | "offline", message?: string) =>
    rcFetch<{ success: true }>("v1/users.setStatus", {
      method: "POST",
      body: JSON.stringify({ status, message }),
    }),

  setAvatar: (avatarUrl: string) =>
    rcFetch<{ success: true }>("v1/users.setAvatar", {
      method: "POST",
      body: JSON.stringify({ avatarUrl }),
    }),

  uploadFile: (rid: string, file: File, description?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    return fetch(`/api/rc/v1/rooms.media/${encodeURIComponent(rid)}`, { method: "POST", body: form }).then(
      async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || body?.success === false) {
          throw new RcApiError(body?.error ?? `Upload failed with ${res.status}`, res.status);
        }
        return body as { success: true; file: { _id: string; url: string } };
      },
    );
  },
};
