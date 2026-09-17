import { NextResponse } from "next/server";
import { z } from "zod";

import { RC_INTERNAL_URL } from "@/lib/rc/config";
import { setSession } from "@/lib/rc/session";

const bodySchema = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});

// Confirmed against rc-fork (spike #2): POST /api/v1/login with
// {user, password} -> {status:"success", data:{userId, authToken, me}}.
// 2FA: RC responds with a distinct error shape (error: "totp-required" or
// similar `error.error`/`error.details` field, method dependent) — the
// client resubmits the same request with X-2fa-code / X-2fa-method headers.
// This route stays a thin, faithful proxy of that contract rather than
// reinventing it, so the frontend's error handling can match RC's own shape.
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const twoFactorCode = request.headers.get("x-2fa-code");
  const twoFactorMethod = request.headers.get("x-2fa-method");

  const rcRes = await fetch(`${RC_INTERNAL_URL}/api/v1/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(twoFactorCode ? { "X-2fa-code": twoFactorCode } : {}),
      ...(twoFactorMethod ? { "X-2fa-method": twoFactorMethod } : {}),
    },
    body: JSON.stringify(parsed.data),
  });

  const rcBody = await rcRes.json().catch(() => null);

  if (!rcRes.ok || rcBody?.status !== "success") {
    // Pass through RC's error shape as-is (redacted of nothing sensitive —
    // login failures don't echo the password back) so the UI can detect
    // "totp-required" the same way it would talking to RC directly.
    return NextResponse.json(rcBody ?? { success: false, error: "Login failed" }, { status: rcRes.status || 401 });
  }

  await setSession({ authToken: rcBody.data.authToken, userId: rcBody.data.userId });

  // Never echo the authToken back to the client body — it already lives in
  // the httpOnly cookie. The DDP-facing token is fetched separately via
  // GET /api/rc/session/ddp-token, once, into memory. See SECURITY.md.
  return NextResponse.json({
    success: true,
    data: { userId: rcBody.data.userId, me: rcBody.data.me },
  });
}
