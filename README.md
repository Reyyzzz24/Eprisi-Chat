# Eprisi Chat — v1.2 (wrapper architecture)

A separate Next.js 15 frontend that talks to an **unmodified** official Rocket.Chat image over its
REST + DDP APIs, instead of forking and restyling Rocket.Chat in place (that approach — branch
`v1.1` — is frozen; see that branch's own README for why).

## Architecture

```
Browser
  ├─ HTTPS → chat.eprisi.com (this app, Next.js)
  │    ├─ /                      App Router UI (RSC + client components)
  │    └─ /api/rc/*              BFF — allowlisted REST proxy, session httpOnly cookie
  │           └─ server-side → http://rocketchat:3000/api/*   (docker-internal network)
  └─ WSS  → private-chat.eprisi.com/websocket   (DDP, straight from the browser to RC)
```

- **BFF, not direct browser→RC fetches**: `app/api/rc/[...path]/route.ts` proxies REST calls,
  injecting the session's `X-Auth-Token`/`X-User-Id` server-side. The session itself lives in an
  httpOnly + Secure + SameSite=Lax cookie — never `localStorage`. `lib/rc/allowlist.ts` is an
  allowlist, not a blocklist: admin-dangerous endpoints are safe by omission.
- **REST for actions, DDP for realtime**: per Rocket.Chat's own guidance that DDP method calls are
  deprecated in favor of REST, every mutating action (send/edit/delete message, react, etc.) goes
  through REST; DDP (`lib/rc/ddp.ts`) is used only for subscriptions (`room-messages`,
  `notify-user`, `notify-room`) and one documented exception (typing indicator — see SCOPE.md).
- **DDP token lives in browser memory only**, fetched fresh from the BFF on each page load, never
  persisted to any Storage API — see SECURITY.md for the full threat model of why.

Full details, gate-by-gate: `spike/RESULTS.md` (GATE 1 findings), `SCOPE.md` (GATE 2 feature
contract, what's confirmed vs. cut vs. diverted to RC's own UI), `SECURITY.md` (GATE 4 threat
model), `.visual/report.json` via `yarn visual-diff` (GATE 6/7 mockup-fidelity findings), `DEPLOY.md`
(GATE 8 container/Dokploy notes).

## Rocket.Chat version matrix

| RC version | Status |
|---|---|
| **8.8.1** | **Tested.** Every spike in `spike/RESULTS.md`, all of SCOPE.md's confirmed endpoints, and the GATE 8 container end-to-end test were run against this exact version. `docker-compose.yml` pins to it. |
| Anything else | **Not tested.** See `UPGRADING.md` before changing the pinned version — several endpoint paths and payload shapes in this codebase were corrected from what Rocket.Chat's own docs/WRAPPER_PROMPT.md's original assumptions said, by reading rc-fork's actual 8.8.1 source; a version bump could silently reintroduce those same discrepancies. |

## Local development

Requires **Yarn Berry** (not npm, not Yarn Classic, not pnpm — see spike/RESULTS.md's packaging
note: a transitive dependency pins a Yarn-Berry-only `patch:` protocol specifier).

```bash
corepack enable
corepack prepare yarn@4.18.0 --activate
yarn install
cp .env.example .env.local   # fill in RC_INTERNAL_URL etc. for your local RC instance
yarn dev
```

Needs a running Rocket.Chat instance to talk to (the `rc-fork` dev setup documented in this
workspace's own memory, or the `docker-compose.yml` stack in this repo, work equally well — just
point `RC_INTERNAL_URL`/`NEXT_PUBLIC_RC_WS_URL`/`NEXT_PUBLIC_RC_PUBLIC_URL` at whichever one you're
running).

```bash
yarn typecheck     # tsc --noEmit
yarn build         # production build
yarn visual-diff   # GATE 6/7 mockup-fidelity screenshots + pixel diff (needs VISUAL_DIFF_ADMIN_PASS)
```

## Deploying

See `DEPLOY.md` for the full Dockerfile/compose/Dokploy walkthrough, including two real findings
from actually running the container stack end-to-end (not just reading the Dockerfile): why
`NEXT_PUBLIC_*` env vars must be set at `docker build` time (not just in compose's `environment:`),
and why Rocket.Chat can outright block message-sending on a workspace that can't reach
`cloud.rocket.chat`.

## Status

- GATE 0 — repo/branch setup: done
- GATE 1 — API spike: done (`spike/RESULTS.md`)
- GATE 2 — scope contract: done (`SCOPE.md`)
- GATE 3 — scaffold & design system: done
- GATE 4 — auth & BFF: done (`SECURITY.md`)
- GATE 5 — realtime & data layer: done
- GATE 6 — login page (mockup fidelity): done
- GATE 7 — dashboard shell & room (mockup fidelity): done
- GATE 8 — Docker & compose: done (`DEPLOY.md`)
- GATE 9 — push & documentation: this commit

See `v1.1`'s README for the frozen fork-based approach this pivot replaced.
