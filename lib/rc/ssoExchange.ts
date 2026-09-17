import { CREATE_TOKENS_FOR_USERS_SECRET, RC_INTERNAL_URL } from "@/lib/rc/config";
import { getServiceAccountSession, invalidateServiceAccountSession } from "@/lib/rc/serviceAccount";

// NOT SPIKE-TESTED end-to-end — see lib/rc/serviceAccount.ts and SCOPE.md.
// What *is* confirmed (manually, against the local dev instance while
// writing this): POST /api/v1/users.createToken with a valid caller session
// + the correct CREATE_TOKENS_FOR_USERS_SECRET does mint a working token for
// the caller's own userId. Not yet confirmed for a *different* target
// userId (the actual SSO use case), which additionally requires the caller
// to hold the `user-generate-access-token` permission — grant that to the
// service account's role via RC's Admin UI before testing this for real.

async function rcFetch(path: string, session: { authToken: string; userId: string }, init?: RequestInit) {
	return fetch(`${RC_INTERNAL_URL}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			"X-Auth-Token": session.authToken,
			"X-User-Id": session.userId,
			...init?.headers,
		},
	});
}

/** Given a Rocket.Chat username (resolved from the Keycloak identity's
 * profile — e.g. `preferred_username`), mint a real RC login token for that
 * user via the service account. Throws if the username doesn't exist in RC
 * (this wrapper does NOT auto-provision RC users from Keycloak — that's a
 * separate, larger decision left for whoever sets this up for real) or if
 * CREATE_TOKENS_FOR_USERS_SECRET isn't configured identically on both sides. */
export async function exchangeKeycloakUserForRcToken(rcUsername: string): Promise<{ authToken: string; userId: string }> {
	if (!CREATE_TOKENS_FOR_USERS_SECRET) {
		throw new Error("CREATE_TOKENS_FOR_USERS_SECRET is not set on the wrapper — cannot exchange for an RC token.");
	}

	let service = await getServiceAccountSession();

	let lookupRes = await rcFetch(`/api/v1/users.info?username=${encodeURIComponent(rcUsername)}`, service);
	if (lookupRes.status === 401) {
		// Service account token may have been revoked/expired server-side; one retry with a fresh login.
		invalidateServiceAccountSession();
		service = await getServiceAccountSession();
		lookupRes = await rcFetch(`/api/v1/users.info?username=${encodeURIComponent(rcUsername)}`, service);
	}
	const lookupBody = await lookupRes.json().catch(() => null);
	if (!lookupRes.ok || !lookupBody?.user?._id) {
		throw new Error(`Could not resolve Rocket.Chat user "${rcUsername}": ${JSON.stringify(lookupBody)}`);
	}
	const targetUserId: string = lookupBody.user._id;

	const tokenRes = await rcFetch(`/api/v1/users.createToken`, service, {
		method: "POST",
		body: JSON.stringify({ userId: targetUserId, secret: CREATE_TOKENS_FOR_USERS_SECRET }),
	});
	const tokenBody = await tokenRes.json().catch(() => null);
	if (!tokenRes.ok || !tokenBody?.data?.authToken) {
		throw new Error(`users.createToken failed for ${rcUsername}: ${JSON.stringify(tokenBody)}`);
	}

	return { authToken: tokenBody.data.authToken, userId: tokenBody.data.userId };
}
