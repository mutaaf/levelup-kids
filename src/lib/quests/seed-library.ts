// Hand-written quest templates across all 8 pillars × 3 rough age bands.
// The selector picks from this pool + the household's custom quests
// (table: household_quests), then filters by the child's age.

import type { PillarSlug } from "@/lib/types/pillar";

export type QuestTemplate = {
  pillar: PillarSlug;
  title: string;
  description: string;
  xpReward: number;
  difficulty: 1 | 2 | 3;
  ageMin: number;
  ageMax: number;
};

// Age bands (inclusive):
//   little  4-7
//   middle  8-11
//   big     12-17

const t = (
  pillar: PillarSlug,
  title: string,
  description: string,
  ageBand: "little" | "middle" | "big" | "all",
  xpReward = 5,
  difficulty: 1 | 2 | 3 = 1,
): QuestTemplate => {
  const [ageMin, ageMax] = ageBand === "little"
    ? [4, 7]
    : ageBand === "middle"
      ? [8, 11]
      : ageBand === "big"
        ? [12, 17]
        : [4, 17];
  return { pillar, title, description, xpReward, difficulty, ageMin, ageMax };
};

export const SEED_LIBRARY: readonly QuestTemplate[] = [
  // ---- Scholar (curious & literate) ----
  t("scholar", "Read for 10 minutes", "Your choice of book.", "little"),
  t("scholar", "Learn 3 new words", "Find them, say them, draw what they mean.", "little"),
  t("scholar", "Tell a story you made up", "Use your toys or just your voice. Beginning, middle, end.", "little"),
  t("scholar", "Read for 20 minutes", "Your choice of book. The clock stops when you stop reading.", "middle"),
  t("scholar", "Look up something you wonder about", "One question, one answer. Tell us what you found.", "middle"),
  t("scholar", "Write or tell a short story", "Six sentences is enough. Beginning, middle, end.", "middle"),
  t("scholar", "Read for 30 minutes", "Real reading — not just looking at pictures.", "big"),
  t("scholar", "Teach a younger sibling or friend something", "Five minutes. Watch them try it.", "big"),
  t("scholar", "Write a short reflection", "One paragraph about something you noticed today.", "big"),

  // ---- Athlete (strong & coordinated) ----
  t("athlete", "10 minutes outside", "Move your body. A walk counts. Tag counts.", "little"),
  t("athlete", "Try one stretch", "Hold it while you count to 20.", "little"),
  t("athlete", "Hop, skip, or run 50 steps", "Count them out loud.", "little"),
  t("athlete", "15 minutes outside", "Move your body. A walk counts. A run counts. Tag counts.", "middle"),
  t("athlete", "Practice a sport skill", "Pick one — dribbling, pitching, stretching, balance. 10 focused minutes.", "middle"),
  t("athlete", "20 push-ups, sit-ups, or jumping jacks", "Split however you want. Just finish.", "middle"),
  t("athlete", "30 minutes of real activity", "Heart-up activity. Outside, gym, sport practice — your pick.", "big"),
  t("athlete", "Push your personal record", "Pick one thing you've done before. Beat it by one.", "big"),
  t("athlete", "Stretch routine before bed", "Five minutes. Your back will thank you.", "big"),

  // ---- Builder (hands & engineering) ----
  t("builder", "Build something with blocks", "Five minutes minimum. Bigger than your hand.", "little"),
  t("builder", "Make something out of paper", "Fold it, cut it, glue it. Real making.", "little"),
  t("builder", "Build a fort", "Pillows, blankets, chairs. Crawl inside when done.", "little"),
  t("builder", "Build with Lego or blocks", "Spend 20 minutes making something on purpose, not just stacking.", "middle"),
  t("builder", "Fix or improve something at home", "Tighten a screw. Glue a thing. Ask a grown-up if it's safe.", "middle"),
  t("builder", "Cook or bake one thing", "From a recipe or memory. Clean up after yourself.", "middle"),
  t("builder", "Take something apart and put it back", "Old electronics, a fan, a clock. Learn how it works.", "big"),
  t("builder", "Make something that didn't exist this morning", "Code, woodwork, sewing, electronics — your pick.", "big"),
  t("builder", "Cook a full meal for the family", "Plan it, shop it, make it, plate it.", "big", 10, 2),

  // ---- Creator (art & expression) ----
  t("creator", "Draw a picture", "Anything you can see, remember, or imagine.", "little"),
  t("creator", "Make up a song", "Sing it to someone. Even one verse counts.", "little"),
  t("creator", "Dance for one whole song", "Pick the song. Move how you want.", "little"),
  t("creator", "Sketch something real", "From life — not from a screen.", "middle"),
  t("creator", "Write or record a short poem or rap", "Four lines minimum.", "middle"),
  t("creator", "Take 5 photos with intention", "Frame them on purpose. Show your favorite.", "middle"),
  t("creator", "Create something to share", "Drawing, video, song, story, design. Post-quality.", "big"),
  t("creator", "Practice an instrument for 20 minutes", "Real practice. Not just goofing around.", "big"),
  t("creator", "Write a short piece you'd actually publish", "If you're brave: post it.", "big", 10, 2),

  // ---- Leader (voice & responsibility) ----
  t("leader", "Pick what we do tonight", "You decide. Then make sure it happens.", "little"),
  t("leader", "Teach a sibling or friend one thing", "Something you know how to do. Watch them try it.", "little"),
  t("leader", "Set the table for everyone", "Plates, cups, forks. Where they go.", "little"),
  t("leader", "Plan a family activity", "Pick it, pitch it, lead it.", "middle"),
  t("leader", "Run a family meeting", "Five minutes. One question, three answers.", "middle"),
  t("leader", "Speak up about something that matters", "At dinner, at school, online. Use your voice.", "middle"),
  t("leader", "Mentor someone younger this week", "Ten minutes of real attention.", "big"),
  t("leader", "Take responsibility for a household decision", "Plan a meal, a chore rotation, a trip. Own it.", "big", 10, 2),

  // ---- Character (virtue & faith) ----
  t("character", "Do one kind thing today", "Quietly. Without telling anyone you did it.", "little"),
  t("character", "Say thank you to someone for a real reason", "Specific. 'Thanks for X' beats 'thanks!'", "little"),
  t("character", "Five quiet minutes", "Sit. Think about good things. Pray if your family prays.", "little"),
  t("character", "Reflect for 5 minutes", "Sit. Think about what went well and what didn't.", "middle"),
  t("character", "Apologize for something you owe", "If there's nothing today — tell someone you appreciate them.", "middle"),
  t("character", "Help without being asked", "Notice something that needs doing. Do it.", "middle"),
  t("character", "Stand up for someone today", "In person or online. Quietly is fine.", "big"),
  t("character", "Journal for 10 minutes", "What you're grateful for. What you're working on. What scared you.", "big"),
  t("character", "Do a hard right thing", "The kind where the easy thing was tempting.", "big", 10, 2),

  // ---- Explorer (nature & adventure) ----
  t("explorer", "Find 3 new things outside", "Plants, bugs, clouds, sounds. Name them.", "little"),
  t("explorer", "Try one bite of a new food", "Tell us how it tasted in three words.", "little"),
  t("explorer", "Watch the sky for 5 minutes", "Tell us what you saw.", "little"),
  t("explorer", "Identify 3 plants near home", "Look them up. Tell us their names.", "middle"),
  t("explorer", "Go somewhere you've never been (even nearby)", "A new street, a new path, a new shop.", "middle"),
  t("explorer", "Try a food from another country", "Make it, order it, or taste it at someone's house.", "middle"),
  t("explorer", "Visit somewhere new in your city this week", "A park, a museum, a neighborhood. Photo proof.", "big"),
  t("explorer", "Learn 10 phrases in another language", "Use one with a real person.", "big"),
  t("explorer", "Plan a small adventure for your family", "Day trip, hike, picnic. Own the plan.", "big", 10, 2),

  // ---- Purpose (service & meaning) ----
  t("purpose", "Help a family member with something", "Carry it. Hold it. Reach it.", "little"),
  t("purpose", "Give a toy or book to someone who needs it", "Pick it yourself.", "little"),
  t("purpose", "Make someone smile on purpose", "Tell us who.", "little"),
  t("purpose", "Help a neighbor", "Bring in their trash bin. Hold a door. Ask what they need.", "middle"),
  t("purpose", "Give something away that's still good", "A book, a coat, a game.", "middle"),
  t("purpose", "Do a chore that isn't yours", "Without being asked. Without telling anyone.", "middle"),
  t("purpose", "Volunteer for an hour", "Food bank, mosque/church/temple, animal shelter, anywhere real.", "big", 10, 2),
  t("purpose", "Mentor someone for a week", "Show up consistently. Help them with something hard.", "big", 15, 3),
  t("purpose", "Start a small project that helps someone else", "Could be a fundraiser, a teaching circle, a clean-up.", "big", 15, 3),
] as const;

/** Templates eligible for a child of the given age. */
export function templatesForAge(age: number): QuestTemplate[] {
  return SEED_LIBRARY.filter((t) => age >= t.ageMin && age <= t.ageMax);
}

/** Eligible templates for a child of the given age, filtered to one pillar. */
export function templatesForPillarAndAge(
  p: PillarSlug,
  age: number,
): QuestTemplate[] {
  return SEED_LIBRARY.filter(
    (t) => t.pillar === p && age >= t.ageMin && age <= t.ageMax,
  );
}

/** Legacy helper still used by some callers — returns all templates for a pillar regardless of age. */
export function templatesForPillar(p: PillarSlug): QuestTemplate[] {
  return SEED_LIBRARY.filter((t) => t.pillar === p);
}
