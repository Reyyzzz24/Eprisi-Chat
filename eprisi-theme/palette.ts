/**
 * Eprisi palette — Fuselage-shaped object generated from tokens.json.
 *
 * This is NOT wired into Fuselage's <PaletteStyleTag palette={...}> prop
 * (that prop expects a pre-rendered CSS string for a named custom theme,
 * e.g. the existing `codeBlock` palette in MainLayoutStyleTags.tsx — see
 * apps/meteor/client/views/root/lib/codeBlockStyles). At L0 we intentionally
 * use plain static CSS (eprisi-tokens.css) instead, because it only needs to
 * win the cascade by source order, with no React re-render cost.
 *
 * This file exists so:
 *   1. eprisi-tokens.css and any future Tailwind theme (GATE 3) have a single
 *      typed source of truth instead of copy-pasted hex strings.
 *   2. If a future gate needs a real Fuselage `palette` string (e.g. to also
 *      theme high-contrast mode), it can be built from this object with
 *      Fuselage's own `convertToCss` shape: `{ [tokenName]: value }`.
 *
 * Keys follow @rocket.chat/fuselage's Theme.d.ts naming (`surface.ts`,
 * `strokeColors`, `textIconColors`) confirmed against the installed
 * package at apps/meteor/node_modules/@rocket.chat/fuselage/dist/Theme.d.ts.
 * Null means "no mockup value — do not set, let Fuselage's own default apply."
 */

export const brand = {
	50: '#F1F4F9',
	100: '#DFE6F1',
	200: '#C0CDE3',
	300: '#99AFD1',
	400: '#7291C0',
	500: '#4F75B0',
	600: '#3E5C8A',
	700: '#365078',
	800: '#293D5B',
	900: '#1C2A3F',
} as const;

export const accent = {
	50: '#FDF8EC',
	100: '#FBEFD5',
	200: '#F7DEAB',
	300: '#F2CA78',
	400: '#EEB644',
	500: '#E9A416',
	600: '#B88111',
	700: '#9F6F0F',
	800: '#79550B',
	900: '#543B08',
} as const;

/** Maps 1:1 to @rocket.chat/fuselage Theme.d.ts `surfaceColors` keys. */
export const surface = {
	'surface-light': '#F5F9FC',
	'surface-room': '#F5F9FC',
	'surface-tint': '#E8EEF5',
	'surface-neutral': '#FFFFFF',
	'surface-sidebar': '#0F1728',
	/** Eprisi-only split: `.rcx-navbar` gets a distinct, slightly darker shade
	 * than `.rcx-sidebar--main`/`.rcx-sidepanel` — Fuselage has one shared
	 * `surface-sidebar` token for both, so this is applied via a scoped CSS
	 * override in eprisi-tokens.css, not this shared key. */
	'surface-navbar': '#0A2535',
	'surface-hover': null,
	'surface-disabled': null,
	'surface-selected': null,
	'surface-dark': null,
	'surface-featured': null,
	'surface-featured-hover': null,
	'surface-overlay': null,
} as const;

/** Maps 1:1 to Theme.d.ts `textIconColors` keys. */
export const text = {
	'font-default': '#1E293B',
	'font-secondary-info': '#64748B',
	'font-titles-labels': '#1E293B',
	'font-hint': null,
	'font-disabled': null,
	'font-annotation': null,
	'font-info': null,
	'font-danger': null,
	'font-white': '#FFFFFF',
	'font-pure-white': '#FFFFFF',
	'font-pure-black': null,
} as const;

/** Maps 1:1 to Theme.d.ts `strokeColors` keys. */
export const stroke = {
	'stroke-extra-light': '#E9EAEB',
	'stroke-light': '#E3EBF7',
	'stroke-medium': null,
	'stroke-dark': null,
	'stroke-extra-dark': null,
	'stroke-extra-light-highlight': null,
	'stroke-highlight': null,
	'stroke-extra-light-error': null,
	'stroke-error': null,
} as const;

/** No mockup screen showed any of these — left fully null, inherit Fuselage default. */
export const status = {
	'status-background-info': null,
	'status-background-success': null,
	'status-background-danger': null,
	'status-background-warning': null,
} as const;

export const typography = {
	fontFamilyBody: "'IBM Plex Sans', sans-serif",
	fontFamilyHeading: "'Plus Jakarta Sans', sans-serif",
} as const;

export const eprisiPalette = { brand, accent, surface, text, stroke, status, typography } as const;

export default eprisiPalette;
