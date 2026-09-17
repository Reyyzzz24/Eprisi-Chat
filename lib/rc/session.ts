import { cookies } from "next/headers";

// The one and only place this wrapper stores a Rocket.Chat credential
// server-side. httpOnly + Secure + SameSite=Lax — never readable from
// browser JS. See SECURITY.md for the full threat model, including why the
// DDP-facing token is handled completely separately (kept in browser memory
// only, never persisted here or anywhere else).
const COOKIE_NAME = "rc_session";

export type RcSession = { authToken: string; userId: string };

export async function getSession(): Promise<RcSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.authToken === "string" && typeof parsed?.userId === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSession(session: RcSession): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Rocket.Chat login tokens don't carry a fixed client-visible expiry we
    // can read generically; 30 days is a reasonable upper bound for the
    // cookie itself; RC will reject the underlying token independently once
    // *it* expires or is revoked, which invalidates the session regardless
    // of what this cookie's own maxAge says.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
