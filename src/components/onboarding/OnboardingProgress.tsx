// Bigger, friendlier step indicator than the original tracking-widest pill.

export function OnboardingProgress({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const done = i < step;
          const current = i === step - 1;
          return (
            <span
              key={i}
              aria-hidden
              className="h-2 flex-1 rounded-full transition-all"
              style={{
                backgroundColor: done
                  ? "var(--brand-500)"
                  : "color-mix(in srgb, var(--ink-muted) 18%, transparent)",
                maxWidth: current ? "56px" : "32px",
              }}
            />
          );
        })}
      </div>
      <p className="text-sm font-semibold text-ink-secondary">
        Step {step} of {total}
        {label ? ` · ${label}` : ""}
      </p>
    </div>
  );
}
