"use client";

import { useRef, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Composer({
  onSend,
  onTypingChange,
  disabled,
}: {
  onSend: (text: string) => void;
  onTypingChange: (typing: boolean) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange() {
    onTypingChange(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTypingChange(false), 3000);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text) return;
    onSend(text);
    if (inputRef.current) inputRef.current.value = "";
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onTypingChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
      <Input ref={inputRef} onChange={handleChange} placeholder="Message…" disabled={disabled} autoComplete="off" />
      <Button type="submit" disabled={disabled}>
        Send
      </Button>
    </form>
  );
}
