"use client";

import { BookOpen, Compass, MessageCircle, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RC_PUBLIC_URL } from "@/lib/rc/config";

import { CreateChannelDialog } from "./CreateChannelDialog";

/** Empty/home state per mockups/rocketchat/dashboard.jpg — the only screen
 * that mockup actually depicts (see eprisi-theme/tokens.json's note: no
 * active-room view was ever sampled). Two cards are real wrapper actions
 * (Create channel, via the confirmed `channels.create` endpoint); the rest
 * are honest static links rather than invented features:
 * - "Join rooms / directory" — SCOPE.md's MVP has no room-discovery
 *   endpoint (`directory.search`/`channels.list` aren't in the confirmed
 *   list), so this opens RC's own directory instead of faking a search.
 * - Mobile/desktop apps + docs — genuinely static, well-known RC URLs, not
 *   backed by any wrapper feature. */
export function WelcomeHome({ siteName }: { siteName: string }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-3xl font-bold text-foreground">Welcome to {siteName}</h1>
        <p className="mt-1 text-muted-foreground">Your secure communication hub is synchronized. Let&apos;s get your team started.</p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-eprisi-accent/10 text-eprisi-accent">
                  <MessageCircle className="size-5" />
                </span>
                <CardTitle>Create channels</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Organize discussions by department, project, or topic. Establish secure environments for
                institutional wisdom.
              </p>
              <Button className="w-fit" onClick={() => setCreateOpen(true)}>
                Create channel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Compass className="size-5" />
                </span>
                <CardTitle>Join rooms</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Discover public workspaces, search topics, and connect with your colleagues instantly.
              </p>
              <Button variant="outline" className="w-fit" asChild>
                <a href={`${RC_PUBLIC_URL}/directory`}>Open directory</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Smartphone className="size-5" />
              </span>
              <CardTitle className="text-base">Mobile apps</CardTitle>
              <p className="text-sm text-muted-foreground">Stay in touch with your team on the go. Available for iOS and Android.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://apps.apple.com/app/rocket-chat/id1148741252" target="_blank" rel="noreferrer">
                    App Store
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://play.google.com/store/apps/details?id=chat.rocket.android" target="_blank" rel="noreferrer">
                    Google Play
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 pt-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Monitor className="size-5" />
              </span>
              <CardTitle className="text-base">Desktop apps</CardTitle>
              <p className="text-sm text-muted-foreground">Enjoy native performance with keyboard shortcuts on your computer.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://rocket.chat/download" target="_blank" rel="noreferrer">
                    macOS
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://rocket.chat/download" target="_blank" rel="noreferrer">
                    Windows
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://rocket.chat/download" target="_blank" rel="noreferrer">
                    Linux
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 pt-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-eprisi-accent/10 text-eprisi-accent">
                <BookOpen className="size-5" />
              </span>
              <CardTitle className="text-base">Documentation</CardTitle>
              <p className="text-sm text-muted-foreground">Unlock all security capabilities, custom integrations, and webhook features.</p>
              <Button variant="outline" size="sm" className="w-fit" asChild>
                <a href="https://docs.rocket.chat" target="_blank" rel="noreferrer">
                  See documentation
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
