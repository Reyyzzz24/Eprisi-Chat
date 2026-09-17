# SCOPE — Eprisi Chat v1.2

This is the GATE 2 scope contract, revised from `WRAPPER_PROMPT.md`'s original MVP list based on what `spike/RESULTS.md` (GATE 1) actually confirmed against a live Rocket.Chat 8.8.1 instance. Where a feature wasn't one of the 16 explicitly-spiked items, that's called out — "confirmed" only means an endpoint was actually called and returned the expected shape, not that it's assumed to work by convention.

## Built in wrapper — confirmed by spike

| Feature | Endpoint(s) / stream(s) | Status |
|---|---|---|
| Password login + logout + session | `POST /api/v1/login`, `POST /api/v1/logout` | **Confirmed** (spike #2) |
| Keycloak SSO | Wrapper-side Keycloak login (Auth.js) + BFF exchange via `POST /api/v1/users.createToken` (option (a), user decision GATE 1) | **Not yet spike-tested** — this exact endpoint wasn't one of the 16 items (the original SSO spike tested RC's own OAuth handler, which this approach bypasses entirely). Add a dedicated spike for `users.createToken` at the start of GATE 4, before building the real flow. |
| Room list (channels) with unread & sorting | `GET /api/v1/rooms.get`, `GET /api/v1/subscriptions.get` | **Confirmed** for public channels (spike #4). |
| Message history + backward pagination | `GET /api/v1/channels.history`, `GET /api/v1/groups.history` | **Confirmed** for both channels (spike #5) and private groups (**GATE 5**, ad-hoc verification — created a real private group, sent a message, fetched its history successfully). `im.history` (DM) remains untested — no DM exists on this instance to test against; same endpoint family, treat as unverified until a real DM is exercised. |
| Realtime incoming messages | DDP `stream('room-messages', [rid], cb)` | **Confirmed** (spike #7), and re-confirmed live in GATE 5 with a genuinely different sending identity (not just the same session echoing to itself). |
| Send text message | `POST /api/v1/chat.sendMessage` | **Confirmed** (spike #6) |
| Edit / delete message | `POST /api/v1/chat.update`, `POST /api/v1/chat.delete` | **Confirmed in GATE 5** — both called against a real message in a real private group and succeeded (edit changed the text, delete removed it). |
| Markdown rendering | `@rocket.chat/message-parser` | **Confirmed** (spike #16) — all needed AST node types produced correctly. Bonus: REST message responses already embed a pre-parsed `md` field; reuse it instead of re-parsing where present, per RESULTS.md's note. **GATE 5 finding**: date fields (`ts`, `_updatedAt`) are NOT serialized the same way on REST vs. DDP — REST uses plain ISO strings, DDP uses EJSON `{ $date: <ms> }` objects. Unhandled, this renders "Invalid Date" for every realtime-delivered message. `hooks/useRoomMessages.ts`'s `normalizeMessage()` fixes this before messages enter the shared cache. |
| File/image upload & display | `POST /api/v1/rooms.media/:rid` | **Confirmed** (spike #11) — note this is *not* the path WRAPPER_PROMPT.md documented (`rooms.upload`); real path confirmed from source |
| File/avatar download | `GET /avatar/{username}`, `GET /file-upload/{id}/{name}` | **Confirmed** (spike #12) — both work with `X-Auth-Token`/`X-User-Id` headers, no query-param tokens needed |
| Emoji reaction | `POST /api/v1/chat.react` | **Confirmed** (spike #13) |
| Typing indicator | DDP method call `stream-notify-room` on key `<rid>/user-activity`, payload `(username, activityTypes: string[], extras)` — **corrected in GATE 5**, see `spike/RESULTS.md`'s GATE 5 addendum; the shape originally documented here (`<rid>/typing`, boolean) never worked, even between two distinct identities | **Confirmed working** — re-verified in GATE 5 with two genuinely distinct, independently authenticated RC identities (`spike/17-typing-user-activity.ts`), and live in the browser UI via `hooks/useTyping.ts`. Still the one deliberate DDP-method exception to REST-only actions (no REST equivalent exists). |
| Presence (online/away/offline) | `notify-logged/user-status`, payload `[uid, username, statusCode, statusText, name, roles, statusSource, statusExpiresAt]` | **Confirmed** in GATE 5 (`spike/18-presence.ts`) with two distinct identities — event fires correctly. Caveat found during this test: the status code reflects live *connection* presence, not just the stored preference — a user with no active DDP session reports as offline (code 0) even after setting their preference to "away" via REST, since they have no live session for that preference to apply to. Not a wrapper bug; document this for GATE 7 UI (don't expect `users.setStatus` alone to move a disconnected user's dot). |
| Search messages in room | `GET /api/v1/chat.search` | **Confirmed** (spike #14) |
| Own profile (avatar, name, status) | `GET /api/v1/me` (confirmed via spike #15's rate-limit test), avatar via `GET /avatar/{username}` (confirmed) | Read path confirmed. Update path (`POST /api/v1/users.setAvatar`, `users.setStatus`, etc.) **not spike-tested**. |
| Responsive desktop + mobile | N/A — frontend concern | Deferred to GATE 6/7 implementation, not applicable to spike |

## Cut from MVP — technical reason

None of the originally-listed MVP features were cut outright. The one at risk (typing indicator) was kept as a documented exception rather than cut — see table above and the user's GATE 2 decision.

## Diverted to Rocket.Chat's own UI — by design, not spiked

These were never intended to be rebuilt (see `WRAPPER_PROMPT.md`'s original scope section) and GATE 1 didn't test them — the wrapper links out to Rocket.Chat's own hostname for all of these:

- Admin panel — `${NEXT_PUBLIC_RC_PUBLIC_URL}/admin`
- Setup wizard — `${NEXT_PUBLIC_RC_PUBLIC_URL}/setup-wizard`
- Marketplace / Apps — `${NEXT_PUBLIC_RC_PUBLIC_URL}/admin/marketplace`
- Omnichannel / LiveChat agent console — `${NEXT_PUBLIC_RC_PUBLIC_URL}/omnichannel`
- Personal Access Token management — `${NEXT_PUBLIC_RC_PUBLIC_URL}/account/tokens`

## Out of scope for v1.2 — explicit, per WRAPPER_PROMPT.md

Unchanged from the original prompt; GATE 1 found no reason to revisit any of these:

- E2E Encryption — rooms with E2EE must show "open in Rocket.Chat" or have E2EE disabled workspace-wide
- Video/audio conference (Jitsi/WebRTC/VoIP)
- UIKit interactive blocks from marketplace apps
- Mobile push notifications
- Threads & discussions (candidate for v1.3)
- Voice messages

## Rough estimate per feature area

Order-of-magnitude only, not a committed schedule — for sizing GATE 3 onward against the confirmed-vs-unverified split above.

| Area | Estimate | Why |
|---|---|---|
| Auth + BFF (GATE 4) | Medium | Password path is fully confirmed and simple; Keycloak path (option a) needs its own spike for `users.createToken` first, plus real threat-modeling for the service-account admin credential |
| Realtime + data layer (GATE 5) | Large | DDP mechanics confirmed solid, but unverified areas (groups/DM history, edit/delete, presence, typing two-user retest) all land here — expect this gate to also do the remaining verification spikes GATE 1 didn't cover |
| Login page (GATE 6) | Small | Pure UI work against an already-confirmed auth backend |
| Dashboard shell + room (GATE 7) | Large | Most UI surface area; also where "no REST for typing" and any other gaps get felt directly in UX |
| Docker/compose (GATE 8) | Small–Medium | Standard Next.js standalone build; main risk is Traefik WebSocket upgrade config for DDP, not spiked here (infra, not API) |
