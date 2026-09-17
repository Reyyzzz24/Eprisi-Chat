// Disposable spike config — GATE 1. Not production code.
export const BASE_URL = process.env.RC_BASE_URL || 'http://localhost:3000';
// NOTE: @rocket.chat/ddp-client's Connection strips any wss?:// prefix and
// appends "/websocket" itself — passing a URL that already ends in
// /websocket produces ws://host/websocket/websocket, which silently hangs
// (server 404s the upgrade, client never resolves). Pass the bare origin.
export const WS_URL = process.env.RC_WS_URL || 'ws://localhost:3000';
// No hardcoded password fallback — these spikes are disposable scripts run
// against a real (if local) RC admin account, and a real credential
// shouldn't sit in committed source even for a private repo / dev-only
// instance. Set RC_ADMIN_USER/RC_ADMIN_PASS before running any spike.
export const ADMIN_USER = process.env.RC_ADMIN_USER || 'eprisiadmin';
export const ADMIN_PASS = process.env.RC_ADMIN_PASS;
if (!ADMIN_PASS) {
	throw new Error('RC_ADMIN_PASS env var is required to run spike scripts (no hardcoded fallback).');
}
