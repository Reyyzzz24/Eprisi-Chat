"use client";

import { useEffect, useState } from "react";

import { subscribeStream } from "@/lib/rc/ddp";

export type PresenceStatus = "offline" | "online" | "away" | "busy";

// PresenceStatusCode -> label mapping per @rocket.chat/core-typings.
const STATUS_CODES: PresenceStatus[] = ["offline", "online", "away", "busy"];

/** Presence (online/away/offline) per SCOPE.md — NOT spike-tested (GATE 1
 * only confirmed the general notify-user/notify-logged mechanism works, not
 * this specific event). Uses `notify-logged/user-status`, whose payload
 * shape is taken from `@rocket.chat/ddp-client`'s own
 * `types/streams.d.ts` (`[uid, username, status, statusText, name, roles]`)
 * rather than assumed — but the event has not been triggered/observed
 * against a live instance. Verify with a real second user going
 * online/away/offline before treating this as working. */
export function usePresence() {
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});

  useEffect(() => {
    const unsubscribe = subscribeStream("notify-logged", ["user-status"], (...args: unknown[]) => {
      const [payload] = args as [[string, string, number, string?, string?]];
      if (!payload) return;
      const [, username, statusCode] = payload;
      if (!username) return;
      setPresence((prev) => ({ ...prev, [username]: STATUS_CODES[statusCode] ?? "offline" }));
    });
    return unsubscribe;
  }, []);

  return presence;
}
