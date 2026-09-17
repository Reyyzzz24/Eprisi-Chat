import { NextResponse } from "next/server";

import { RC_INTERNAL_URL } from "@/lib/rc/config";
import { clearSession, getSession } from "@/lib/rc/session";

export async function POST() {
  const session = await getSession();
  if (session) {
    // Best-effort — RC invalidates the token server-side. If this fails
    // (RC down, token already expired) we still clear our own cookie below;
    // there's no safe way to "undo" a logout the user asked for.
    await fetch(`${RC_INTERNAL_URL}/api/v1/logout`, {
      method: "POST",
      headers: { "X-Auth-Token": session.authToken, "X-User-Id": session.userId },
    }).catch(() => {});
  }
  await clearSession();
  return NextResponse.json({ success: true });
}
