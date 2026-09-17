"use client";

import { useCallback, useEffect, useState } from "react";

import { callDdpMethod, subscribeStream } from "@/lib/rc/ddp";

// GATE 5 finding — corrects WRAPPER_PROMPT.md's original spike #10
// assumption. Traced against rc-fork source
// (app/ui/client/lib/UserAction.ts + app/utils/client/lib/SDKClient.ts):
// the real mechanism is NOT `notify-room/<rid>/typing` with a boolean — RC's
// own client sends `sdk.publish('notify-room', [rid+'/user-activity', ...])`,
// which is `callAsync('stream-notify-room', ...)` under the hood, with the
// stream key `<rid>/user-activity` and payload
// `[username, activityTypes: string[], extras]`, where the typing state is
// represented by `'user-typing'` being present/absent in `activityTypes`.
// Verified live in GATE 5 with two genuinely distinct RC identities
// (spike/gate5-typing-fixed.ts) — the originally-documented shape never
// fired in either spike #10 or GATE 5's first attempt; this one does.
//
// This is still the one deliberate DDP *method* call the wrapper makes —
// no REST equivalent exists — per SCOPE.md's documented exception.
const TYPING_ACTIVITY = "user-typing";

export function useTyping(rid: string, myUsername: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!rid) return;
    const unsubscribe = subscribeStream("notify-room", [`${rid}/user-activity`], (...args: unknown[]) => {
      const [username, activityTypes] = args as [string, string[]];
      if (username === myUsername) return;
      const typing = activityTypes.includes(TYPING_ACTIVITY);
      setTypingUsers((prev) => {
        if (typing) return prev.includes(username) ? prev : [...prev, username];
        return prev.filter((u) => u !== username);
      });
    });
    return () => {
      unsubscribe();
      setTypingUsers([]);
    };
  }, [rid, myUsername]);

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!rid || !myUsername) return;
      void callDdpMethod(
        "stream-notify-room",
        `${rid}/user-activity`,
        myUsername,
        typing ? [TYPING_ACTIVITY] : [],
        {},
      ).catch(() => {
        // best-effort — a missed typing signal isn't worth surfacing as an error
      });
    },
    [rid, myUsername],
  );

  return { typingUsers, setTyping };
}
