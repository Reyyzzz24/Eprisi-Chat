import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route-level gate only — this checks *presence* of the session cookie, not
// its validity against Rocket.Chat (middleware runs on the Edge runtime and
// shouldn't make a network round-trip per navigation). An expired/revoked
// cookie still gets past this check and is only caught by the first actual
// BFF call made from the page (getSession() there doesn't validate against
// RC either — RC itself rejects the token and that surfaces as a 401 the
// client handles by redirecting to /login). See SECURITY.md.
export function middleware(request: NextRequest) {
	const hasSession = request.cookies.has("rc_session");
	if (!hasSession) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("from", request.nextUrl.pathname);
		return NextResponse.redirect(loginUrl);
	}
	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match everything except:
		 * - /login (and other (auth) pages)
		 * - /api/* (each BFF route checks its own session)
		 * - Next internals and static files, including public/ assets
		 *   (images, fonts, icons) — GATE 6 found the login page's own
		 *   background image was being redirected to /login because
		 *   /images wasn't excluded here, which would have applied to any
		 *   future public asset just as wrongly.
		 */
		"/((?!login|api|_next/static|_next/image|favicon.ico|fonts|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
	],
};
