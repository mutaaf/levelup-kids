// Inline-styled HTML for the weekly recap email. Mirrors the
// supabase/templates/magic_link.html visual language so the brand reads
// consistently across the lifecycle.

import type { WeeklyRecap } from "@/lib/recap/snapshot";
import { pillarTitle } from "@/lib/recap/snapshot";
import { BADGES } from "@/lib/achievements/badges";
import type { PillarSlug } from "@/lib/types/pillar";

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

const BASE_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deltaCopy(curr: number, prev: number): string {
  if (prev === 0 && curr === 0) return "Quiet week. Pick one quest tonight.";
  if (prev === 0) return `Up from zero — keep it going next week.`;
  if (curr === prev) return `Same pace as last week.`;
  if (curr > prev) {
    const pct = Math.round(((curr - prev) / prev) * 100);
    return `Up ${pct}% on last week.`;
  }
  const pct = Math.round(((prev - curr) / prev) * 100);
  return `Down ${pct}% from last week. Worth a check-in.`;
}

export function renderWeeklyRecap(args: {
  recap: WeeklyRecap;
  parentName: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { recap, parentName, appUrl } = args;
  const firstName = parentName.split(" ")[0] || "";

  const subject = recap.thisWeek.completions > 0
    ? `${recap.householdName}: ${recap.thisWeek.completions} quests, ${recap.thisWeek.xp} XP this week`
    : `${recap.householdName}: a quiet week — easy to restart`;

  const shareCardImg = recap.shareToken
    ? `${appUrl}/api/share/score-card?token=${encodeURIComponent(recap.shareToken)}`
    : null;

  const topPillarBlock = recap.topPillar
    ? `<tr>
        <td style="padding: 0 0 18px 0;">
          <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.16em; color: ${PILLAR_TINT[recap.topPillar.pillar]}; text-transform: uppercase;">
            Top pillar
          </div>
          <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 4px;">
            ${esc(pillarTitle(recap.topPillar.pillar))} · ${recap.topPillar.count} quest${recap.topPillar.count === 1 ? "" : "s"}
          </div>
        </td>
      </tr>`
    : "";

  const topChildBlock = recap.topChild
    ? `<tr>
        <td style="padding: 0 0 18px 0;">
          <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.16em; color: #6366f1; text-transform: uppercase;">
            Most XP this week
          </div>
          <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 4px;">
            ${esc(recap.topChild.name)} · ${recap.topChild.xp} XP
          </div>
        </td>
      </tr>`
    : "";

  const childRows = recap.thisWeek.byChild
    .slice(0, 6)
    .map(
      (c) => `<tr>
        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; font-size: 15px; color: #0f172a;">
          <strong style="font-weight: 700;">${esc(c.name)}</strong>
        </td>
        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; font-size: 15px; color: #475569; text-align: right;">
          ${c.completions} quest${c.completions === 1 ? "" : "s"} · ${c.xp} XP
        </td>
      </tr>`,
    )
    .join("");

  const childTable = childRows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 4px;">
        ${childRows}
      </table>`
    : `<p style="font-size: 15px; color: #475569; margin: 0;">No approved quests yet this week.</p>`;

  const badgeChips = recap.newBadges
    .map((b) => {
      const def = BADGES.find((d) => d.id === b.badgeId);
      const title = def?.title ?? b.badgeId;
      const tint =
        def && def.pillar !== "any" ? PILLAR_TINT[def.pillar] : "#6366f1";
      return `<span style="display: inline-block; padding: 6px 12px; margin: 4px 6px 0 0; border-radius: 999px; background: ${tint}1a; color: ${tint}; font-size: 13px; font-weight: 700;">${esc(b.childName)} · ${esc(title)}</span>`;
    })
    .join("");

  const badgesBlock = recap.newBadges.length
    ? `<tr>
        <td style="padding: 8px 0 24px 0;">
          <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.16em; color: #475569; text-transform: uppercase;">
            New badges this week
          </div>
          <div style="margin-top: 6px;">${badgeChips}</div>
        </td>
      </tr>`
    : "";

  const shareBlock = shareCardImg
    ? `<tr>
        <td style="padding: 24px 0 8px 0;">
          <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.16em; color: #475569; text-transform: uppercase;">
            This week's score card
          </div>
          <a href="${esc(appUrl)}" style="display: block; margin-top: 10px; border-radius: 16px; overflow: hidden;">
            <img src="${esc(shareCardImg)}" alt="${esc(recap.householdName)} Family Growth Score" width="520" style="display: block; width: 100%; max-width: 520px; height: auto; border: 0;" />
          </a>
        </td>
      </tr>`
    : "";

  const greeting = firstName ? `Hi ${esc(firstName)},` : "Hi,";

  const html = `<!doctype html>
<html lang="en">
  <body style="margin: 0; padding: 0; background-color: #f7f8fb; color: #0f172a; font-family: ${BASE_FONT}; font-size: 16px; line-height: 1.55; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f8fb; padding: 40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 18px 40px -12px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04); overflow: hidden;">
            <tr>
              <td style="padding: 36px 36px 12px 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <div style="display: inline-block; width: 44px; height: 44px; background-color: #6366f1; border-radius: 14px; color: #ffffff; font-size: 24px; font-weight: 800; text-align: center; line-height: 44px; letter-spacing: -0.04em;">L</div>
                    </td>
                    <td style="padding-left: 12px; font-size: 18px; font-weight: 700; color: #0f172a;">
                      LevelUp Kids
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 36px 0 36px;">
                <h1 style="margin: 18px 0 6px 0; font-size: 26px; line-height: 1.2; letter-spacing: -0.02em; font-weight: 800; color: #0f172a;">
                  ${esc(recap.householdName)} · week in review
                </h1>
                <p style="margin: 0 0 22px 0; font-size: 15px; color: #475569;">
                  ${greeting} here's what your family put down this week.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 36px 8px 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #eef2ff; border-radius: 18px;">
                  <tr>
                    <td style="padding: 18px 20px;">
                      <div style="font-size: 13px; font-weight: 700; color: #6366f1; letter-spacing: 0.04em;">This week</div>
                      <div style="font-size: 34px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1.05; margin-top: 4px;">
                        ${recap.thisWeek.completions} quest${recap.thisWeek.completions === 1 ? "" : "s"} · ${recap.thisWeek.xp} XP
                      </div>
                      <div style="margin-top: 6px; font-size: 14px; color: #475569;">
                        ${esc(deltaCopy(recap.thisWeek.completions, recap.priorWeek.completions))}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 36px 0 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${topPillarBlock}
                  ${topChildBlock}
                  <tr>
                    <td style="padding: 0 0 6px 0;">
                      <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.16em; color: #475569; text-transform: uppercase;">
                        Per child
                      </div>
                    </td>
                  </tr>
                </table>
                ${childTable}
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 36px 0 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${badgesBlock}
                  ${shareBlock}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 36px 8px 36px;">
                <a href="${esc(appUrl)}" style="display: inline-block; background: #6366f1; color: #ffffff; font-weight: 700; font-size: 15px; padding: 12px 22px; border-radius: 999px; text-decoration: none;">Open the family dashboard</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 36px 32px 36px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  You're getting this because you're a parent on ${esc(recap.householdName)} in LevelUp Kids. Reply to mute or change cadence.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    `${recap.householdName} — week in review`,
    "",
    `${greeting}`,
    `${recap.thisWeek.completions} quests approved · ${recap.thisWeek.xp} XP earned`,
    deltaCopy(recap.thisWeek.completions, recap.priorWeek.completions),
    "",
    recap.topPillar
      ? `Top pillar: ${pillarTitle(recap.topPillar.pillar)} (${recap.topPillar.count})`
      : "",
    recap.topChild ? `Most XP: ${recap.topChild.name} (${recap.topChild.xp})` : "",
    recap.newBadges.length
      ? `New badges: ${recap.newBadges.map((b) => `${b.childName} · ${BADGES.find((d) => d.id === b.badgeId)?.title ?? b.badgeId}`).join(", ")}`
      : "",
    "",
    `Open: ${appUrl}`,
  ].filter(Boolean);

  return { subject, html, text: textLines.join("\n") };
}
