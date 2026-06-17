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
      <p className="rounded-lg bg-card p-5 text-sm text-ink-secondary">
        Nothing waiting for approval right now.
      </p>
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
      className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm sm:flex-row sm:items-center"
      style={{ borderLeft: `4px solid ${tint}` }}
    >
      <div
        className="flex size-12 items-center justify-center rounded-full bg-tinted text-2xl"
        aria-hidden
      >
        {item.childAvatar}
      </div>
      <div className="flex-1">
        <p className="text-sm">
          <strong className="text-ink-primary">{item.childName}</strong>{" "}
          <span className="text-ink-secondary">finished</span>
        </p>
        <p className="text-base text-ink-primary">{item.questTitle}</p>
        <p className="text-xs text-ink-muted">
          {PILLAR_COPY[item.pillar].title} · +{item.xpReward} XP
        </p>
      </div>
      <div className="flex gap-2 sm:flex-col sm:items-end">
        <button
          type="button"
          onClick={onApprove}
          disabled={pendingApprove || pendingReject}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {pendingApprove ? "..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={pendingApprove || pendingReject}
          className="rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink-secondary transition hover:bg-tinted disabled:opacity-60"
        >
          Not yet
        </button>
      </div>
      {error && (
        <p className="text-xs text-danger sm:basis-full" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
