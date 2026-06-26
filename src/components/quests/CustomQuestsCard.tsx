"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PILLARS, type PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import {
  createCustomQuest,
  deleteCustomQuest,
  reseedThisWeek,
  updateCustomQuest,
  type CustomQuestInput,
} from "@/app/settings/quest-actions";

export type CustomQuestRow = {
  id: string;
  title: string;
  description: string;
  pillar: PillarSlug;
  age_min: number;
  age_max: number;
  xp_reward: number;
};

const PILLAR_EMOJI: Record<PillarSlug, string> = {
  scholar: "📚",
  athlete: "⚽",
  builder: "🔨",
  creator: "🎨",
  leader: "🏅",
  character: "🌟",
  explorer: "🧭",
  purpose: "🤝",
};

const DEFAULT_DRAFT: CustomQuestInput = {
  title: "",
  description: "",
  pillar: "scholar",
  ageMin: 4,
  ageMax: 17,
  xpReward: 5,
};

export function CustomQuestsCard({ quests }: { quests: CustomQuestRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomQuestInput>(DEFAULT_DRAFT);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function resetForm() {
    setAdding(false);
    setEditingId(null);
    setDraft(DEFAULT_DRAFT);
    setError(null);
  }

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const r = await createCustomQuest(draft);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setStatus("Quest added. It'll appear in the next set of daily quests.");
      resetForm();
      router.refresh();
    });
  }

  function startEdit(q: CustomQuestRow) {
    setEditingId(q.id);
    setAdding(false);
    setDraft({
      title: q.title,
      description: q.description,
      pillar: q.pillar,
      ageMin: q.age_min,
      ageMax: q.age_max,
      xpReward: q.xp_reward,
    });
  }

  function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const r = await updateCustomQuest(editingId, draft);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setStatus("Quest updated.");
      resetForm();
      router.refresh();
    });
  }

  function onDelete(id: string, title: string) {
    if (!confirm(`Remove "${title}"? Existing copies of this quest already in this week stay.`)) {
      return;
    }
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const r = await deleteCustomQuest(id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setStatus("Quest removed.");
      router.refresh();
    });
  }

  function onReseed() {
    if (
      !confirm(
        "Wipe this week's quests and generate fresh ones (including your custom quests)? Any 'ready for approval' completions on the current week are gone too.",
      )
    ) {
      return;
    }
    setError(null);
    setStatus("Reseeding…");
    startTransition(async () => {
      const r = await reseedThisWeek();
      if (!r.ok) {
        setError(r.error);
        setStatus(null);
        return;
      }
      setStatus("This week's quests refreshed.");
      router.refresh();
    });
  }

  const showingForm = adding || editingId !== null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm">
      {/* ---------- List of existing custom quests ---------- */}
      {quests.length > 0 ? (
        <div className="flex flex-col gap-2">
          {quests.map((q) => {
            const tint = PILLAR_COPY[q.pillar].tint;
            const ageLabel =
              q.age_min === q.age_max
                ? `age ${q.age_min}`
                : `ages ${q.age_min}–${q.age_max}`;
            return (
              <div
                key={q.id}
                className="flex flex-col gap-2 rounded-xl border border-ink-muted/15 p-3 sm:flex-row sm:items-start"
              >
                <span
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${tint} 18%, var(--surface-paper))`,
                  }}
                  aria-hidden
                >
                  {PILLAR_EMOJI[q.pillar]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-primary">
                    {q.title}
                  </p>
                  {q.description && (
                    <p className="line-clamp-2 text-sm text-ink-secondary">
                      {q.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-muted">
                    <span style={{ color: tint }} className="font-semibold">
                      {PILLAR_COPY[q.pillar].title}
                    </span>{" "}
                    · {ageLabel} · +{q.xp_reward} XP
                  </p>
                </div>
                <div className="flex gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => startEdit(q)}
                    disabled={busy}
                    className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-xs text-ink-primary hover:bg-tinted disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(q.id, q.title)}
                    disabled={busy}
                    className="rounded-md px-3 py-1.5 text-xs text-danger underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-ink-secondary">
          No custom quests yet. Add things specific to your family — chores
          that matter, traditions, skills you&apos;re working on. They&apos;ll
          mix in with the built-in library based on each kid&apos;s age and
          your focus pillars.
        </p>
      )}

      {/* ---------- Add / edit form ---------- */}
      {showingForm ? (
        <form
          onSubmit={editingId ? onUpdate : onCreate}
          className="flex flex-col gap-3 rounded-xl border border-brand-500/30 bg-brand-50/40 p-4"
        >
          <p className="text-sm font-semibold text-ink-primary">
            {editingId ? "Edit quest" : "New custom quest"}
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-secondary">
              Title
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="Help cook dinner"
              maxLength={80}
              autoFocus
              required
              className="rounded-md border border-ink-muted/30 bg-card px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-secondary">
              What counts as done (optional)
            </label>
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="Stir something. Chop something. Plate something."
              maxLength={280}
              rows={2}
              className="rounded-md border border-ink-muted/30 bg-card px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-secondary">
              Pillar
            </label>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              {PILLARS.map((p) => {
                const selected = draft.pillar === p;
                const tint = PILLAR_COPY[p].tint;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, pillar: p as string }))
                    }
                    aria-pressed={selected}
                    title={PILLAR_COPY[p].title}
                    className="flex aspect-square items-center justify-center rounded-lg text-lg transition-all"
                    style={{
                      backgroundColor: selected
                        ? `color-mix(in srgb, ${tint} 22%, var(--surface-card))`
                        : "var(--surface-card)",
                      boxShadow: selected
                        ? `0 0 0 2px ${tint}`
                        : "0 0 0 1px color-mix(in srgb, var(--ink-muted) 25%, transparent)",
                    }}
                  >
                    {PILLAR_EMOJI[p]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-muted">
              {PILLAR_COPY[draft.pillar as PillarSlug]?.title}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-secondary">
                Min age
              </label>
              <input
                type="number"
                min={4}
                max={17}
                value={draft.ageMin}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    ageMin: parseInt(e.target.value || "4", 10),
                  }))
                }
                className="rounded-md border border-ink-muted/30 bg-card px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-secondary">
                Max age
              </label>
              <input
                type="number"
                min={4}
                max={17}
                value={draft.ageMax}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    ageMax: parseInt(e.target.value || "17", 10),
                  }))
                }
                className="rounded-md border border-ink-muted/30 bg-card px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-secondary">
                XP
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={draft.xpReward}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    xpReward: parseInt(e.target.value || "5", 10),
                  }))
                }
                className="rounded-md border border-ink-muted/30 bg-card px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !draft.title.trim()}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Add quest"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink-primary hover:bg-tinted disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setStatus(null);
            }}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Add a quest
          </button>
          {quests.length > 0 && (
            <button
              type="button"
              onClick={onReseed}
              disabled={busy}
              className="rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink-primary hover:bg-tinted disabled:opacity-60"
            >
              {busy ? "Working…" : "Refresh this week's quests"}
            </button>
          )}
        </div>
      )}

      {status && (
        <p
          className="text-sm"
          style={{ color: status.startsWith("Reseeding") ? "var(--ink-secondary)" : "var(--success)" }}
        >
          {status}
        </p>
      )}
    </div>
  );
}
