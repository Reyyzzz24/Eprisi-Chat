# Upgrading the Rocket.Chat version

This wrapper's entire value proposition (per `WRAPPER_PROMPT.md`) is that upgrading Rocket.Chat
should be "change one image tag," not a rebuild-from-source. This document is how to actually do
that safely, given what this project has already learned the hard way about trusting RC's public
docs/API contracts at face value.

## Why this needs care, not just a tag bump

Three separate REST/DDP behaviors documented in `spike/RESULTS.md`/`SCOPE.md` turned out to differ
from what Rocket.Chat's own docs (and this project's original prompt) assumed, and were only found
by reading rc-fork's actual source for the pinned version:

1. `GET /api/v1/info` doesn't exist — the real path is `GET /api/info` (different API namespace).
2. `POST /api/v1/rooms.upload/:rid` doesn't exist — the real path is `POST /api/v1/rooms.media/:rid`,
   with a different response shape than assumed.
3. The typing indicator isn't `stream-notify-room` on key `<rid>/typing` with a boolean — it's key
   `<rid>/user-activity` with an `activityTypes: string[]` payload.

Nothing guarantees a future Rocket.Chat version won't change (or revert) any of these again. Treat
every REST path, DDP stream key, and payload shape in this codebase as **specific to 8.8.1**, not
as Rocket.Chat's stable public contract, until re-verified.

## Steps

1. **Read the release notes** for every version between the current pin and the target, specifically
   for: REST API changes, DDP/streamer changes, any changes to `chat.*`, `rooms.*`,
   `subscriptions.get`, `settings.public`, `users.createToken`, and the licensing/cloud-registration
   behavior (`ee/server/lib/license/airGappedRestrictions.ts` in rc-fork's source — see `DEPLOY.md`
   finding #3).
2. **Re-run every spike.** The spikes are disposable but the pattern is reusable:
   ```bash
   cd spike
   RC_ADMIN_PASS=<your local admin password> RC_BASE_URL=http://localhost:3000 \
     yarn tsx 01-info-and-login.ts
   # ...repeat for 04, 07, 08, 11, 15, 16 (and 17/18 if you kept them)
   ```
   Compare the new output against the existing `NN-RESULT.md` files. Any divergence is a real
   finding — update `spike/RESULTS.md` and the corresponding app code (`lib/rc/rest.ts`,
   `lib/rc/allowlist.ts`, `hooks/useTyping.ts`, etc.), don't just note it and move on.
3. **Check `GET /api/info`** manually against the new version — confirm the `version` field matches
   what you expect and the response shape is unchanged.
4. **Re-run the GATE 5 realtime tests**: two distinct identities, real message send/receive, a
   forced reconnect (see `lib/rc/ddp.ts`'s `RECONNECT_OPTIONS` comment — re-verify the library's
   default `retryCount` hasn't changed in a way that reopens that bug).
5. **Re-run `yarn visual-diff`** (GATE 6/7) — an RC upgrade shouldn't change our own UI, but a
   settings-shape change (`Assets_logo`, `Site_Name`) could break branding fetch silently.
6. **Update the pin** in `docker-compose.yml` (`rocketchat` service's `image:` tag) and this
   project's own version matrix in `README.md`.
7. **Rebuild and re-run the GATE 8 container end-to-end test** (see `DEPLOY.md`) — don't just trust
   that the wrapper's own image needs no changes; confirm it against the new RC version in a real
   container, not just local `yarn dev`.
8. Only after all of the above pass, deploy the new `rocketchat` tag to Dokploy.

## What does NOT need to change on an RC upgrade

Per the whole point of this architecture: `eprisi-chat-web`'s own Docker image does not need to be
rebuilt just because Rocket.Chat's version changed, *unless* step 2–5 above found an actual code
change is needed. If the spikes all pass unchanged, only `docker-compose.yml`'s `rocketchat` image
tag moves.
