# Eprisi Chat — v1.1 (FROZEN)

**Status: frozen, not deleted.** This branch is a snapshot of the
in-place Rocket.Chat fork/restyle approach. It is kept for reference and is
not being developed further.

## Why frozen

v1.1 forked Rocket.Chat 8.8.1 and restyled it in place (Meteor + Fuselage +
a Tailwind/shadcn layer bolted on top). It got through visual verification
(GATE 6 of `REDESIGN_PROMPT.md`) before two costs became clear:

- Every Rocket.Chat version upgrade means rebasing our patches against a
  moving upstream target.
- Meteor's build cycle (30-60 minutes) made UI iteration slow.

**v1.2 replaces this approach**: a separate frontend (`eprisi-chat-web`,
Next.js) talking to an *unmodified* official Rocket.Chat image over its
REST + DDP APIs. See `WRAPPER_PROMPT.md` and branch `v1.2`.

## What's in this branch

This branch does **not** contain the Rocket.Chat source tree — only our
changes, as a patch series against a pristine 8.8.1 checkout:

- `patches/*.patch` — 25 patches, apply in order with `git am`
- `eprisi-theme/` — the design tokens (`tokens.json`, `palette.ts`) extracted
  from the mockups; reused as-is by v1.2
- `PATCH-NOTES.md` — what each patch does, and the architectural gotchas
  worth knowing before reapplying any of it

See `PATCH-NOTES.md` for full reproduction steps.

## Pointer

Active development is on branch `v1.2`. Start there.
