// Vercel-scheduled weekly recap. Fires Sunday 17:00 UTC (= 10am Pacific,
// 1pm Eastern) per vercel.json. Iterates every household, builds the
// snapshot, and sends one recap per parent.
//
// Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. We
// reject anything else with 401 so the endpoint can't be triggered from
// the public internet.

import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { buildHouseholdRecap } from "@/lib/recap/snapshot";
import { renderWeeklyRecap } from "@/lib/recap/render";
import { sendEmail } from "@/lib/email/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel cron jobs only get up to 60s on hobby; bump headroom for many households.
export const maxDuration = 300;

type Summary = {
  ok: boolean;
  ranAt: string;
  householdsProcessed: number;
  emailsSent: number;
  emailsSkipped: number;
  errors: Array<{ householdId: string; error: string }>;
};

function appBaseUrl(request: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  // Vercel sets NEXT_PUBLIC_VERCEL_URL on previews / prod (no scheme).
  const v = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/\/+$/, "")}`;
  // Fall back to the incoming request origin.
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function runCron(request: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "").trim();
  if (!secret || provided !== secret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const svc = createServiceSupabase();
  const { data: households, error } = await svc
    .from("households")
    .select("id");
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const summary: Summary = {
    ok: true,
    ranAt: new Date().toISOString(),
    householdsProcessed: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    errors: [],
  };

  const baseUrl = appBaseUrl(request);

  for (const h of households ?? []) {
    const householdId = h.id as string;
    summary.householdsProcessed += 1;
    try {
      const recap = await buildHouseholdRecap(householdId);
      if (!recap || recap.parents.length === 0) continue;
      for (const parent of recap.parents) {
        const { subject, html, text } = renderWeeklyRecap({
          recap,
          parentName: parent.name || "",
          appUrl: baseUrl,
        });
        const r = await sendEmail({
          to: parent.email,
          subject,
          html,
          text,
        });
        if (r.ok) summary.emailsSent += 1;
        else summary.emailsSkipped += 1;
      }
    } catch (e) {
      summary.errors.push({
        householdId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json(summary);
}

// Vercel triggers GET for scheduled crons.
export async function GET(request: NextRequest): Promise<Response> {
  return runCron(request);
}

// Allow POST for manual reruns (curl with the secret) without changing schedules.
export async function POST(request: NextRequest): Promise<Response> {
  return runCron(request);
}
