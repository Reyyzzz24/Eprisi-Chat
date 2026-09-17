"use client";

import { DDPSDK } from "@rocket.chat/ddp-client";

// Module-level singleton — there is exactly one DDP connection per browser
// tab, shared by every hook that needs realtime data. Never instantiate
// DDPSDK anywhere else.
//
// Reconnect handling relies on facts read directly from
// node_modules/@rocket.chat/ddp-client/dist/Connection.d.ts (not assumed):
// - ConnectionImpl already retries the socket itself (retryOptions) and
//   emits 'connecting' | 'connected' | 'disconnected' | 'reconnecting' |
//   'close' on `sdk.connection` (it extends Emitter).
// - What it does NOT do: re-run `loginWithToken`, or recreate DDP
//   subscriptions after the socket comes back — those are server-side
//   session state that a fresh socket does not carry over. That gap is
//   exactly GATE 5's "most common realtime bug" warning from
//   WRAPPER_PROMPT.md. Fix: every time 'connected' fires (this event fires
//   on the very first connect AND on every subsequent reconnect — there is
//   no separate "first connect" event), re-auth then replay every tracked
//   subscription. Re-running loginWithToken with an already-valid token is
//   a harmless no-op from RC's side, so this is safe to do unconditionally
//   rather than trying to distinguish "first" from "Nth" connect.

export type DdpStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "closed" | "failed";

type StreamCallback = (...args: unknown[]) => void;

type TrackedSub = {
  streamName: string;
  params: unknown[];
  callback: StreamCallback;
  handle: { stop: () => void } | null;
};

// `DDPSDK.stream` is generically typed over the specific set of stream
// names RC's own event map declares (`StreamNames` in ddp-client's
// types/streams.d.ts). This module deliberately exposes a plain-string API
// so callers (hooks) aren't coupled to that internal type — every actual
// streamName used at call sites is verified against GATE 1 spike results,
// not guessed, so this cast is safe.
type UntypedStream = (name: string, params: unknown[], cb: StreamCallback) => { stop: () => void };

let sdk: DDPSDK | null = null;
let connectPromise: Promise<DDPSDK> | null = null;
let currentToken: string | null = null;
let subCounter = 0;
const trackedSubs = new Map<string, TrackedSub>();
const statusListeners = new Set<(status: DdpStatus) => void>();
let currentStatus: DdpStatus = "idle";

function setStatus(next: DdpStatus) {
  currentStatus = next;
  statusListeners.forEach((listener) => listener(next));
}

export function onDdpStatus(listener: (status: DdpStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => statusListeners.delete(listener);
}

export function getDdpStatus(): DdpStatus {
  return currentStatus;
}

function resubscribeAll(instance: DDPSDK) {
  for (const sub of trackedSubs.values()) {
    try {
      sub.handle?.stop();
    } catch {
      // socket may already be dead — ignore, we're about to replace it
    }
    sub.handle = (instance.stream as unknown as UntypedStream)(sub.streamName, sub.params, sub.callback);
  }
}

// GATE 5 finding, read directly out of node_modules/@rocket.chat/ddp-client/
// dist/Connection.js (not documented anywhere): ConnectionImpl's own
// ws.onclose handler only schedules a retry while
// `this.retryCount < retryOptions.retryCount`, and DDPSDK.createAndConnect's
// own default is `{ retryCount: 1, retryTime: 100 }` — i.e. out of the box,
// a dropped socket gets exactly ONE automatic reconnect attempt, then the
// connection is permanently dead for the rest of the tab's life with no
// further retries and no error thrown anywhere the app would notice. This
// This is precisely the class of bug WRAPPER_PROMPT.md calls out as "the most
// common realtime bug" — left at the library default, this wrapper would
// have silently stopped receiving messages after a second network blip.
// retryTime is also the *base* the library multiplies by the attempt
// number (`retryTime * retryCount`), so 1000ms here means a linear 1s, 2s,
// 3s, … backoff rather than a flat 100ms hammering the server.
const RECONNECT_OPTIONS = { retryCount: 1000, retryTime: 1000 };

async function establish(token: string): Promise<DDPSDK> {
  const wsUrl = process.env.NEXT_PUBLIC_RC_WS_URL || "ws://localhost:3000";
  const instance = await DDPSDK.createAndConnect(wsUrl, RECONNECT_OPTIONS);
  await instance.account.loginWithToken(token);

  instance.connection.on("connected", () => {
    void (async () => {
      try {
        if (currentToken) {
          await instance.account.loginWithToken(currentToken);
        }
        resubscribeAll(instance);
        setStatus("connected");
      } catch (err) {
        console.error("[ddp] re-auth/resubscribe after (re)connect failed", err);
      }
    })();
  });
  instance.connection.on("reconnecting", () => setStatus("reconnecting"));
  instance.connection.on("disconnected", () => setStatus("disconnected"));
  instance.connection.on("close", () => setStatus("closed"));

  // Covers subscriptions registered while the connection was still being
  // established (a real race on first page load, not just reconnects).
  resubscribeAll(instance);

  return instance;
}

/** Idempotent: safe to call from every hook that needs the connection — only
 * the first caller actually pays the connect+login cost. */
export async function ensureDdpConnection(token: string): Promise<DDPSDK> {
  currentToken = token;
  if (sdk) return sdk;
  if (!connectPromise) {
    setStatus("connecting");
    connectPromise = establish(token)
      .then((instance) => {
        sdk = instance;
        setStatus("connected");
        return instance;
      })
      .catch((err) => {
        connectPromise = null;
        setStatus("failed");
        throw err;
      });
  }
  return connectPromise;
}

export function disconnectDdp(): void {
  sdk?.connection.close();
  sdk = null;
  connectPromise = null;
  currentToken = null;
  trackedSubs.clear();
  setStatus("idle");
}

/** Register a DDP subscription that survives reconnects. Returns an
 * unsubscribe function. Safe to call before the connection is ready — it
 * will be attached as soon as `establish()` resolves. */
export function subscribeStream(streamName: string, params: unknown[], callback: StreamCallback): () => void {
  const key = `sub-${++subCounter}`;
  const entry: TrackedSub = { streamName, params, callback, handle: null };
  trackedSubs.set(key, entry);
  if (sdk) {
    entry.handle = (sdk.stream as unknown as UntypedStream)(streamName, params, callback);
  }
  return () => {
    trackedSubs.get(key)?.handle?.stop();
    trackedSubs.delete(key);
  };
}

/** Direct DDP method call — used ONLY for the typing indicator per
 * SCOPE.md's documented exception (no REST endpoint exists for it in this
 * RC version). Every other action must go through the REST BFF, not this. */
export async function callDdpMethod(method: string, ...params: unknown[]): Promise<unknown> {
  if (!sdk) throw new Error("DDP not connected yet");
  return sdk.call(method, ...params);
}

// GATE 5 QA-only escape hatch — lets us fault-inject a real socket drop from
// outside the page (browser DDP connects straight to RC, bypassing our own
// server, so there is no server-side lever to pull for this test). Used to
// verify the reconnect fix above by force-closing the live socket twice from
// a browser console and confirming REST-sent messages still arrived after
// each drop. Dev-only by construction (`NODE_ENV !== "production"`) so it
// never ships in a production bundle; slated for removal once this is
// exercised by an automated e2e test instead of manual QA.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __ddpDebugCloseSocket?: () => void }).__ddpDebugCloseSocket = () => {
    (sdk?.connection as unknown as { ws?: WebSocket })?.ws?.close();
  };
}
