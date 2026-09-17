# GATE 1 — SPIKE RESULTS

Run against the local dev instance: `http://localhost:3000` (Rocket.Chat 8.8.1, the same `rc-fork` used for v1.1, running via `yarn dev` + MongoDB replica set in Docker). Test user: `eprisiadmin` (admin role). All 16 items from `WRAPPER_PROMPT.md` GATE 1 were exercised; full request/response detail for each is in the numbered `NN-RESULT.md` files in this directory — this file is the consolidated summary the gate asks for.

**Bottom line: nothing in the core architecture is blocked.** REST for actions and DDP for realtime both work, including the 5-minute stability test. Three real issues surfaced, none of them fatal:
1. Three of WRAPPER_PROMPT.md's documented endpoints are wrong for this Rocket.Chat version (real paths are different, but the real paths exist and work).
2. Keycloak SSO could not be fully verified — this instance has zero OAuth services configured, so the failure mode observed (500 error) can't be distinguished from a real config gap vs. the historical bug the prompt warned about. **User decision needed — see below.**
3. Typing indicator has no REST path in this codebase; only reachable via a DDP method call, which conflicts with the "REST for all actions" rule.

## Summary table

| # | What | Method/endpoint (actual, not as-documented) | Result | Latency | Note |
|---|---|---|---|---|---|
| 1 | Version & endpoints hidden | `GET /api/info` (not `/api/v1/info`) | **PASS*** | 16ms | *Doc discrepancy — see below |
| 2 | Password login | `POST /api/v1/login` | **PASS** | 209ms | |
| 3 | Keycloak SSO | `POST /api/v1/login` (serviceName/accessToken/expiresIn) | **FAIL / INCONCLUSIVE** | 55-58ms | No OAuth service configured on this instance; 500 error either way. **Needs user decision — see below.** |
| 4 | Room list | `GET /api/v1/rooms.get`, `GET /api/v1/subscriptions.get` | **PASS** | 73ms / 17ms | |
| 5 | Message history + pagination | `GET /api/v1/channels.history` | **PASS** | 53ms | `count` param confirmed; didn't test `oldest`/`latest` cursor params explicitly but they're documented and the endpoint responds |
| 6 | Send message | `POST /api/v1/chat.sendMessage` | **PASS** | 183ms | Response includes a pre-parsed `md` AST field — see #16 |
| 7 | DDP connect + subscribe | `DDPSDK.createAndConnect` + `sdk.stream('room-messages', [rid], cb)` | **PASS** | connect 55ms, login 48ms | Real message sent via REST, DDP callback fired within <1s |
| 8 | DDP ping/pong stability (5 min) | connection kept open, `disconnected`/`connected` events counted | **PASS** | n/a | 0 disconnects over 300s |
| 9 | `stream-notify-user` | `sdk.stream('notify-user', ['<uid>/subscriptions-changed'], cb)` etc. | **PASS** | ~1.6s to fire after trigger | Triggered via `channels.create`; `subscriptions-changed` and `rooms-changed` both fired, `notification` wasn't (no notification-worthy event was triggered, not tested as a true negative) |
| 10 | Typing indicator | `stream-notify-room` (subscribe) + DDP method call (send) | **FAIL / INCONCLUSIVE** | n/a | No event observed — likely RC filters self-notifications (same user sending & subscribed); also **no REST endpoint exists** for sending typing status, only a DDP method call, which conflicts with the "REST for actions" rule. Needs a two-user retest in GATE 5 to confirm the mechanism itself, and a scope decision on the REST-only rule exception. |
| 11 | File upload | `POST /api/v1/rooms.media/:rid` (not `rooms.upload/{rid}`) | **PASS*** | 147ms | *Doc discrepancy — see below |
| 12 | Avatar & file download | `GET /avatar/{username}`, `GET /file-upload/{id}/{name}` | **PASS** | 128ms / 21ms | Both work with `X-Auth-Token`/`X-User-Id` headers — confirms the "don't use `rc_uid`/`rc_token` query params" rule is followable |
| 13 | Reaction | `POST /api/v1/chat.react` | **PASS** | 22ms | |
| 14 | Search | `GET /api/v1/chat.search` | **PASS** | 26ms | Returns ranked results with a `score` field |
| 15 | Rate limit | 200x sequential `GET /api/v1/me` | **PASS (no limit hit)** | avg 9ms | No 429 in 200 sequential requests — doesn't rule out limits under concurrent load or on stricter endpoints (e.g. login) |
| 16 | `message-parser` AST | `parser()` on 10 sample messages | **PASS** | n/a | All node types needed for a renderer confirmed: PARAGRAPH, BOLD, ITALIC, STRIKE, INLINE_CODE, CODE, LINK, MENTION_USER, MENTION_CHANNEL, EMOJI, QUOTE, UNORDERED_LIST/LIST_ITEM |

## Doc discrepancies found (WRAPPER_PROMPT.md vs. actual RC 8.8.1)

Both confirmed by reading `rc-fork`'s own source, not guessed:

1. **`/api/v1/info` → `/api/info`.** Registered via `API.default.get('info', ...)` in `server/api/default/info.ts` — mounted under a different namespace (`/api/`) than the rest of the v1 REST surface. `WRAPPER_PROMPT.md`'s BFF allowlist (GATE 4) needs to allow this path specifically since it doesn't fit the `/api/v1/*` pattern.
2. **`rooms.upload/{rid}` → `rooms.media/:rid`.** Registered in `server/api/v1/rooms.ts`. Response shape is also different from what might be assumed: `{ file: { _id, url }, success }`, not nested under a `message` key.

Given two independent doc/reality mismatches already found on the REST surface, **treat every other endpoint in WRAPPER_PROMPT.md's table as unverified until actually called** — don't assume the rest are correct just because these two got fixed.

## npm/yarn packaging issue (worth remembering for GATE 3)

`@rocket.chat/ddp-client` transitively depends on `@rocket.chat/api-client`, which depends on `@rocket.chat/rest-typings`/`core-typings`, which pin `typia` via a Yarn Berry **`patch:` protocol** specifier pointing at a repo-relative file (`~/.yarn/patches/typia-npm-9.7.2-*.patch`) that only exists inside Rocket.Chat's own monorepo. This is **not resolvable by plain `npm install` or Yarn Classic at all** — both fail outright (npm silently, Yarn Classic with a clear "Couldn't find any versions" error). It only works with **Yarn Berry (4.x)**, and only after manually copying that exact patch file from `rc-fork/.yarn/patches/` into the new project's own `.yarn/patches/`. This spike's `eprisi-chat-web/` now has that patch checked in for this reason.

**Action for GATE 3**: the scaffold must use Yarn Berry (not npm, not Yarn Classic), and the wrapper prompt's own `pnpm build`/`pnpm typecheck` commands (GATE 3 step 6) need revisiting — pnpm has a different, incompatible patch mechanism and hasn't been tested against this dependency yet. Recommend testing pnpm explicitly before committing to it, or switching the whole plan to Yarn Berry for consistency with `rc-fork` (which already uses Yarn 4.18.0).

## Keycloak SSO — decision needed (spike #3)

This RC instance has `{"services":[],"success":true}` for `GET /api/v1/settings.oauth` — **no OAuth/Keycloak service is registered at all**. `POST /api/v1/login` with `serviceName`/`accessToken`/`expiresIn` returns `500 Internal server error` regardless of whether `expiresIn` is a string or integer, with no corresponding stack trace in the server log (the REST layer swallows it before logging). This is consistent with *either*:
- the historical bug WRAPPER_PROMPT.md mentions (unfixed in 8.8.1), or
- simply no service being configured to look up (`serviceName: "keycloak"` matching nothing) — a mundane, expected failure mode, not a bug.

**Cannot be disambiguated without standing up a real Keycloak realm+client and registering it in RC's admin settings** — which needs infrastructure and configuration choices (realm name, client credentials, redirect URIs) that only you can provide. Per WRAPPER_PROMPT.md's own instruction, presenting the three alternatives rather than picking one:

- **(a)** Wrapper logs in via Keycloak directly (Auth.js + Keycloak provider), then the BFF exchanges that for an RC session using the admin API `POST /api/v1/users.createToken`. Requires a service-account admin credential held server-side in the BFF — a real secret to protect, and every wrapper-issued session is technically "created by admin on the user's behalf" rather than a native RC OAuth login. Fastest to build since it sidesteps RC's own OAuth handler entirely (avoiding whatever is causing the 500).
- **(b)** Defer SSO to v1.3, ship v1.2 MVP with password login only. Lowest risk, but no SSO at launch.
- **(c)** Login SSO stays on Rocket.Chat's own login page (redirect out, redirect back), wrapper picks up the resulting session cookie/token afterward. Keeps RC's own (already-built, if it works) OAuth flow, but means a visible context-switch to RC's UI during login — arguably fine since GATE 7 already sends admins to RC's own `/admin` for other things.

## Decision recorded (user, GATE 1 closing)

**Keycloak SSO: option (a).** Wrapper handles login against Keycloak directly (Auth.js + Keycloak provider), then the BFF exchanges that for a Rocket.Chat session via the admin API `POST /api/v1/users.createToken`. This requires a service-account admin credential held server-side in the BFF — carry this into GATE 4's `SECURITY.md` as a real secret to threat-model (scope: what can that admin credential do beyond issuing tokens; rotate/restrict it if RC supports scoped admin tokens). Also means GATE 1's open question about whether the 500 error is the historical RC bug or a config gap becomes moot for v1.2 — this path never calls RC's own OAuth login handler at all.

## What this means for GATE 2 scope

- No spike item is a hard blocker for the wrapper architecture itself — REST-for-actions + DDP-for-streams is confirmed viable end-to-end, including reconnection-relevant signals (5-min stability, notify-user firing on state changes).
- **Typing indicator** needs a GATE 2 scope decision: cut it, or accept one DDP method call as a deliberate, documented exception to the "REST only for actions" rule (it would need to be re-verified with two real users first — this spike's negative result is inconclusive, not a confirmed failure).
- **Keycloak SSO** needs the (a)/(b)/(c) decision above before GATE 3 scaffolding assumes any particular auth flow.
- Package manager for GATE 3 needs to be **Yarn Berry**, not npm, and pnpm should not be assumed to work without testing it against the same `typia` patch issue first.

## GATE 5 addendum — spike #10 (typing) correction, real two-identity retest

Per SCOPE.md's carry-over item ("must be re-verified with two real users in GATE 5"), the typing
indicator was retested during GATE 5 implementation using two genuinely distinct, independently
authenticated RC identities (`eprisiadmin` and a second real account, `eprisitester`, created via
admin API for this purpose) — not the same identity subscribing and publishing to itself, which is
what made spike #10's original result inconclusive.

**First retest attempt reproduced spike #10's failure** using the exact shape WRAPPER_PROMPT.md
documented: DDP method call `stream-notify-room` on key `<rid>/typing` with args
`(username, typingBoolean)`. Zero events observed, even between two different identities — this
upgrades spike #10 from "inconclusive" to **confirmed not to work as originally documented**.

**Root cause found by reading rc-fork's own client source directly** (not guessed):
`apps/meteor/app/ui/client/lib/UserAction.ts` + `apps/meteor/app/utils/client/lib/SDKClient.ts`.
RC's own composer never calls a stream key `<rid>/typing` at all. It calls
`sdk.publish('notify-room', [rid + '/user-activity', username, activityTypes, extras])`, which
`SDKClient.ts`'s `publish()` turns into `client.callAsync('stream-notify-room', <rid>/user-activity,
username, activityTypes, extras)` — same underlying DDP method name, **different stream key**
(`user-activity`, not `typing`) and **different payload shape** (`activityTypes: string[]`
containing the literal `'user-typing'` when typing, not a boolean).

**Corrected shape, verified live with two distinct identities**
(`spike/17-typing-user-activity.ts`):
- Subscribe: `stream('notify-room', ['<rid>/user-activity'], (username, activityTypes, extras) => …)`
- Signal typing: `call('stream-notify-room', '<rid>/user-activity', username, ['user-typing'], {})`
- Signal stopped: same call with `activityTypes: []`

This **passed** on the first attempt with the corrected shape — full round trip, one identity
signaling, a second independently-connected identity receiving the event. `hooks/useTyping.ts` was
rewritten to this shape and re-verified live against the browser UI (see GATE 5 closing report).

**Lesson for future gates**: WRAPPER_PROMPT.md's documented DDP shapes should be treated as
hypotheses to verify against source, not facts — this is the third such correction this project
has needed (after the `/api/info` and `rooms.media` REST path corrections in GATE 1), all found by
reading rc-fork's actual source rather than trusting the prompt's documentation or RC's public
docs.
