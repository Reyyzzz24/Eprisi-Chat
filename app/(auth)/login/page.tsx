import { Suspense } from "react";

import { isKeycloakConfigured } from "@/lib/auth/authOptions";
import { getLoginBranding } from "@/lib/rc/publicSettings";

import LoginForm from "./LoginForm";

// Server Component — fetches branding (logo + site name) from RC's own
// `settings.public` before rendering, per WRAPPER_PROMPT.md GATE 6's
// explicit instruction not to hardcode the logo/wordmark, so it stays
// editable from RC's admin panel without a wrapper deploy. Also resolves
// whether Keycloak is configured server-side (env vars aren't visible to
// the client) so the SSO button only renders when it could actually work.
export default async function LoginPage() {
  const branding = await getLoginBranding();

  return (
    <Suspense fallback={null}>
      <LoginForm logoUrl={branding.logoUrl} siteName={branding.siteName} keycloakEnabled={isKeycloakConfigured} />
    </Suspense>
  );
}
