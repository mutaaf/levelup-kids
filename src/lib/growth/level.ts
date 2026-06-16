// XP → Level derivation. The single source of truth referenced by every
// surface that displays a level. v1.0 formula is floor(totalXp / 100).
// Ticket 0012 wires this into the dashboard and approval flow; ticket 0001
// only exists to gate the formula behind a unit test.
export function level(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp < 0) return 0;
  return Math.floor(totalXp / 100);
}
