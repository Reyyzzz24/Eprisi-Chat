"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { disconnectDdp, ensureDdpConnection, onDdpStatus, type DdpStatus } from "@/lib/rc/ddp";

const DdpStatusContext = createContext<DdpStatus>("idle");

export function useDdpStatus(): DdpStatus {
  return useContext(DdpStatusContext);
}

/** Fetches the DDP token from the BFF (`/api/rc/session/ddp-token`) into a
 * plain component-local variable only — never a Storage API — and drives
 * the module-level DDP singleton's lifecycle for as long as this provider
 * is mounted. Mount this once, near the root of the authenticated app
 * shell (inside the `(app)` route group), not per-page. */
export function DdpProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DdpStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onDdpStatus(setStatus);

    (async () => {
      const res = await fetch("/api/rc/session/ddp-token");
      if (!res.ok) return;
      const body = await res.json();
      const token = body?.data?.authToken as string | undefined;
      if (!token || cancelled) return;
      try {
        await ensureDdpConnection(token);
      } catch (err) {
        console.error("[ddp] initial connection failed", err);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      disconnectDdp();
    };
  }, []);

  return <DdpStatusContext.Provider value={status}>{children}</DdpStatusContext.Provider>;
}
