import { RC_INTERNAL_URL, RC_PUBLIC_URL } from "@/lib/rc/config";

// Server-only. `settings.public` is one of the few RC REST endpoints that
// needs no session at all — confirmed via rc-fork source
// (server/api/v1/settings.ts: `public: true` in the query, no auth
// middleware on the route) and the `_id=a,b,c` comma-separated filter
// (same file's `parsedQueryId`), not guessed. Called directly against
// RC_INTERNAL_URL from the login page's Server Component rather than
// through the authenticated `/api/rc/*` BFF proxy, since there is no
// session yet on the login page.
export async function getLoginBranding(): Promise<{ logoUrl: string; siteName: string }> {
  try {
    const res = await fetch(`${RC_INTERNAL_URL}/api/v1/settings.public?_id=Assets_logo,Site_Name`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`settings.public returned ${res.status}`);
    const body = (await res.json()) as { settings?: { _id: string; value: unknown }[] };
    const settings = body.settings ?? [];
    const logo = settings.find((s) => s._id === "Assets_logo")?.value as
      | { url?: string; defaultUrl?: string }
      | undefined;
    const siteName = settings.find((s) => s._id === "Site_Name")?.value as string | undefined;
    const path = logo?.url || logo?.defaultUrl;

    return {
      logoUrl: path ? `${RC_PUBLIC_URL}/${path.replace(/^\//, "")}` : "",
      siteName: siteName || "Rocket.Chat",
    };
  } catch {
    // Never block the login page from rendering over a branding fetch
    // failure — fall back to a generic label and no logo image.
    return { logoUrl: "", siteName: "Rocket.Chat" };
  }
}
