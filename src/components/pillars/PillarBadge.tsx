import type { PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";

export function PillarBadge({
  pillar,
  size = "sm",
}: {
  pillar: PillarSlug;
  size?: "sm" | "md";
}) {
  const copy = PILLAR_COPY[pillar];
  const padding = size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${padding} font-medium`}
      style={{
        backgroundColor: copy.tint,
        color: "white",
      }}
    >
      {copy.title}
    </span>
  );
}
