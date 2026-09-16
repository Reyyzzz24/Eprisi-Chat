# Eprisi Chat — v1.2 (wrapper architecture)

**Status: scaffolding not started yet.** This branch is currently just a
placeholder — GATE 0 (repo/branch setup) is the only gate completed so far.

## What this will be

A separate Next.js frontend (`eprisi-chat-web`) that talks to an
**unmodified** official Rocket.Chat image over its REST + DDP APIs, instead
of forking and restyling Rocket.Chat in place (that approach — see branch
`v1.1` — is frozen).

Read the full plan before continuing: the prompt driving this work is
tracked outside this repo, at `eprisi-workspace/WRAPPER_PROMPT.md`. It is
gate-based; each gate stops for approval before the next starts.

## Status

- GATE 0 — repo/branch setup: done (this commit)
- GATE 1 — API spike: not started
- Everything after: not started

See `v1.1`'s README for why this pivot happened.
