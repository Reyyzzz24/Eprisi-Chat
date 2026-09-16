# PATCH-NOTES — Eprisi Chat v1.1 (frozen)

v1.1 was a Rocket.Chat 8.8.1 fork, restyled in place (Meteor + Fuselage + a
local Tailwind/shadcn layer). This branch does **not** contain the Rocket.Chat
source — only the diff against a pristine 8.8.1 checkout, as a patch series,
to avoid redistributing Rocket.Chat's own source tree (parts of which,
`ee/` and `apps/meteor/ee/`, are under a separate Enterprise license — see
Rocket.Chat's own `LICENSE` file for the exact terms).

## Reproducing the fork

```bash
git clone --branch 8.8.1 https://github.com/RocketChat/Rocket.Chat.git rc-fork
cd rc-fork
git checkout -b feat/eprisi-theme
git am ../patches/*.patch   # apply in order; git am preserves the original commit messages/authorship
```

If `git am` conflicts on a patch, the individual `.patch` files are ordinary
`git format-patch` output — inspect with `git apply --check` or apply with
`patch -p1 <` as a fallback and resolve by hand.

## What's in `patches/`

25 patches, in order, covering (see each commit message for full detail):

| # | Gate | Summary |
|---|---|---|
| 0001–0003 | GATE 1–2 | Eprisi color/font design tokens (L0 CSS overrides), Tailwind wired into Meteor's PostCSS pipeline |
| 0004–0007 | GATE 3 | shadcn/ui component primitives ported manually into `apps/meteor` and `packages/web-ui-registration` (two separate local copies — see below) |
| 0008–0020 | GATE 4 | Full rewrite of the login/register/reset-password screens in `packages/web-ui-registration` using the local shadcn primitives, matching `eprisi-theme` mockups |
| 0021–0022 | GATE 5–6a | Dashboard shell (navbar/sidebar) restyle via scoped CSS custom-property overrides (not a component rewrite — see rationale in the commit), plus a Playwright+pixelmatch visual-diff tool and a real cascade-order bug it caught and fixed |
| 0023 | GATE 6 | Fixed shadcn Button/Input/Tabs never actually applying the Eprisi font-family utility |
| 0024–0025 | post-6 | Sidebar/login "Powered by" text rebrand, login page hero background + dynamic site-name wordmark |

## Architectural notes worth knowing before reapplying

- **`packages/web-ui-registration` has its own local shadcn primitives**,
  separate from `apps/meteor/client/components/ui/` — it's a different yarn
  workspace and can't import apps/meteor's copy (wrong dependency direction).
  If you extend the shadcn set, you may need to duplicate the addition in
  both places (see patch 0023 for an example — the font-family fix touched
  both copies).
- The dashboard shell (navbar/sidebar) was deliberately **not** rewritten
  with shadcn components — see patch 0021's commit message. It's tightly
  coupled to Fuselage's own interactive logic (virtualized room list, kebab
  menus, omnichannel/voip conditionals), so it was restyled via scoped CSS
  variable overrides instead. Fuselage also injects a dynamic dark-mode
  `<style>` tag at runtime that can silently win the cascade over static CSS
  on tied specificity — patch 0022 fixes exactly this, and the fix pattern
  (doubling selector specificity) is the template for any future token
  collisions of this kind.
- No Dockerfile/compose was produced for v1.1 — the project was frozen at
  GATE 6 (visual verification) before reaching GATE 7 (Docker), when the
  wrapper-architecture pivot (see `WRAPPER_PROMPT.md`, v1.2) was decided
  instead.

## `eprisi-theme/`

`tokens.json` — every design token (color, radius, spacing, typography),
each value tagged with its provenance (pixel-sampled from a mockup, or
derived from a sampled anchor). `palette.ts` — the same tokens as a
TypeScript object, as consumed by `apps/meteor/tailwind.config.ts` in v1.1.
This is the source of truth v1.2 should reuse rather than re-deriving colors
from the mockups again.

## Why frozen, not continued

See `WRAPPER_PROMPT.md` at the repo/workspace root (v1.2). Short version:
Meteor's build times (30-60min) and the coupling between our restyle and
Rocket.Chat's own upgrade path made in-place forking too expensive to
maintain. v1.2 wraps Rocket.Chat's unmodified official image behind a
separate Next.js frontend talking to it over REST + DDP, so a Rocket.Chat
version bump is a tag change, not a rebase.
