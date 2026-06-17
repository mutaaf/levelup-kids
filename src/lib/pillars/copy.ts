// Display copy for the eight pillars. One-sentence body per pillar, the
// kind a parent reads to a 7-year-old without having to translate.

import type { PillarSlug } from "@/lib/types/pillar";

export type PillarCopy = {
  title: string;
  body: string;
  tint: string; // CSS variable name from src/styles/tokens.css
};

export const PILLAR_COPY: Record<PillarSlug, PillarCopy> = {
  scholar: {
    title: "Scholar",
    body: "Curious and literate. The kid who reads when no one is asking.",
    tint: "var(--pillar-scholar)",
  },
  athlete: {
    title: "Athlete",
    body: "Strong and coordinated. The kid who moves their body for the joy of it.",
    tint: "var(--pillar-athlete)",
  },
  builder: {
    title: "Builder",
    body: "Hands that make things. The kid who would rather assemble than buy.",
    tint: "var(--pillar-builder)",
  },
  creator: {
    title: "Creator",
    body: "Voice through art. The kid who draws, writes, or makes a song.",
    tint: "var(--pillar-creator)",
  },
  leader: {
    title: "Leader",
    body: "Voice with responsibility. The kid who plans something and follows through.",
    tint: "var(--pillar-leader)",
  },
  character: {
    title: "Character",
    body: "Virtue and faith. The kid who does the right thing when no one is watching.",
    tint: "var(--pillar-character)",
  },
  explorer: {
    title: "Explorer",
    body: "Nature and adventure. The kid who is curious about the world outside.",
    tint: "var(--pillar-explorer)",
  },
  purpose: {
    title: "Purpose",
    body: "Service and meaning. The kid who looks for who needs help.",
    tint: "var(--pillar-purpose)",
  },
};
