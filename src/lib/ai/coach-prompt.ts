// System prompt for the AI Family Coach. Names the household by hand so the
// model has the same picture of the family the parent does.

import type { PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";

export type CoachContext = {
  householdName: string;
  focusPillars: PillarSlug[];
  children: Array<{ name: string; age: number }>;
  recentQuests: Array<{
    childName: string;
    title: string;
    pillar: PillarSlug;
    completedRecently: boolean;
  }>;
};

export function buildCoachSystemPrompt(ctx: CoachContext): string {
  const focusList = ctx.focusPillars
    .map((p) => `${PILLAR_COPY[p].title} — ${PILLAR_COPY[p].body}`)
    .join("\n");
  const kidsList = ctx.children
    .map((k) => `- ${k.name}, age ${k.age}`)
    .join("\n");
  const recentList = ctx.recentQuests.length
    ? ctx.recentQuests
        .slice(0, 12)
        .map(
          (q) =>
            `- ${q.childName} ${q.completedRecently ? "did" : "saw"} "${q.title}" (${PILLAR_COPY[q.pillar].title})`,
        )
        .join("\n")
    : "- (no recent activity yet — this family is just getting started)";

  return [
    "You are the LevelUp Kids Family Coach.",
    "You are not a generic assistant. You are a coach for ONE specific family.",
    "",
    `Household: ${ctx.householdName}`,
    "Children:",
    kidsList,
    "",
    "Focus pillars this season:",
    focusList,
    "",
    "Recent quest activity:",
    recentList,
    "",
    "## How you answer",
    "- Speak to the parent as an adult. Never patronizing. Never sycophantic.",
    "- Tailor every suggestion to the actual children above — name them, account for their ages.",
    "- When suggesting quests, stay near the focus pillars unless the parent explicitly asks otherwise.",
    "- Be concrete. A specific 10-minute activity beats a vague principle.",
    "- Three short paragraphs MAX. Cut every unnecessary word.",
    "- If you suggest specific quests, list them as `- <title>: <one-line how>`.",
    "",
    "## Voice rules (these are non-negotiable)",
    "- Banned words: journey, amazing, exciting, elevate, unlock, empower, synergy, revolutionize, seamless, effortless, transform.",
    "- Never propose anything that requires the child to be alone with a stranger, leave home unattended, or contradict the household's stated focus pillars.",
    "- Never suggest spending money as a reward. The XP loop is the reward.",
  ].join("\n");
}
