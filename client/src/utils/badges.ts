/**
 * Beaver-themed rank tiers based on how many paid renders a user has on
 * a given CV. The editCount lives in the encrypted PDF payload — only the
 * server can produce a higher one, so the badge can't be cheated.
 *
 * Tiers are deliberately small (5) so each step feels meaningful. Labels
 * come from the i18n dictionary (badges.tiers[].label) so they translate.
 *
 *   editCount → tier
 *      0 → 0  Cria (Kit)         — never paid; only for empty state
 *      1 → 1  Aprendiz           — paid once (new CV)
 *    2–3 → 2  Construtor         — first updates landed
 *    4–7 → 3  Mestre              — committed user
 *      8+ → 4  Engenheiro         — top tier
 */
export interface BadgeTier {
  /** 0..4. Use it to look up the i18n label and styling. */
  level: number;
  /** Smallest editCount that earns this tier. */
  threshold: number;
}

export const BADGE_TIERS: BadgeTier[] = [
  { level: 0, threshold: 0 },
  { level: 1, threshold: 1 },
  { level: 2, threshold: 2 },
  { level: 3, threshold: 4 },
  { level: 4, threshold: 8 },
];

/** Resolve the current tier index (0..4) for a given editCount. */
export function tierFor(editCount: number): number {
  let tier = 0;
  for (const t of BADGE_TIERS) if (editCount >= t.threshold) tier = t.level;
  return tier;
}

/** How many more paid edits until the next tier. null if already at top. */
export function nextTierGap(editCount: number): { nextLevel: number; remaining: number } | null {
  const current = tierFor(editCount);
  const next = BADGE_TIERS.find((t) => t.level > current);
  if (!next) return null;
  return { nextLevel: next.level, remaining: next.threshold - editCount };
}
