import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { resolveDisplayToken } from "@/lib/display/tokens";
import { scoreByPillar } from "@/lib/growth/score";
import { PILLARS, type PillarSlug } from "@/lib/types/pillar";

// Nodejs runtime: resolveDisplayToken pulls in node:crypto via
// src/lib/display/tokens.ts. Edge can't bundle node: built-ins.
export const runtime = "nodejs";

// 1200×630 — canonical OG / Twitter share-card aspect ratio.
const W = 1200;
const H = 630;

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
// The display token IS the auth — same opaque secret a parent generates
// in Settings → Family display. Anyone with the URL can render the card;
// it's meant to embed in OG previews + be forwarded.
//
// 2026-06-24 rewrite: dropped the radar SVG. Satori (the engine behind
// next/og's ImageResponse) has fragile support for <circle>/<line>/
// <polygon>/<text> with camelCase SVG attributes — that block was
// 500-ing in prod with no captured stack trace. The new card is pure
// flex + typography, which Satori renders rock-solid.
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
    svc.from("children").select("id").eq("household_id", householdId),
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

  // Rank pillars with a score. Top one is the headline number. Up to 3
  // shown as the "supporting" pillar row below.
  const ranked = PILLARS.map((p) => ({ pillar: p, score: scores[p] }))
    .filter((r) => r.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top = ranked[0];
  const supporting = ranked.slice(1, 4);

  const headlineTint = top ? PILLAR_TINT[top.pillar] : "#6366f1";
  const headlineNumber = top?.score ?? 0;
  const headlineTitle = top ? PILLAR_TITLE[top.pillar] : "Family";

  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, #ffffff 0%, ${headlineTint}1f 100%)`,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#0f172a",
          padding: 64,
          position: "relative",
        }}
      >
        {/* TOP ROW — brand mark + date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#6366f1",
                borderRadius: 16,
                color: "white",
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              L
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              LevelUp Kids
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            {dateLabel}
          </div>
        </div>

        {/* SPACER */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* HEADLINE — household name + huge score */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              color: "#475569",
              letterSpacing: "-0.01em",
            }}
          >
            {householdName}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 200,
                fontWeight: 900,
                color: headlineTint,
                lineHeight: 1,
                letterSpacing: "-0.05em",
              }}
            >
              {headlineNumber}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                paddingBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                Family growth score
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 44,
                  fontWeight: 800,
                  color: headlineTint,
                  letterSpacing: "-0.02em",
                }}
              >
                {headlineTitle}
              </div>
            </div>
          </div>
        </div>

        {/* SPACER */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* BOTTOM — supporting pillars + url */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            {supporting.map((r) => (
              <div
                key={r.pillar}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingTop: 12,
                  paddingBottom: 12,
                  paddingLeft: 18,
                  paddingRight: 18,
                  background: "white",
                  borderRadius: 999,
                  border: `2px solid ${PILLAR_TINT[r.pillar]}33`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 800,
                    color: PILLAR_TINT[r.pillar],
                  }}
                >
                  {r.score}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#475569",
                  }}
                >
                  {PILLAR_TITLE[r.pillar]}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#94a3b8",
              fontWeight: 600,
            }}
          >
            levelupkids.app
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
