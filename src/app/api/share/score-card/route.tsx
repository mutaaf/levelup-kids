import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { resolveDisplayToken } from "@/lib/display/tokens";
import { scoreByPillar } from "@/lib/growth/score";
import { PILLARS, type PillarSlug } from "@/lib/types/pillar";

// Note: this route uses next/og's ImageResponse, which is happy on either
// runtime. We use "nodejs" because resolveDisplayToken pulls in
// src/lib/display/tokens.ts, which imports node:crypto for randomBytes —
// the edge runtime can't bundle node: built-ins.
export const runtime = "nodejs";

// 1200×630 — the canonical Open Graph / Twitter share-card aspect ratio.
const W = 1200;
const H = 630;
const CX = 380;
const CY = H / 2 + 10;
const R = 200;

const PILLAR_TINT: Record<PillarSlug, string> = {
  scholar: "#f59e0b",
  athlete: "#22c55e",
  builder: "#d97706",
  creator: "#ec4899",
  leader: "#0ea5e9",
  character: "#8b5cf6",
  explorer: "#14b8a6",
  purpose: "#ef4444",
};

const PILLAR_TITLE: Record<PillarSlug, string> = {
  scholar: "Scholar",
  athlete: "Athlete",
  builder: "Builder",
  creator: "Creator",
  leader: "Leader",
  character: "Character",
  explorer: "Explorer",
  purpose: "Purpose",
};

// GET /api/share/score-card?token=<displayToken>
//
// The display token is the share auth — same opaque secret a parent
// generates in Settings → Family display. Anyone with the URL can render
// the card. We deliberately don't require a session: the card is the
// share artifact, meant to be embedded in OG previews and forwarded.
export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response("Missing token.", { status: 400 });
  }
  const resolved = await resolveDisplayToken(token);
  if (!resolved) {
    return new Response("Invalid or revoked token.", { status: 404 });
  }
  const { householdId } = resolved;

  const svc = createServiceSupabase();
  const [{ data: household }, { data: kids }] = await Promise.all([
    svc
      .from("households")
      .select("name, focus_pillars")
      .eq("id", householdId)
      .maybeSingle(),
    svc
      .from("children")
      .select("id")
      .eq("household_id", householdId),
  ]);

  const householdName = (household?.name as string) ?? "Your household";
  const focusPillars =
    ((household?.focus_pillars as string[] | null) ?? []) as PillarSlug[];
  const childIds = (kids ?? []).map((c) => c.id as string);

  const completionsForScore: { pillar: PillarSlug; approvedAt: string }[] = [];
  if (childIds.length > 0) {
    const { data: comps } = await svc
      .from("quest_completions")
      .select("approved_at, quests:quests(pillar)")
      .in("child_id", childIds)
      .not("approved_at", "is", null);
    for (const c of comps ?? []) {
      const pillar =
        ((c.quests as unknown as { pillar?: PillarSlug } | null)?.pillar ??
          "scholar") as PillarSlug;
      completionsForScore.push({
        pillar,
        approvedAt: c.approved_at as string,
      });
    }
  }

  const scores = scoreByPillar({
    focusPillars,
    childrenCount: childIds.length || 1,
    completions: completionsForScore,
  });

  // Compute axis points for the radar.
  const axes = PILLARS.map((pillar, i) => {
    const angle = (-90 + i * (360 / PILLARS.length)) * (Math.PI / 180);
    const score = scores[pillar];
    const value = score == null ? 0 : score / 100;
    const x = CX + Math.cos(angle) * R * value;
    const y = CY + Math.sin(angle) * R * value;
    const labelX = CX + Math.cos(angle) * (R + 40);
    const labelY = CY + Math.sin(angle) * (R + 40);
    return { pillar, angle, score, value, x, y, labelX, labelY };
  });
  const focusAxes = axes.filter((a) => a.score != null);
  const polygonPoints = focusAxes.length >= 3
    ? focusAxes.map((a) => `${a.x.toFixed(1)},${a.y.toFixed(1)}`).join(" ")
    : "";

  const focusTint =
    focusAxes.length > 0
      ? PILLAR_TINT[focusAxes[0]!.pillar]
      : "#6366f1";

  // Top focus pillar (highest score) — surfaces as the headline number.
  const topFocus = focusAxes
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const weekLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          background:
            "linear-gradient(135deg, #f7f8fb 0%, #eef2ff 100%)",
          display: "flex",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          color: "#0f172a",
          position: "relative",
        }}
      >
        {/* Radar (left) */}
        <svg
          width={W * 0.55}
          height={H}
          viewBox={`0 0 ${W * 0.55} ${H}`}
          style={{ display: "block" }}
        >
          {/* concentric rings */}
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <circle
              key={t}
              cx={CX}
              cy={CY}
              r={R * t}
              fill="none"
              stroke="#94a3b8"
              strokeOpacity={t === 1 ? 0.35 : 0.15}
              strokeWidth={t === 1 ? 1.5 : 0.75}
            />
          ))}
          {/* spokes */}
          {axes.map((a) => {
            const endX = CX + Math.cos(a.angle) * R;
            const endY = CY + Math.sin(a.angle) * R;
            return (
              <line
                key={a.pillar}
                x1={CX}
                y1={CY}
                x2={endX}
                y2={endY}
                stroke="#94a3b8"
                strokeOpacity={0.2}
                strokeWidth={0.75}
              />
            );
          })}
          {/* focus polygon */}
          {polygonPoints && (
            <polygon
              points={polygonPoints}
              fill={focusTint}
              fillOpacity={0.3}
              stroke={focusTint}
              strokeWidth={2.5}
            />
          )}
          {/* dots */}
          {axes.map((a) =>
            a.score == null ? null : (
              <circle
                key={a.pillar}
                cx={a.x}
                cy={a.y}
                r={7}
                fill={PILLAR_TINT[a.pillar]}
                stroke="white"
                strokeWidth={2}
              />
            ),
          )}
          {/* labels */}
          {axes.map((a) => {
            const isFocus = a.score != null;
            const anchor =
              Math.abs(Math.cos(a.angle)) < 0.2
                ? "middle"
                : Math.cos(a.angle) > 0
                  ? "start"
                  : "end";
            return (
              <text
                key={a.pillar}
                x={a.labelX}
                y={a.labelY}
                fontSize={20}
                fontWeight={700}
                fill={isFocus ? PILLAR_TINT[a.pillar] : "#94a3b8"}
                textAnchor={anchor}
                dominantBaseline="middle"
              >
                {PILLAR_TITLE[a.pillar]}
              </text>
            );
          })}
        </svg>

        {/* Right column: brand mark + household + top score */}
        <div
          style={{
            position: "absolute",
            right: 60,
            top: 60,
            bottom: 60,
            width: W * 0.4,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                background: "#6366f1",
                borderRadius: 16,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              L
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              LevelUp Kids
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.18em",
                color: "#6366f1",
                textTransform: "uppercase",
              }}
            >
              Family Growth Score
            </span>
            <span
              style={{
                fontSize: 64,
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#0f172a",
              }}
            >
              {householdName}
            </span>
            {topFocus && topFocus.score != null && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                <span style={{ fontSize: 18, color: "#475569" }}>
                  Leading pillar this season
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 86,
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      color: PILLAR_TINT[topFocus.pillar],
                      lineHeight: 1,
                    }}
                  >
                    {topFocus.score}
                  </span>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: PILLAR_TINT[topFocus.pillar],
                    }}
                  >
                    / 100 · {PILLAR_TITLE[topFocus.pillar]}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              color: "#94a3b8",
              fontSize: 16,
            }}
          >
            <span>levelupkids.app</span>
            <span style={{ fontSize: 14 }}>{weekLabel}</span>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    },
  );
}
