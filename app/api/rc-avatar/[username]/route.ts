import { NextResponse } from "next/server";

import { proxyToRc } from "@/lib/rc/proxyFetch";
import { getSession } from "@/lib/rc/session";

// GET /api/rc-avatar/:username -> RC's GET /avatar/:username. Not under
// /api/v1, so it's a separate route from the generic proxy. Confirmed
// working with header-based auth in GATE 1 spike #12.
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
	const { username } = await params;
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
	}
	return proxyToRc(request, `/avatar/${encodeURIComponent(username)}`, session);
}
