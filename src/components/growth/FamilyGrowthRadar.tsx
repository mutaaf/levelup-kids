import { PILLARS, type PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";

export type FamilyGrowthRadarProps = {
  scores: Record<PillarSlug, number | null>;
  size?: number;
};

// 8-axis polar radar. Focus pillars are filled and tinted; non-focus axes
// stay grey ticks with a "not in focus" tooltip on hover.
export function FamilyGrowthRadar({
  scores,
  size = 320,
}: FamilyGrowthRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;

  const axes = PILLARS.map((pillar, i) => {
    // Axis 0 points straight up (–90°), then rotate clockwise.
    const angle = (-90 + i * (360 / PILLARS.length)) * (Math.PI / 180);
    const score = scores[pillar];
    const value = score == null ? 0 : score / 100;
    const x = cx + Math.cos(angle) * r * value;
    const y = cy + Math.sin(angle) * r * value;
    const labelX = cx + Math.cos(angle) * (r + 22);
    const labelY = cy + Math.sin(angle) * (r + 22);
    return { pillar, angle, score, value, x, y, labelX, labelY };
  });

  const focusAxes = axes.filter((a) => a.score != null);
  const polygonPoints = focusAxes.length >= 3
    ? focusAxes.map((a) => `${a.x.toFixed(1)},${a.y.toFixed(1)}`).join(" ")
    : "";

  // Average focus color for polygon fill (visual blend of focus pillars).
  const focusTint =
    focusAxes.length > 0
      ? focusAxes[0]!.score != null
        ? PILLAR_COPY[focusAxes[0]!.pillar].tint
        : "var(--ink-muted)"
      : "var(--ink-muted)";

  return (
    <figure className="flex flex-col items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Family Growth Score radar across the eight pillars"
      >
        {/* Concentric rings at 25/50/75/100% */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <circle
            key={t}
            cx={cx}
            cy={cy}
            r={r * t}
            fill="none"
            stroke="var(--ink-muted)"
            strokeOpacity={t === 1 ? 0.35 : 0.15}
            strokeWidth={t === 1 ? 1 : 0.5}
          />
        ))}

        {/* Spokes */}
        {axes.map((a) => {
          const endX = cx + Math.cos(a.angle) * r;
          const endY = cy + Math.sin(a.angle) * r;
          return (
            <line
              key={a.pillar}
              x1={cx}
              y1={cy}
              x2={endX}
              y2={endY}
              stroke="var(--ink-muted)"
              strokeOpacity={0.18}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Focus polygon */}
        {polygonPoints && (
          <polygon
            points={polygonPoints}
            fill={focusTint}
            fillOpacity={0.28}
            stroke={focusTint}
            strokeWidth={1.5}
          />
        )}

        {/* Per-axis dots */}
        {axes.map((a) => {
          if (a.score == null) return null;
          const tint = PILLAR_COPY[a.pillar].tint;
          return (
            <circle
              key={a.pillar}
              cx={a.x}
              cy={a.y}
              r={4}
              fill={tint}
              stroke="white"
              strokeWidth={1}
            />
          );
        })}

        {/* Pillar labels */}
        {axes.map((a) => {
          const isFocus = a.score != null;
          return (
            <text
              key={a.pillar}
              x={a.labelX}
              y={a.labelY}
              fontSize={11}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fill={
                isFocus ? PILLAR_COPY[a.pillar].tint : "var(--ink-muted)"
              }
              fontWeight={isFocus ? 600 : 400}
              textAnchor={
                Math.abs(Math.cos(a.angle)) < 0.2
                  ? "middle"
                  : Math.cos(a.angle) > 0
                    ? "start"
                    : "end"
              }
              dominantBaseline="middle"
            >
              {PILLAR_COPY[a.pillar].title}
              {isFocus && a.score != null && (
                <tspan
                  x={a.labelX}
                  dy={14}
                  fontSize={10}
                  fontWeight={500}
                  fill="var(--ink-secondary)"
                >
                  {a.score}
                </tspan>
              )}
            </text>
          );
        })}
      </svg>
      <figcaption className="text-xs text-ink-secondary">
        Family Growth Score · trailing 28 days
      </figcaption>
    </figure>
  );
}
