import { NextResponse } from "next/server";

import { isAllowedRcPath } from "@/lib/rc/allowlist";
import { proxyToRc } from "@/lib/rc/proxyFetch";
import { getSession } from "@/lib/rc/session";

async function handle(request: Request, path: string[]): Promise<Response> {
	const joined = path.join("/");

	if (!isAllowedRcPath(joined)) {
		return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
	}

	const session = await getSession();
	if (!session) {
		return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
	}

	return proxyToRc(request, `/api/${joined}`, session);
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	return handle(request, (await params).path);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	return handle(request, (await params).path);
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	return handle(request, (await params).path);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	return handle(request, (await params).path);
}
