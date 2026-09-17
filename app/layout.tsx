import type { Metadata } from "next";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

import { AppProviders } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Eprisi Chat",
  description: "Eprisi Chat — wrapper frontend for Rocket.Chat",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>
          <TooltipProvider>{children}</TooltipProvider>
        </AppProviders>
      </body>
    </html>
  );
}
