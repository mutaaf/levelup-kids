"use client";

import { useState, useTransition } from "react";
import {
  addChild,
  removeChild,
  updateChild,
  type ChildDraft,
} from "@/app/settings/child-actions";
import { AVAILABLE_AVATARS, MAX_KIDS } from "@/app/settings/child-config";

export type KidRow = {
  id: string;
  name: string;
  age: number;
  avatar: string;
};

export function ManageKidsCard({ initial }: { initial: KidRow[] }) {
  const [kids, setKids] = useState<KidRow[]>(initial);
  const [addOpen, setAddOpen] = useState(false);

  function onAdded(row: KidRow) {
    setKids((cur) => [...cur, row]);
    setAddOpen(false);
  }
  function onUpdated(id: string, patch: Partial<KidRow>) {
    setKids((cur) => cur.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  }
  function onRemoved(id: string) {
    setKids((cur) => cur.filter((k) => k.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {kids.map((k) => (
        <KidEditor
          key={k.id}
          kid={k}
          canRemove={kids.length > 1}
          onUpdated={(p) => onUpdated(k.id, p)}
          onRemoved={() => onRemoved(k.id)}
        />
      ))}

      {addOpen ? (
        <AddKidForm onAdded={onAdded} onCancel={() => setAddOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={kids.length >= MAX_KIDS}
          className="rounded-2xl border-2 border-dashed border-ink-muted/30 bg-paper px-5 py-4 text-base font-semibold text-ink-secondary transition hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {kids.length >= MAX_KIDS
            ? `Up to ${MAX_KIDS} kids per household`
            : "+ Add a kid"}
        </button>
      )}
    </div>
  );
}

function KidEditor({
  kid,
  canRemove,
  onUpdated,
  onRemoved,
}: {
  kid: KidRow;
  canRemove: boolean;
  onUpdated: (patch: Partial<KidRow>) => void;
  onRemoved: () => void;
}) {
  const [draft, setDraft] = useState<ChildDraft>({
    name: kid.name,
    age: kid.age,
    avatar: kid.avatar,
  });
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [confirmPending, startConfirm] = useTransition();
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const dirty =
    draft.name.trim() !== kid.name ||
    draft.age !== kid.age ||
    draft.avatar !== kid.avatar;

  function onSave() {
    setError(null);
    setStatus("idle");
    startTransition(async () => {
      const r = await updateChild(kid.id, {
        name: draft.name.trim(),
        age: draft.age,
        avatar: draft.avatar,
      });
      if (r.ok) {
        setStatus("saved");
        onUpdated({
          name: draft.name.trim(),
          age: draft.age,
          avatar: draft.avatar,
        });
      } else {
        setError(r.error);
      }
    });
  }

  function onConfirmRemove() {
    setConfirmError(null);
    startConfirm(async () => {
      const r = await removeChild(kid.id, confirmName);
      if (r.ok) onRemoved();
      else setConfirmError(r.error);
    });
  }

  return (
    <article className="rounded-2xl bg-card p-5 shadow-sm">
      <header className="flex items-center gap-3">
        <span
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-paper text-2xl shadow-sm"
          aria-hidden
        >
          {draft.avatar}
        </span>
        <div className="flex-1">
          <p className="text-lg font-bold text-ink-primary">{kid.name}</p>
          <p className="text-xs text-ink-muted">Age {kid.age}</p>
        </div>
        {dirty && (
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        )}
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            First name
          </span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            maxLength={24}
            className="rounded-md border border-ink-muted/30 bg-paper px-3 py-2 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Age
          </span>
          <input
            type="number"
            min={4}
            max={17}
            value={draft.age}
            onChange={(e) =>
              setDraft({
                ...draft,
                age: Number.parseInt(e.target.value, 10) || draft.age,
              })
            }
            className="rounded-md border border-ink-muted/30 bg-paper px-3 py-2 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          Avatar
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {AVAILABLE_AVATARS.map((a) => {
            const on = draft.avatar === a;
            return (
              <button
                type="button"
                key={a}
                onClick={() => setDraft({ ...draft, avatar: a })}
                aria-pressed={on}
                className="inline-flex size-10 items-center justify-center rounded-xl text-xl transition-all"
                style={{
                  border: on
                    ? "2px solid var(--brand-500)"
                    : "2px solid transparent",
                  backgroundColor: on
                    ? "color-mix(in srgb, var(--brand-500) 12%, var(--surface-paper))"
                    : "var(--surface-paper)",
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {status === "saved" && !dirty && (
        <p className="mt-3 text-sm text-success" role="status">
          Saved.
        </p>
      )}

      <footer className="mt-4 flex items-center justify-between border-t border-ink-muted/10 pt-3">
        <p className="text-xs text-ink-muted">
          XP, streak, and badges stay intact when you edit.
        </p>
        {canRemove && !confirmOpen && (
          <button
            type="button"
            onClick={() => {
              setConfirmOpen(true);
              setConfirmName("");
              setConfirmError(null);
            }}
            className="text-sm font-medium text-ink-muted underline-offset-2 hover:text-danger hover:underline"
          >
            Remove kid
          </button>
        )}
      </footer>

      {confirmOpen && (
        <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-ink-primary">
            Remove {kid.name}?
          </p>
          <p className="mt-1 text-xs text-ink-secondary">
            This also deletes their quest history, XP, streaks, and badges
            (DB cascade). Type{" "}
            <strong className="font-bold">{kid.name}</strong> to confirm.
          </p>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={kid.name}
            autoFocus
            className="mt-2 w-full rounded-md border border-ink-muted/30 bg-paper px-3 py-2 text-sm focus:border-danger focus:ring-2 focus:ring-danger/30 focus:outline-none"
          />
          {confirmError && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {confirmError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-full bg-card px-4 py-2 text-sm font-semibold text-ink-secondary shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmRemove}
              disabled={confirmPending}
              className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-danger/90 disabled:opacity-60"
            >
              {confirmPending ? "Removing…" : "Remove permanently"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function AddKidForm({
  onAdded,
  onCancel,
}: {
  onAdded: (row: KidRow) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ChildDraft>({
    name: "",
    age: 7,
    avatar: AVAILABLE_AVATARS[0] ?? "🦊",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await addChild({
        name: draft.name.trim(),
        age: draft.age,
        avatar: draft.avatar,
      });
      if (r.ok && r.data?.childId) {
        onAdded({
          id: r.data.childId,
          name: draft.name.trim(),
          age: draft.age,
          avatar: draft.avatar,
        });
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  const valid = draft.name.trim().length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border-2 border-brand-500/40 bg-card p-5 shadow-sm"
    >
      <p className="text-sm font-bold tracking-wide text-brand-600 uppercase">
        Add a kid
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            First name
          </span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Layla"
            maxLength={24}
            autoFocus
            className="rounded-md border border-ink-muted/30 bg-paper px-3 py-2 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Age
          </span>
          <input
            type="number"
            min={4}
            max={17}
            value={draft.age}
            onChange={(e) =>
              setDraft({
                ...draft,
                age: Number.parseInt(e.target.value, 10) || draft.age,
              })
            }
            className="rounded-md border border-ink-muted/30 bg-paper px-3 py-2 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          Avatar
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {AVAILABLE_AVATARS.map((a) => {
            const on = draft.avatar === a;
            return (
              <button
                type="button"
                key={a}
                onClick={() => setDraft({ ...draft, avatar: a })}
                aria-pressed={on}
                className="inline-flex size-10 items-center justify-center rounded-xl text-xl transition-all"
                style={{
                  border: on
                    ? "2px solid var(--brand-500)"
                    : "2px solid transparent",
                  backgroundColor: on
                    ? "color-mix(in srgb, var(--brand-500) 12%, var(--surface-paper))"
                    : "var(--surface-paper)",
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink-secondary shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || isPending}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add to family"}
        </button>
      </div>
    </form>
  );
}
