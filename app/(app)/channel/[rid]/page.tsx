"use client";

import { Hash, Lock, User } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";

import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { useRooms } from "@/hooks/useRooms";
import { useRoomMessages } from "@/hooks/useRoomMessages";
import { useTyping } from "@/hooks/useTyping";
import type { RoomType } from "@/lib/rc/rest";

const ROOM_ICON = { c: Hash, p: Lock, d: User } as const;

export default function ChannelPage() {
  const params = useParams<{ rid: string }>();
  const searchParams = useSearchParams();
  const rid = params.rid;
  const type = (searchParams.get("type") as RoomType | null) ?? "c";
  const Icon = ROOM_ICON[type];

  const { data: me } = useMe();
  const { data: rooms } = useRooms();
  const room = rooms?.find((r) => r.rid === rid);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, sendMessage, sending } = useRoomMessages(
    rid,
    type,
  );
  const { typingUsers, setTyping } = useTyping(rid, me?.username);

  const messages = data?.pages.flat() ?? [];

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Icon className="size-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">{room?.name ?? rid}</h1>
      </header>
      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Be the first to say something in #{room?.name ?? rid}.</p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            hasNextPage={Boolean(hasNextPage)}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
          />
        )}
      </div>
      <div className="h-5 px-4 text-xs text-muted-foreground">
        {typingUsers.length > 0 && `${typingUsers.join(", ")} typing…`}
      </div>
      <Composer onSend={(text) => sendMessage(text)} onTypingChange={setTyping} disabled={sending} />
    </>
  );
}
