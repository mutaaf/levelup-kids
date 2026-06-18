"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendCoachMessage, type CoachMessage } from "./actions";

export function CoachChat({
  initial,
  disabled,
}: {
  initial: CoachMessage[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<CoachMessage[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPending]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setError(null);
    const optimistic: CoachMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
    };
    setMessages((cur) => [...cur, optimistic]);
    setText("");
    startTransition(async () => {
      const result = await sendCoachMessage(trimmed);
      if (result.ok) {
        // Refresh to pull both turns from the server (avoids divergence).
        router.refresh();
      } else {
        setError(result.error);
        // Roll the optimistic message back.
        setMessages((cur) => cur.filter((m) => m.id !== optimistic.id));
      }
    });
  }

  // Re-hydrate messages from server props on refresh.
  useEffect(() => {
    setMessages(initial);
  }, [initial]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm">
        {messages.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-ink-secondary">
            The Coach is waiting. Try a real question about your family.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <span className="text-xs tracking-widest text-ink-muted uppercase">
              {m.role === "user" ? "You" : "Family Coach"}
            </span>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-tinted text-ink-primary"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex items-start">
            <div className="rounded-lg bg-tinted px-4 py-3 text-sm text-ink-secondary">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 animate-pulse rounded-full bg-ink-muted" />
                <span className="size-1.5 animate-pulse rounded-full bg-ink-muted [animation-delay:120ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-ink-muted [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={disabled || isPending}
            placeholder={
              disabled
                ? "Add ANTHROPIC_API_KEY to enable the Coach..."
                : "How do I help Yusuf get into reading?"
            }
            rows={2}
            maxLength={2000}
            className="flex-1 resize-none rounded-md border border-ink-muted/30 bg-paper px-3 py-2 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={disabled || isPending || !text.trim()}
            className="self-end rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Thinking..." : "Ask"}
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </section>
  );
}
