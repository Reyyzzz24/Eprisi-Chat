#!/usr/bin/env node
/**
 * GATE 6/7 — automated visual diff of the login page and dashboard home
 * against the source mockups (mockups/rocketchat/{login,dashboard}.jpg).
 * Pattern reused from rc-fork's scripts/visual-diff.mjs (v1.1) — same
 * rationale: the mockups are hand-drawn compositions, not real
 * screenshots, so a raw pixel-diff percentage is expected to be high and
 * is not the signal that matters. This script captures screenshots + a
 * pixel-diff overlay; the `differences` array is filled in by hand after
 * visual review, not computed.
 *
 * Usage: node scripts/visual-diff.mjs [baseURL]
 *   baseURL defaults to http://localhost:3010 (a running `yarn start`/`dev` server).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".visual");
// mockups/ lives in the eprisi-workspace parent dir, alongside this project.
const MOCKUPS_DIR = path.join(ROOT, "..", "mockups", "rocketchat");

const BASE_URL = process.argv[2] || process.env.VISUAL_DIFF_BASE_URL || "http://localhost:3010";
const TEST_ADMIN_USER = process.env.VISUAL_DIFF_ADMIN_USER || "eprisiadmin";
// No hardcoded password fallback — see spike/config.ts for the same rule.
const TEST_ADMIN_PASS = process.env.VISUAL_DIFF_ADMIN_PASS;
if (!TEST_ADMIN_PASS) {
  throw new Error("VISUAL_DIFF_ADMIN_PASS env var is required (no hardcoded fallback).");
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const SCREENS = [
  { name: "login", path: "/login", authenticated: false, baseline: "login.jpg" },
  { name: "home", path: "/", authenticated: true, baseline: "dashboard.jpg" },
];

mkdirSync(OUT_DIR, { recursive: true });

/** Convert+crop a mockup (a PNG despite the .jpg extension) to a PNG
 * matching a given viewport, via macOS `sips`. */
function baselineAsPng(jpgName, width, height) {
  const srcPath = path.join(MOCKUPS_DIR, jpgName);
  const pngPath = path.join(OUT_DIR, `_baseline-${path.basename(jpgName, ".jpg")}.png`);
  execFileSync("sips", ["-s", "format", "png", srcPath, "--out", pngPath], { stdio: "pipe" });
  const png = PNG.sync.read(readFileSync(pngPath));
  const cropped = new PNG({ width, height });
  PNG.bitblt(png, cropped, 0, 0, Math.min(width, png.width), Math.min(height, png.height), 0, 0);
  return cropped;
}

/** Log in once in a throwaway context and return its storageState — see
 * rc-fork's scripts/visual-diff.mjs for why a fresh context per screen is
 * used instead of reusing one page across states. */
async function getAuthenticatedStorageState(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#user").fill(TEST_ADMIN_USER);
  await page.locator("#password").fill(TEST_ADMIN_PASS);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForTimeout(2000);
  const stillOnLogin = page.url().includes("/login");
  if (stillOnLogin) {
    throw new Error(
      `Login did not succeed for ${TEST_ADMIN_USER} — still on /login after submit. Check VISUAL_DIFF_ADMIN_USER/PASS.`,
    );
  }
  const state = await context.storageState();
  await context.close();
  return state;
}

function diffAgainstBaseline(screen, viewport, actualPath) {
  const id = `${screen.name}-${viewport.name}`;
  const result = { id, screen: screen.name, viewport: viewport.name, actualPath };

  if (viewport.name !== "desktop") {
    result.note =
      "No mobile-specific mockup exists (mockups/rocketchat only has one 1440x1024 composition per screen) — mobile capture is for manual/structural review only, not pixel-diffed.";
    return result;
  }

  const actual = PNG.sync.read(readFileSync(actualPath));
  const baseline = baselineAsPng(screen.baseline, viewport.width, viewport.height);
  const diff = new PNG({ width: viewport.width, height: viewport.height });
  const diffPixels = pixelmatch(actual.data, baseline.data, diff.data, viewport.width, viewport.height, {
    threshold: 0.15,
  });
  const diffPath = path.join(OUT_DIR, `${id}-diff.png`);
  writeFileSync(diffPath, PNG.sync.write(diff));

  result.baselinePath = path.join(MOCKUPS_DIR, screen.baseline);
  result.diffPath = diffPath;
  result.diffPixelPercent = Number(((diffPixels / (viewport.width * viewport.height)) * 100).toFixed(2));
  result.note =
    "Mockup is a hand-drawn composition, not a screenshot — a high raw percentage here is expected; see report.differences for the actual structured findings.";
  return result;
}

async function main() {
  const browser = await chromium.launch();
  const report = { generatedAt: new Date().toISOString(), baseURL: BASE_URL, results: [] };
  const authState = await getAuthenticatedStorageState(browser);

  for (const viewport of VIEWPORTS) {
    for (const screen of SCREENS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        storageState: screen.authenticated ? authState : undefined,
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(screen.authenticated ? 2500 : 1000);
      const actualPath = path.join(OUT_DIR, `${screen.name}-${viewport.name}-actual.png`);
      await page.screenshot({ path: actualPath });
      await context.close();
      report.results.push(diffAgainstBaseline(screen, viewport, actualPath));
    }
  }

  await browser.close();

  report.differences = HAND_REVIEWED_DIFFERENCES;

  writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(`Wrote ${report.results.length} captures and report.json to ${OUT_DIR}`);
}

// Hand-authored structured findings from visual review of the captures
// above against the mockups — filled in after running this script once and
// looking at the actual vs. baseline images side by side.
const HAND_REVIEWED_DIFFERENCES = [
  {
    id: "login-form-vertical-centering",
    severity: "fixed",
    screens: ["login-desktop"],
    category: "position",
    summary:
      "Logo/heading/form block rendered vertically centered in the left panel; mockup anchors it near the top with the footer pinned to the bottom.",
    rootCause: "Inner flex container used `justify-center` instead of a top anchor.",
    fix: "Changed to `justify-start` with top padding (`pt-4 md:pt-12`) and increased the logo-to-heading gap to approximate the mockup's generous top whitespace. Exact pixel gap not reproduced 1:1 — the mockup's composition canvas (1024px tall) has more vertical room than a real 900px viewport; a proportional, not pixel-exact, gap was used.",
  },
  {
    id: "input-fill-missing",
    severity: "fixed",
    screens: ["login-desktop", "login-mobile"],
    category: "color",
    summary:
      "Email/password inputs rendered with shadcn's default transparent-background + border style; mockup shows a filled tint background (no visible border).",
    rootCause:
      "eprisi-theme/tokens.json documents `color.surface.tint` (#E8EEF5) as sampled directly from these input fields, but the shared `components/ui/input.tsx` defaults to `bg-transparent border-input` — GATE 6 was the first page to actually need the tinted-fill variant.",
    fix: "Added `border-transparent bg-secondary` (secondary token = surface.tint) via className override on this page's three inputs, rather than changing the shared Input component's default (which other, non-fidelity pages still use as-is).",
  },
  {
    id: "watermark-gear-missing-then-invisible",
    severity: "fixed",
    screens: ["login-desktop"],
    category: "decoration",
    summary:
      "Mockup has a large, faint gear-icon watermark bottom-left of the form panel (mockups/rocketchat/watermark-gear.jpg); initially not built at all, then invisible after being added.",
    rootCause:
      "First pass omitted the asset entirely. Second pass added it as an absolutely-positioned child with `-z-10`, but the parent had no explicit stacking context (`position: relative` alone doesn't create one) — the negative z-index child escaped to the page's root stacking context and rendered behind the entire `<body>` background instead of just behind its own panel.",
    fix: "Added `isolate` to the parent panel, giving it its own stacking context so the `-z-10` watermark is correctly trapped behind that panel's content but above its own background.",
  },
  {
    id: "login-with-sso-button-absent",
    severity: "non-issue",
    screens: ["login-desktop", "login-mobile"],
    category: "content",
    summary: 'Mockup shows a "Login with Eprisi Account" outline button with a key icon; not present in the actual render.',
    rootCause: "Keycloak SSO is not configured in this dev environment (see SCOPE.md/SECURITY.md — untested end-to-end).",
    note: "Correct, intentional behavior per GATE 4: the button only renders when KEYCLOAK_CLIENT_ID/SECRET/ISSUER are actually set server-side, so a non-functional button is never shown to users.",
  },
  {
    id: "rc-dev-server-crash-caused-stale-branding-snapshot",
    severity: "non-issue",
    screens: ["login-desktop", "login-mobile"],
    category: "infra",
    summary:
      'A build taken while the local RC dev instance had crashed baked "Rocket.Chat"/no-logo defaults into the static page\'s ISR cache; restarting only the wrapper server did not clear it (Next persists the fetch/page cache to `.next/cache` on disk, keyed by wall-clock time, not process lifetime).',
    rootCause: "Environmental — the RC Meteor dev process died mid-session (a recurring, previously-documented flakiness of this dev instance, unrelated to wrapper code).",
    note: "Not a wrapper defect: `getLoginBranding()` already fails closed to a generic label rather than crashing the page. Fixed for this test run with a clean `rm -rf .next && yarn build` once RC was confirmed healthy. Worth remembering for GATE 8: a production deploy's first build must happen against a healthy RC instance, or the login page will serve stale/default branding until the next revalidation window (5 min).",
  },
  {
    id: "icon-rail-workspace-switcher-dropped",
    severity: "non-issue",
    screens: ["home-desktop", "home-mobile"],
    category: "content",
    summary:
      "Mockup shows a separate ~64px icon-rail left of the sidebar with multiple workspace avatars (current + 'HQ' + 'PR') and a '+' to add another; actual render has no icon-rail at all, just the one 262px sidebar.",
    rootCause: "Rocket.Chat is single-workspace-per-instance — there is nothing to switch between, and no API to create another 'workspace' from within one instance.",
    note: "Explicit user decision (GATE 7): dropped rather than faked with a dead '+' button or hardcoded extra avatars. Reported here per WRAPPER_PROMPT.md's 'don't invent features, report as a gap' rule.",
    deferred: true,
  },
  {
    id: "mobile-menu-button-missing-accessible-name",
    severity: "fixed",
    screens: ["home-mobile"],
    category: "accessibility",
    summary: "The mobile hamburger button that opens the sidebar drawer had no accessible name — a screen reader announced it as just \"button\", and it couldn't be targeted by role+name in the Playwright verification script either.",
    rootCause: "Icon-only button (`<Menu>` from lucide-react) with no `aria-label`.",
    fix: 'Added `aria-label="Open menu"`. Verified end-to-end afterward with a real Playwright run at the 390px mobile viewport: hamburger opens the drawer, drawer shows the real room list, clicking a room navigates AND auto-closes the drawer.',
  },
  {
    id: "navbar-search-is-local-filter-not-global-search",
    severity: "non-issue",
    screens: ["home-desktop"],
    category: "content",
    summary:
      'Mockup\'s top-bar search ("Search conversations, rooms, or keys..." with a ⌘K badge) implies a global command-palette/spotlight search; actual implementation is a real client-side filter over the already-loaded room list only.',
    rootCause: "SCOPE.md's confirmed MVP has no directory/global-search endpoint (`directory.search`, `channels.list` aren't in the confirmed list) — only in-room message search (`chat.search`) is confirmed.",
    note: "Built as a working, honest feature (filters the sidebar you can already see) rather than a decorative box with a fake keyboard-shortcut badge that does nothing.",
    deferred: true,
  },
  {
    id: "notification-bell-inert",
    severity: "non-issue",
    screens: ["home-desktop"],
    category: "content",
    summary: "Bell icon in the navbar shows a real unread-count dot (from useUnread) but clicking it does nothing — no notification center/dropdown.",
    rootCause: "No notification-center feature exists in SCOPE.md's confirmed MVP list.",
    deferred: true,
  },
];

main().catch((err) => {
  console.error("VISUAL DIFF FAILED:", err);
  process.exit(1);
});
