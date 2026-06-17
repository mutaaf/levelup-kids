// 12 emoji avatars — MVP stand-in for the hand-drawn SVG set the design
// system will ship in v1.1. Friendly, recognizable, mobile-clear.

export const AVATARS = [
  "🦊",
  "🦁",
  "🐯",
  "🐻",
  "🐨",
  "🐼",
  "🦒",
  "🦓",
  "🦄",
  "🐶",
  "🐱",
  "🐰",
] as const;

export type Avatar = (typeof AVATARS)[number];

export function isAvatar(v: unknown): v is Avatar {
  return typeof v === "string" && (AVATARS as readonly string[]).includes(v);
}
