// 16-template MVP seed library — 2 quests per pillar, hand-written voice.
// Each template runs across the full 4–17 age band for MVP simplicity; the
// 0008 ticket's full library will narrow age ranges later.

import type { PillarSlug } from "@/lib/types/pillar";

export type QuestTemplate = {
  pillar: PillarSlug;
  title: string;
  description: string;
  xpReward: number;
  difficulty: 1 | 2 | 3;
};

export const SEED_LIBRARY: readonly QuestTemplate[] = [
  // scholar
  {
    pillar: "scholar",
    title: "Read for 20 minutes",
    description:
      "Your choice of book. The clock stops when you stop reading.",
    xpReward: 5,
    difficulty: 1,
  },
  {
    pillar: "scholar",
    title: "Learn 3 new words",
    description: "Find them, write them, say them out loud once each.",
    xpReward: 5,
    difficulty: 1,
  },

  // athlete
  {
    pillar: "athlete",
    title: "15 minutes outside",
    description: "Move your body. A walk counts. A run counts. Tag counts.",
    xpReward: 5,
    difficulty: 1,
  },
  {
    pillar: "athlete",
    title: "Practice a sport skill",
    description:
      "Pick one — dribbling, pitching, stretching, balance. 10 focused minutes.",
    xpReward: 5,
    difficulty: 1,
  },

  // builder
  {
    pillar: "builder",
    title: "Build something with your hands",
    description: "Lego, paper, wood, anything. The doing is the point.",
    xpReward: 5,
    difficulty: 1,
  },
  {
    pillar: "builder",
    title: "Fix something at home",
    description: "Tighten a screw. Glue a thing. Ask a grown-up if it's safe.",
    xpReward: 5,
    difficulty: 1,
  },

  // creator
  {
    pillar: "creator",
    title: "Draw a picture",
    description: "Anything you can see, remember, or imagine.",
    xpReward: 5,
    difficulty: 1,
  },
  {
    pillar: "creator",
    title: "Write or tell a short story",
    description: "Six sentences is enough. Beginning, middle, end.",
    xpReward: 5,
    difficulty: 1,
  },

  // leader
  {
    pillar: "leader",
    title: "Plan something for the family",
    description: "A meal, a movie, a game. Then make it happen.",
    xpReward: 5,
    difficulty: 1,
  },
  {
    pillar: "leader",
    title: "Teach a sibling or friend one thing",
    description: "Something you know how to do. Watch them try it.",
    xpReward: 5,
    difficulty: 1,
  },

  // character
  {
    pillar: "character",
    title: "Do one kind thing today",
    description: "Quietly. Without telling anyone you did it.",
    xpReward: 5,
    difficulty: 1,
  },
  {
    pillar: "character",
    title: "Reflect for 5 minutes",
    description:
      "Sit. Think about what went well and what didn't. Pray if your family prays.",
    xpReward: 5,
    difficulty: 1,
  },

  // explorer
  {
    pillar: "explorer",
    title: "Find 3 new things outside",
    description: "Plants, bugs, clouds, sounds. Name them.",
    xpReward: 5,
    difficulty: 1,
  },
  {
    pillar: "explorer",
    title: "Try a new food",
    description: "One bite. Tell us how it tasted in three words.",
    xpReward: 5,
    difficulty: 1,
  },

  // purpose
  {
    pillar: "purpose",
    title: "Help a neighbor or family member",
    description:
      "Carry something. Open a door. Ask if there's something you can do.",
    xpReward: 5,
    difficulty: 1,
  },
  {
    pillar: "purpose",
    title: "Give something away",
    description: "A toy, a book, a kind word. To someone who needs it.",
    xpReward: 5,
    difficulty: 1,
  },
] as const;

/** Return all templates for the given pillar. */
export function templatesForPillar(p: PillarSlug): QuestTemplate[] {
  return SEED_LIBRARY.filter((t) => t.pillar === p);
}
