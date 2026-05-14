/**
 * CEFR level gating for exercise content.
 *
 * When the user selects (or the onboarding detects) a specific CEFR level,
 * we must respect it: an A1 learner should NOT be flooded with C1 vocab
 * just because the seed happens to contain C1 words.
 *
 * Rule used across the app:
 *   "Show me words at my level and up to ONE level above, for stretch."
 *
 * That keeps the pool rich enough for fresh installs (the seed is biased
 * toward B2/C1) while still honouring the user's choice.
 */

import type { Level, Word } from '@/types'

const ORDER: Record<Level, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
}

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/**
 * Returns the list of CEFR levels a learner at `userLevel` should see.
 * By default includes their level and one above (stretch=1).
 */
export function allowedLevelsFor(userLevel: Level, stretch = 1): Level[] {
  const max = ORDER[userLevel] + stretch
  return LEVELS.filter((lv) => ORDER[lv] <= max)
}

/** True iff the word is at or below `userLevel + stretch`. */
export function isLevelAllowed(
  word: Word,
  userLevel: Level,
  stretch = 1,
): boolean {
  return ORDER[word.level] <= ORDER[userLevel] + stretch
}
