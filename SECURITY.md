# Security notes — GATE 4 (Auth & BFF)

Threat model and design rationale for the authentication/session layer built in GATE 4.
Written for whoever operates this in production (GATE 8) and for future gates that touch
auth — read this before changing `lib/rc/session.ts`, `lib/rc/proxyFetch.ts`,
`lib/rc/allowlist.ts`, or anything under `lib/rc/ssoExchange.ts` / `lib/rc/serviceAccount.ts`.

## 1. Where credentials live

| Credential | Lives | Never | Verified |
|---|---|---|---|
| RC `authToken` + `userId` (password login) | `rc_session` cookie, httpOnly + `Secure` (prod) + `SameSite=Lax`, server-set only | Not in `localStorage`/`sessionStorage`, not in the JSON response body, not in a URL | Confirmed manually (GATE 4 proof): cookie has `HttpOnly`+`Secure`+`SameSite=Lax` flags; login/logout response bodies never echo the token; `document.cookie` cannot see it; `localStorage`/`sessionStorage` stay empty across login |
| DDP-facing token (for the realtime client, GATE 5) | Fetched by the browser from `/api/rc/session/ddp-token` and held **only in JS memory** (a module-level variable / React context), for the life of the tab | Never written to any Storage API, never in the URL | Design decision per WRAPPER_PROMPT.md hard rule; re-fetched from the BFF on page reload rather than persisted, so a reload costs one extra round trip in exchange for not persisting a bearer token client-side |
| RC service-account credentials (`RC_SERVICE_ACCOUNT_USER/PASS`) | Server env only, cached in-memory (`lib/rc/serviceAccount.ts`) as an authToken, never written to disk or logs | Never sent to the browser | Login flow confirmed; the full SSO exchange path is NOT spike-tested end-to-end (no Keycloak instance available in this environment — see SCOPE.md) |
| `CREATE_TOKENS_FOR_USERS_SECRET` | Server env only, sent as a request body field directly to RC's `users.createToken`, RC-side to RC-side | Never sent to the browser, never logged | Confirmed working locally: `users.createToken` mints a real token for a target `userId` given the correct secret |

## 2. Why the DDP token is memory-only, not cookie-based

The REST-facing session cookie is httpOnly by design — JS on the page can't read it, which is
exactly right for a value only ever used server-side by our own Route Handlers. But the DDP
client (GATE 5) runs *in the browser* and needs the raw token to authenticate its WebSocket
connection directly with Rocket.Chat — an httpOnly cookie can't serve that purpose at all, and a
non-httpOnly cookie would make the token readable by any XSS on the page and would piggyback it
onto every request whether needed or not. Keeping it in a plain JS variable means: it's exactly
as exposed to XSS as any other in-page secret would be (no framework can fully prevent that — see
CSP below), it disappears completely on tab close or reload, and it never touches a Storage API
that browser extensions, other tabs, or `Application` tab inspection can casually enumerate.

## 3. The allowlist proxy (`lib/rc/allowlist.ts` + `lib/rc/proxyFetch.ts`)

`app/api/rc/[...path]/route.ts` is a generic proxy, but it only forwards requests whose path
matches `isAllowedRcPath()` — an allowlist, not a blocklist. This is deliberate: every dangerous
admin surface (`settings.*`, `admin.*`, `users.create`/`.delete`, `permissions.*`,
`integrations.*`, etc.) is safe **by omission**, not because someone remembered to block it. A
regular authenticated user's session cookie can reach the RC endpoints in
`ALLOWED_EXACT`/`ALLOWED_PREFIXES` and nothing else, regardless of what path is requested —
confirmed in GATE 4 proof testing (`v1/settings`, `v1/users.create` both 404 through the proxy;
`v1/me` succeeds). Extending the allowlist is the only way to expose a new RC endpoint through
this wrapper; do it only when a feature backed by that endpoint is actually being built (per
SCOPE.md), never preemptively.

Two endpoint families intentionally bypass the `/api/rc/` namespace entirely
(`app/api/rc-avatar/[username]/route.ts`, `app/api/rc-file/[...path]/route.ts`) because RC serves
avatars/file downloads outside `/api/` — they still require a valid session and proxy through the
same credential-handling path, just under different route prefixes.

## 4. The Keycloak SSO exchange — a genuinely elevated credential

`lib/rc/serviceAccount.ts` + `lib/rc/ssoExchange.ts` implement GATE 1's decision (a): the wrapper
authenticates the user via Keycloak (an OAuth handshake only — Auth.js's own session/JWT is
discarded, not used as this app's source of truth), then uses a dedicated RC **service account**
to look up the corresponding RC user (`users.info`) and mint a real RC token for them
(`users.createToken` + `CREATE_TOKENS_FOR_USERS_SECRET`).

This service account is a real secret with real reach, even though it is narrower than a full RC
admin session:

- It must hold the `user-generate-access-token` permission (grant via RC's Admin UI, not code) —
  this specific permission lets it mint a login token for **any** RC user, which is equivalent to
  being able to log in as anyone. Treat compromise of this account's credentials, or of
  `CREATE_TOKENS_FOR_USERS_SECRET`, as full account-takeover risk across every RC user, not just
  a single-account compromise.
- It does not need, and must not be granted, any broader admin permission (`admin.*` UI access,
  `settings.*`, etc.) beyond what `user-generate-access-token` requires.
- `CREATE_TOKENS_FOR_USERS_SECRET` must match between the wrapper's env and RC's own env var of
  the same name — treat it with the same handling as a database password (secret store in
  Dokploy at GATE 8, never committed, never logged).
- This wrapper does **not** auto-provision RC accounts from Keycloak identities — a
  Keycloak-authenticated user with no matching RC username by design fails closed
  (`exchangeKeycloakUserForRcToken` throws, `signIn` callback returns `false`). Auto-provisioning
  was explicitly left out as a separate, larger decision.
- **Not spike-tested end-to-end**: no real Keycloak instance exists in this environment. What is
  confirmed locally: `users.createToken` successfully mints a token for a *different* target
  `userId` given a valid service-account session + correct secret (this was re-verified in GATE 4
  against the local dev RC instance). What is NOT yet confirmed: the full round trip through an
  actual Keycloak login screen. Verify this for real, with a real Keycloak instance and the
  `user-generate-access-token` permission actually granted, before enabling the "Login with
  Keycloak" button in any environment users can reach.

## 5. Middleware is a routing convenience, not the security boundary

`middleware.ts` only checks whether the `rc_session` cookie is *present* — it deliberately does
not validate the token against RC (that would mean a network round trip on the Edge runtime for
every navigation). An expired or revoked token still passes middleware and only gets caught the
first time a page actually calls a BFF route, which forwards to RC and gets a real 401 back. The
actual authorization boundary is enforced per-request, in `proxyFetch.ts`, by RC itself rejecting
an invalid/expired `authToken` — not by middleware. Any new protected route must go through a BFF
route that forwards credentials to RC, not rely on middleware alone.

## 6. Other mitigations / open items

- **No `dangerouslySetInnerHTML`** is used anywhere in this codebase as of GATE 4; message content
  rendering (GATE 6) must go through `@rocket.chat/message-parser`'s structured output rather than
  raw HTML injection, to avoid reopening a stored-XSS path into the DDP-token-in-memory model
  described in §2.
- **CSP**: not yet configured at the wrapper level (RC's own API responses carry their own CSP
  header, visible in the GATE 4 proof `curl` output, but that governs RC's own pages, not ours).
  Add a strict `Content-Security-Policy` (script-src 'self', no inline scripts/styles beyond
  Next's own hashes/nonces) at the Next.js level before this goes to production — tracked as a
  GATE 8 (deploy) item.
- **Dependency audit**: not yet run against this package.json as a dedicated step; `yarn npm audit`
  (Yarn Berry) should be part of the GATE 8 deploy checklist, given this project pulls in several
  `@rocket.chat/*` packages plus their transitive `patch:`-protocol dependencies.
- **No direct MongoDB access** anywhere in this codebase — confirmed by construction: every RC
  interaction goes through `RC_INTERNAL_URL` REST calls or the DDP client, never a DB driver.
