"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { RcApiError, rcRest } from "@/lib/rc/rest";

/** "Create channel" per mockups/rocketchat/dashboard.jpg's card of the same
 * name — a real call to the confirmed `channels.create` endpoint (SCOPE.md),
 * not a decorative button. Built as a Sheet (not a full custom modal) to
 * avoid pulling in a separate Dialog component for one simple form. */
export function CreateChannelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await rcRest.createRoom("c", name.trim());
      const rid = res.channel?._id;
      onOpenChange(false);
      setName("");
      if (rid) router.push(`/channel/${encodeURIComponent(rid)}?type=c`);
    } catch (err) {
      setError(err instanceof RcApiError ? err.message : "Could not create the channel.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-background p-4 text-foreground">
        <SheetTitle>Create a channel</SheetTitle>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel-name">Channel name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. engineering"
              autoFocus
              disabled={submitting}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Creating…" : "Create channel"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
