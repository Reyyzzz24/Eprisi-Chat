import type { ReactNode } from "react";

import { AppShell } from "@/components/chat/AppShell";
import { DdpProvider } from "@/lib/rc/DdpProvider";
import { getLoginBranding } from "@/lib/rc/publicSettings";

// This layout is where the realtime connection lives (GATE 5): every route
// under `(app)` is already known to have a session (middleware.ts), so the
// DDP token fetch + connection lifecycle belongs here, not per-page. GATE 7
// adds the dashboard shell (navbar + sidebar) around every page in this
// route group.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const branding = await getLoginBranding();

  return (
    <DdpProvider>
      <AppShell siteName={branding.siteName} logoUrl={branding.logoUrl}>
        {children}
      </AppShell>
    </DdpProvider>
  );
}
