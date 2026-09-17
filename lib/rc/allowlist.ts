// Allowlist, not blocklist, per WRAPPER_PROMPT.md GATE 4 rule 1: dangerous
// admin endpoints (settings.*, admin.*, users.create/.delete, permissions.*,
// integrations.*, etc.) are safe by omission — they simply aren't listed
// here, so a regular authenticated user's session can never reach them
// through this proxy no matter what path they request.
//
// Matched against the path *after* `/api/rc/` — e.g. a request to
// `/api/rc/v1/rooms.get` is checked against `v1/rooms.get`.
//
// Scope is intentionally exactly SCOPE.md's confirmed-or-accepted MVP
// feature list (GATE 2) — nothing speculative. Add an entry here only when
// a feature is actually being built, not preemptively.
const ALLOWED_EXACT = new Set([
	"info", // GATE 1 spike #1 — real path, not /api/v1/info
	"v1/me",
	"v1/rooms.get",
	"v1/subscriptions.get",
	"v1/channels.history",
	"v1/groups.history",
	"v1/im.history",
	"v1/channels.create",
	"v1/groups.create",
	"v1/im.create",
	"v1/chat.sendMessage",
	"v1/chat.update",
	"v1/chat.delete",
	"v1/chat.react",
	"v1/chat.search",
	"v1/users.setAvatar",
	"v1/users.setStatus",
]);

// Prefix matches for parameterized paths (rooms.media/:rid, avatar/file
// download aren't under /api/v1 at all — see the separate /avatar and
// /file-upload proxy routes).
const ALLOWED_PREFIXES = ["v1/rooms.media/"];

export function isAllowedRcPath(path: string): boolean {
	if (ALLOWED_EXACT.has(path)) return true;
	return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}
