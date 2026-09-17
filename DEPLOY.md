# GATE 8 — Docker & Dokploy deployment notes

## Building the image

```bash
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_RC_WS_URL=wss://private-chat.eprisi.com/websocket \
  --build-arg NEXT_PUBLIC_RC_PUBLIC_URL=https://private-chat.eprisi.com \
  -t ghcr.io/reyyzzz24/eprisi-chat-web:<tag> \
  --push .
```

**The two `--build-arg` values above are not optional and not just documentation** — see the
"NEXT_PUBLIC_* are build-time, not runtime" finding below. Get them wrong and the image has to be
rebuilt, not just restarted.

## Dokploy setup

Two domains, both proxying to services already on `dokploy-network`:

| Domain | Target | Notes |
|---|---|---|
| `private-chat.eprisi.com` | `rocketchat:3000` | Must pass WebSocket upgrade (`Upgrade`/`Connection` headers) through Traefik — DDP realtime (GATE 5) depends on this. Dokploy's default HTTP proxy config passes these through; if realtime breaks in production but REST works, this is the first thing to check. |
| `chat.eprisi.com` | `eprisi-chat-web:3000` | The wrapper. Its own WebSocket usage is none — it only makes plain HTTP calls to `rocketchat:3000` internally (BFF) and the *browser* connects directly to `private-chat.eprisi.com`'s WebSocket, not through this service. |

Both behind Cloudflare **Full (strict)** per WRAPPER_PROMPT.md.

Secrets (Dokploy's secret store, never the repo or a committed `.env`):
- `SESSION_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_SECRET` — `openssl rand -base64 32` (only needed if Keycloak SSO is enabled)
- `CREATE_TOKENS_FOR_USERS_SECRET` — only if Keycloak SSO is enabled; must be set **identically**
  on both the `rocketchat` and `eprisi-chat-web` services (see SECURITY.md's threat model for
  this value — it's equivalent to an admin credential)
- `RC_SERVICE_ACCOUNT_USER` / `RC_SERVICE_ACCOUNT_PASS` — only if Keycloak SSO is enabled

## GATE 8 findings (found via an actual local container test, not assumed)

### 1. `NEXT_PUBLIC_*` env vars are build-time, not runtime

Next.js inlines `NEXT_PUBLIC_*` values into the client JS bundle at `next build` time. Setting
`NEXT_PUBLIC_RC_WS_URL`/`NEXT_PUBLIC_RC_PUBLIC_URL` in docker-compose's `environment:` block (or
Dokploy's env variable UI) has **no effect on already-built code** — discovered directly by
building the image with one WS URL, running it, and watching the DDP connection silently fail
because the browser bundle had a different (wrong-for-that-topology) URL baked in from build time.
The Dockerfile takes these as `ARG`s specifically so they can be passed at `docker build`/`buildx
build` time; the `environment:` entries in docker-compose.yml for these two are effectively
documentation/fallback for the few places `NEXT_PUBLIC_RC_PUBLIC_URL` is *also* read server-side
(e.g. building `/admin` links), not something that fixes a wrong client bundle.

**Operational consequence**: changing `private-chat.eprisi.com` or `chat.eprisi.com`'s domain
requires a rebuild+repush of the image, not just an env var change + restart.

### 2. `mongosh`/RC healthcheck must use `127.0.0.1`, not `localhost`

The `rocketchat` container resolves `localhost` to `::1` (IPv6) first, but Rocket.Chat's Node
process only binds `0.0.0.0:3000` (IPv4). A healthcheck using `http://localhost:3000/...` reports
`unhealthy` forever even though the app is running and reachable on `127.0.0.1`. Both healthchecks
in docker-compose.yml use `127.0.0.1` explicitly for this reason — confirmed by reproducing the
false-unhealthy state, then fixing it, in this same test session.

### 3. Fresh/long-disconnected Rocket.Chat workspaces can hard-block message sending

Rocket.Chat has a licensing feature (`ee/server/lib/license/airGappedRestrictions.ts` in rc-fork's
own source) that restricts core actions like `chat.sendMessage` — returning
`{"success":false,"error":"restricted-workspace"}` — for any workspace that hasn't successfully
validated its license/stats token against Rocket.Chat Cloud (`cloud.rocket.chat`) within a ~10-day
grace period. This is **not a wrapper bug**: reproduced by calling `chat.sendMessage` directly
against the RC container via plain `curl`, bypassing the wrapper entirely, and getting the
identical error.

This surfaced twice during GATE 8's local container testing, with two different root causes for
the *same* symptom — worth telling apart:

- **First run**: this dev machine's network couldn't reach `cloud.rocket.chat` over HTTPS at all
  (`curl https://cloud.rocket.chat` hung/failed from the host itself, while general internet access
  worked fine).
- **Second run** (re-test): RC's own log showed the real reason instead of a generic hang —
  `FetchError: request to https://collector.rocket.chat/ failed, reason: certificate has expired`
  (`CERT_HAS_EXPIRED`). This sandbox's system clock is set to a date substantially in the future
  relative to when this was built, which puts it past the validity window of certs that were
  otherwise fine — an artifact of the **test environment's clock**, not a real network block.

Both point at the same underlying dependency though: **a brand-new or long-disconnected Rocket.Chat
container needs successful outbound HTTPS to Rocket.Chat's cloud/collector endpoints (with a
correct system clock) before `chat.sendMessage` and similar actions will work at all.** On a real
Dokploy VPS running with accurate wall-clock time and normal outbound internet, this should simply
not trigger — but confirm it once after first deploy rather than assuming so, since the failure
mode (a silent `restricted-workspace` REST error, not a startup crash) is easy to miss.

## End-to-end test performed (this session, real containers)

Built the actual Docker image, ran the actual compose stack (fresh `rocketchat` + `rocketchat-mongo`
+ `rocketchat-mongo-init` + `eprisi-chat-web`, all on a real Docker bridge network, `eprisi-chat-web`
pulling `rocketchat:3000` purely through the internal network exactly as production would), and
verified via a real headless browser hitting the wrapper's exposed port:

- ✅ Both containers report `healthy` via their own healthchecks
- ✅ Login through the fully containerized wrapper → containerized RC succeeds, session cookie set
- ✅ Room list, room navigation, and message **history** (REST) load correctly through the container
  network
- ✅ DDP/WebSocket path reachable (no connection errors once `NEXT_PUBLIC_RC_WS_URL` was rebuilt
  with the correct browser-reachable address for this topology)
- ⚠️ Message **sending** could not be verified in this exact container run — blocked by finding #3
  above (this sandbox's network can't reach `cloud.rocket.chat`), confirmed to be an RC-side
  restriction unrelated to the wrapper by reproducing the identical error with a direct `curl`
  against the RC container, bypassing the wrapper entirely
- ✅ The send → DDP-realtime-delivery path itself (the actual thing GATE 8 step 5 asks to verify)
  was already thoroughly verified in GATE 5, including with two genuinely distinct RC identities
  and forced-reconnect testing, against a real (already-registered, non-restricted) RC instance —
  that result stands; only re-confirming it in *this specific fresh container* was blocked by an
  unrelated local network limitation.

This whole container stack (build → compose up → login → navigate → history load) was re-run a
second time after the initial GATE 8 pass (same result on message-sending, more precise root cause
found the second time) — everything except sending was reconfirmed working identically.

**Recommendation**: re-run this same container test from a machine with accurate wall-clock time
and working access to `cloud.rocket.chat`/`collector.rocket.chat` (the actual Dokploy VPS is the
natural place) before considering GATE 8 fully
closed on messaging specifically — everything else above is already confirmed.
