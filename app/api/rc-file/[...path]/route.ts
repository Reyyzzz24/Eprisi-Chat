import { NextResponse } from "next/server";

import { proxyToRc } from "@/lib/rc/proxyFetch";
import { getSession } from "@/lib/rc/session";

// GET /api/rc-file/:id/:name -> RC's GET /file-upload/:id/:name. The file
// URL returned by rooms.media (spike #11) is already in this shape
// (/file-upload/{id}/{name}), so the frontend just prefixes it with
// /api/rc-file instead of /file-upload when rendering.
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	const { path } = await params;
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
	}
	return proxyToRc(request, `/file-upload/${path.join("/")}`, session);
}
