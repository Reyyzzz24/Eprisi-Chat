import type { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

import { setSession } from "@/lib/rc/session";
import { exchangeKeycloakUserForRcToken } from "@/lib/rc/ssoExchange";

const keycloakConfigured = Boolean(
	process.env.KEYCLOAK_CLIENT_ID && process.env.KEYCLOAK_CLIENT_SECRET && process.env.KEYCLOAK_ISSUER,
);

// Auth.js here is used ONLY to perform the Keycloak OAuth handshake — its
// own session/JWT is not this app's source of truth. Once Keycloak sign-in
// succeeds, the `signIn` callback immediately exchanges it for a real RC
// session (see lib/rc/ssoExchange.ts) and writes THIS wrapper's own
// `rc_session` cookie — that's what every other route actually reads.
// UNTESTED end-to-end — see SCOPE.md / lib/rc/ssoExchange.ts.
export const authOptions: NextAuthOptions = {
	providers: keycloakConfigured
		? [
				KeycloakProvider({
					clientId: process.env.KEYCLOAK_CLIENT_ID!,
					clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
					issuer: process.env.KEYCLOAK_ISSUER,
				}),
			]
		: [],
	callbacks: {
		async signIn({ profile }) {
			// Keycloak's profile includes `preferred_username`, which NextAuth's
			// generic `Profile` type doesn't declare.
			const rcUsername = (profile as { preferred_username?: string } | undefined)?.preferred_username;
			if (!rcUsername || typeof rcUsername !== "string") {
				return false;
			}
			try {
				const rcSession = await exchangeKeycloakUserForRcToken(rcUsername);
				await setSession(rcSession);
				return true;
			} catch (err) {
				console.error("Keycloak -> RC token exchange failed", err);
				return false;
			}
		},
	},
	pages: {
		// Route users back to our own login page (which shows the "Login with
		// Keycloak" button in the first place) instead of Auth.js's default
		// unstyled page, for both errors and the sign-in entry point.
		signIn: "/login",
		error: "/login",
	},
};

export const isKeycloakConfigured = keycloakConfigured;
