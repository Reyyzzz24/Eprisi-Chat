import { RC_INTERNAL_URL } from "@/lib/rc/config";

// A dedicated Rocket.Chat account the BFF uses ONLY to (a) look up which RC
// user corresponds to a Keycloak-authenticated identity, and (b) call
// users.createToken on that user's behalf (which requires the caller to
// either *be* the target user, or hold the `user-generate-access-token`
// permission — grant that permission to this account's role via RC's Admin
// UI, not via code). See SECURITY.md for the full threat model of this
// credential: what it can do, and why it's narrower in scope than a full
// admin session even though it's still a real secret to protect.
//
// NOT SPIKE-TESTED end-to-end (no real Keycloak instance exists in this
// environment) — verify this path for real before relying on it. See
// SCOPE.md's GATE 1 carry-over note.

const SERVICE_ACCOUNT_USER = process.env.RC_SERVICE_ACCOUNT_USER;
const SERVICE_ACCOUNT_PASS = process.env.RC_SERVICE_ACCOUNT_PASS;

let cached: { authToken: string; userId: string } | null = null;

async function login(): Promise<{ authToken: string; userId: string }> {
	if (!SERVICE_ACCOUNT_USER || !SERVICE_ACCOUNT_PASS) {
		throw new Error(
			"RC_SERVICE_ACCOUNT_USER/RC_SERVICE_ACCOUNT_PASS are not set — Keycloak SSO exchange cannot function without them.",
		);
	}
	const res = await fetch(`${RC_INTERNAL_URL}/api/v1/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user: SERVICE_ACCOUNT_USER, password: SERVICE_ACCOUNT_PASS }),
	});
	const body = await res.json().catch(() => null);
	if (!res.ok || body?.status !== "success") {
		throw new Error(`Service account login failed: ${JSON.stringify(body)}`);
	}
	return { authToken: body.data.authToken, userId: body.data.userId };
}

/** Returns a cached service-account session, re-logging in on first use or
 * after a 401 (the caller should call `invalidateServiceAccountSession()`
 * and retry once if a request using this session comes back unauthorized —
 * this module doesn't retry automatically to avoid masking a real
 * misconfiguration as a transient failure). */
export async function getServiceAccountSession(): Promise<{ authToken: string; userId: string }> {
	if (!cached) {
		cached = await login();
	}
	return cached;
}

export function invalidateServiceAccountSession(): void {
	cached = null;
}
