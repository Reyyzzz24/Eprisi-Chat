import { NextResponse } from "next/server";

import { getSession } from "@/lib/rc/session";

// Returns the raw RC authToken/userId so the client can call
// sdk.account.loginWithToken(...) for the DDP connection. This is the ONE
// deliberate exception to "never expose the token to JS" — DDP's browser
// SDK has no way to authenticate via an httpOnly cookie, since it isn't a
// plain HTTP request. The client must hold this in memory only (a React
// context/state, never localStorage/sessionStorage) and re-fetch it after
// every page reload rather than persisting it itself. See SECURITY.md.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: session });
}
