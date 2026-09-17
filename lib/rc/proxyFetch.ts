import { RC_INTERNAL_URL } from "@/lib/rc/config";
import type { RcSession } from "@/lib/rc/session";

const STRIP_REQUEST_HEADERS = new Set(["host", "connection", "content-length", "x-auth-token", "x-user-id", "cookie"]);
const STRIP_RESPONSE_HEADERS = new Set(["content-encoding", "content-length", "connection", "set-cookie"]);

/** Shared by both the /api/rc/[...path] REST proxy and the avatar/file-download
 * proxies — auth via headers (X-Auth-Token/X-User-Id), never via rc_uid/rc_token
 * query params (those leak into access logs, Referer headers, and browser
 * history — WRAPPER_PROMPT.md is explicit about this). */
export async function proxyToRc(request: Request, targetPath: string, session: RcSession): Promise<Response> {
	const url = new URL(request.url);
	const target = `${RC_INTERNAL_URL}${targetPath}${url.search}`;

	const headers = new Headers();
	request.headers.forEach((value, key) => {
		if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
			headers.set(key, value);
		}
	});
	headers.set("X-Auth-Token", session.authToken);
	headers.set("X-User-Id", session.userId);

	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	const rcResponse = await fetch(target, {
		method: request.method,
		headers,
		// Stream straight through — matters for file uploads, never buffer
		// into memory. `duplex: "half"` is required by fetch's spec whenever
		// a ReadableStream body is used.
		body: hasBody ? request.body : undefined,
		...(hasBody ? { duplex: "half" } : {}),
	} as RequestInit & { duplex?: "half" });

	const responseHeaders = new Headers();
	rcResponse.headers.forEach((value, key) => {
		if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
			responseHeaders.set(key, value);
		}
	});

	return new Response(rcResponse.body, { status: rcResponse.status, headers: responseHeaders });
}
