// Server-side only. RC_INTERNAL_URL must never be exposed to the browser —
// it's the docker-compose-internal address, not resolvable outside that
// network, and no reason to leak it even if it were.
export const RC_INTERNAL_URL = process.env.RC_INTERNAL_URL || "http://localhost:3000";

// Shared secret with the Rocket.Chat server for POST /api/v1/users.createToken
// (see server/meteor-methods/auth/createToken.ts in rc-fork — this must be
// set as the *same* value in the CREATE_TOKENS_FOR_USERS_SECRET env var on
// the Rocket.Chat container itself; see docker-compose.yml GATE 8 and
// SECURITY.md for the threat model). Deliberately not validated/thrown on
// here at import time — routes that need it check explicitly so the rest of
// the app can boot without SSO configured (password login still works).
export const CREATE_TOKENS_FOR_USERS_SECRET = process.env.CREATE_TOKENS_FOR_USERS_SECRET;

// Browser-facing RC origin — used to build URLs the browser will actually
// load (logo image src, links to RC's own /admin, /account/tokens, etc.).
// Distinct from RC_INTERNAL_URL: in production these are different hosts
// (docker-internal vs. public domain); in local dev they happen to be the
// same address.
export const RC_PUBLIC_URL = process.env.NEXT_PUBLIC_RC_PUBLIC_URL || "http://localhost:3000";
