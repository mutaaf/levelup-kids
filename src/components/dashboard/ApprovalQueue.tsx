"use client";

import { useState, useTransition } from "react";
import { approveQuest, rejectCompletion } from "@/app/(app)/quest-actions";
import type { PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";

export type PendingApproval = {
  completionId: string;
  childId: string;
  childName: string;
  childAvatar: string;
  questTitle: string;
  pillar: PillarSlug;
  xpReward: number;
};

export function ApprovalQueue({ items }: { items: PendingApproval[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-card p-8 text-center shadow-sm">
        <span className="text-4xl" aria-hidden>
          ✨
        </span>
        <p className="text-base font-medium text-ink-secondary">
          You&apos;re all caught up.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <ApprovalRow key={item.completionId} item={item} />
      ))}
    </div>
  );
}

function ApprovalRow({ item }: { item: PendingApproval }) {
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApprove, startApprove] = useTransition();
  const [pendingReject, startReject] = useTransition();
  const tint = PILLAR_COPY[item.pillar].tint;

  if (hidden) return null;

  function onApprove() {
    setError(null);
    startApprove(async () => {
      const r = await approveQuest(item.completionId);
      if (r.ok) setHidden(true);
      else setError(r.error);
    });
  }
  function onReject() {
    setError(null);
    startReject(async () => {
      const r = await rejectCompletion(item.completionId);
      if (r.ok) setHidden(true);
      else setError(r.error);
    });
  }

  return (
    <div
      className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-card p-5 shadow-md sm:flex-row sm:items-center"
    >
      <div
        aria-hidden
        className="absolute top-0 left-0 h-full w-1.5"
        style={{ backgroundColor: tint }}
      />

      <div
        className="flex size-16 shrink-0 items-center justify-center rounded-full bg-paper text-4xl shadow-sm"
        aria-hidden
      >
        {item.childAvatar}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-ink-primary">
          {item.childName} finished
        </p>
        <p
          className="mt-0.5 truncate text-lg"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            letterSpacing: "-0.01em",
          }}
        >
          {item.questTitle}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm">
          <span
            className="rounded-full px-2 py-0.5 font-bold text-white"
            style={{ backgroundColor: tint, fontSize: "0.75rem" }}
          >
            {PILLAR_COPY[item.pillar].title}
          </span>
          <span className="font-bold text-ink-muted">+{item.xpReward} XP</span>
        </p>
      </div>

      <div className="flex gap-2 sm:flex-col">
        <button
          type="button"
          onClick={onApprove}
          disabled={pendingApprove || pendingReject}
          className="btn-primary flex-1 sm:flex-none"
        >
          {pendingApprove ? "Saving..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={pendingApprove || pendingReject}
          className="btn-secondary flex-1 sm:flex-none"
        >
          Not yet
        </button>
      </div>

      {error && (
        <p className="text-sm font-medium text-danger sm:basis-full" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
