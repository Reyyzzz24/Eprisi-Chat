"use client";

import type { IMessage } from "@rocket.chat/core-typings";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageBody } from "@/lib/rc/parser";

const NEAR_BOTTOM_THRESHOLD = 200;

// Virtualized (via @tanstack/react-virtual), backward-paginated, realtime
// message list (GATE 5's data layer). GATE 7 adds the mockup-fidelity
// chrome: avatars, scroll-to-bottom affordance, and a "N new messages"
// indicator — WRAPPER_PROMPT.md GATE 7's explicit requirements — on top of
// the same virtualization/dedup logic.
export function MessageList({
  messages,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  messages: IMessage[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const grew = messages.length > prevCountRef.current;
    const delta = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
    if (grew && nearBottom) {
      el.scrollTop = el.scrollHeight;
    } else if (grew && !nearBottom) {
      setNewCount((n) => n + delta);
    }
  }, [messages.length]);

  function handleScroll() {
    const el = parentRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
    setIsNearBottom(nearBottom);
    if (nearBottom) setNewCount(0);
  }

  function scrollToBottom() {
    const el = parentRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setNewCount(0);
  }

  return (
    <div className="relative h-full">
      <div ref={parentRef} onScroll={handleScroll} className="h-full overflow-y-auto">
        <div className="flex justify-center py-2">
          {hasNextPage && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
              className="text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-50"
            >
              {isFetchingNextPage ? "Loading…" : "Load earlier messages"}
            </button>
          )}
        </div>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((item) => {
            const message = messages[item.index];
            const isPending = String(message._id).startsWith("temp-");
            const username = message.u?.username;
            return (
              <div
                key={message._id}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
                className={`flex items-start gap-2.5 px-4 py-1.5 ${isPending ? "opacity-60" : ""}`}
              >
                <Avatar size="sm" className="mt-0.5">
                  {username && <AvatarImage src={`/api/rc-avatar/${username}`} alt="" />}
                  <AvatarFallback>{username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{username ?? "unknown"}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.ts as unknown as string).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <MessageBody text={message.msg} ast={(message as unknown as { md?: unknown }).md} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(!isNearBottom || newCount > 0) && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-md hover:bg-primary/90"
        >
          <ArrowDown className="size-3.5" />
          {newCount > 0 ? `${newCount} new message${newCount > 1 ? "s" : ""}` : "Scroll to bottom"}
        </button>
      )}
    </div>
  );
}
