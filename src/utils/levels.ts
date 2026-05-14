/**
 * XP → level progression.
 * Names go from "Novice" (0) to "Virtuoso" (top), per the spec.
 */

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 1750, 2750, 4250, 6500, 10000, 15000, 22000, 32000,
] as const

const LEVEL_NAMES = [
  'Novice',
  'Beginner',
  'Apprentice',
  'Practitioner',
  'Skilled',
  'Proficient',
  'Advanced',
  'Senior',
  'Expert',
  'Master',
  'Virtuoso',
  'Legend',
  'Mythic',
] as const

export function levelFromXp(xp: number): {
  level: number
  name: string
  current: number
  next: number
  progress: number // 0..1 inside current level
} {
  let level = 0
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i
      break
    }
  }
  const current = LEVEL_THRESHOLDS[level]
  const next =
    level + 1 < LEVEL_THRESHOLDS.length
      ? LEVEL_THRESHOLDS[level + 1]
      : current * 2
  const progress = (xp - current) / (next - current)
  return {
    level,
    name: LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)],
    current,
    next,
    progress: Math.max(0, Math.min(1, progress)),
  }
}

/** XP awarded for a review based on quality + difficulty. */
export function xpForReview(quality: number, difficultyScore: number): number {
  if (quality < 3) return 1 // small consolation XP for wrong answers
  const base = quality * 2 // 6, 8, 10 for quality 3,4,5
  const difficultyBonus = Math.round(difficultyScore * 5) // up to +5
  return base + difficultyBonus
}
