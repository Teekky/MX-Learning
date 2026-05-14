/**
 * Achievement catalog + idempotent unlock evaluator.
 *
 * Call `checkAndUnlockAchievements(ctx)` after any event that could trigger
 * an unlock (XP gain, streak bump, combo bump). It returns the list of
 * achievements that were unlocked *this call* — the store pushes each one
 * as a toast.
 *
 * Achievements are stored in Dexie's `achievements` table by id, so unlocks
 * are persistent and safely idempotent (we skip anything already unlocked).
 */

import { db } from '@/db/database'
import type { Achievement, DailyLog, UserStats } from '@/types'

export interface AchievementContext {
  stats: UserStats
  dailyLog?: DailyLog
  /** Current combo count (consecutive correct answers in-session). */
  comboCount?: number
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  /** Unicode glyph — matches sidebar style. */
  icon: string
  predicate: (ctx: AchievementContext) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- First steps --------------------------------------------------------
  {
    id: 'first-review',
    name: 'First step',
    description: 'Complete your very first review.',
    icon: '◇',
    predicate: ({ stats }) => stats.totalReviews >= 1,
  },
  {
    id: 'reviews-50',
    name: 'Warming up',
    description: 'Complete 50 reviews.',
    icon: '◈',
    predicate: ({ stats }) => stats.totalReviews >= 50,
  },
  {
    id: 'reviews-200',
    name: 'Steady learner',
    description: 'Complete 200 reviews.',
    icon: '◆',
    predicate: ({ stats }) => stats.totalReviews >= 200,
  },
  {
    id: 'reviews-500',
    name: 'Dedicated',
    description: 'Complete 500 reviews.',
    icon: '◆',
    predicate: ({ stats }) => stats.totalReviews >= 500,
  },
  {
    id: 'reviews-2000',
    name: 'Marathoner',
    description: 'Complete 2,000 reviews.',
    icon: '◆',
    predicate: ({ stats }) => stats.totalReviews >= 2000,
  },

  // --- Streaks ------------------------------------------------------------
  {
    id: 'streak-3',
    name: 'On a roll',
    description: 'Reach a 3-day streak.',
    icon: '◔',
    predicate: ({ stats }) => stats.currentStreak >= 3,
  },
  {
    id: 'streak-7',
    name: 'One week in',
    description: 'Reach a 7-day streak.',
    icon: '◐',
    predicate: ({ stats }) => stats.currentStreak >= 7,
  },
  {
    id: 'streak-14',
    name: 'Fortnight strong',
    description: 'Reach a 14-day streak.',
    icon: '◑',
    predicate: ({ stats }) => stats.currentStreak >= 14,
  },
  {
    id: 'streak-30',
    name: 'Committed',
    description: 'Reach a 30-day streak.',
    icon: '●',
    predicate: ({ stats }) => stats.currentStreak >= 30,
  },
  {
    id: 'streak-100',
    name: 'Centurion',
    description: 'Reach a 100-day streak.',
    icon: '★',
    predicate: ({ stats }) => stats.currentStreak >= 100,
  },
  {
    id: 'streak-365',
    name: 'A year of English',
    description: 'Reach a 365-day streak.',
    icon: '✪',
    predicate: ({ stats }) => stats.currentStreak >= 365,
  },

  // --- XP milestones ------------------------------------------------------
  {
    id: 'xp-100',
    name: 'Rising',
    description: 'Earn your first 100 XP.',
    icon: '◯',
    predicate: ({ stats }) => stats.xp >= 100,
  },
  {
    id: 'xp-1000',
    name: 'Grinding',
    description: 'Earn 1,000 XP.',
    icon: '◎',
    predicate: ({ stats }) => stats.xp >= 1000,
  },
  {
    id: 'xp-5000',
    name: 'Seasoned',
    description: 'Earn 5,000 XP.',
    icon: '◉',
    predicate: ({ stats }) => stats.xp >= 5000,
  },
  {
    id: 'xp-25000',
    name: 'Master grinder',
    description: 'Earn 25,000 XP.',
    icon: '✺',
    predicate: ({ stats }) => stats.xp >= 25000,
  },

  // --- Level milestones ---------------------------------------------------
  {
    id: 'level-up',
    name: 'Up a notch',
    description: 'Reach level 2.',
    icon: '◬',
    predicate: ({ stats }) => stats.level >= 1,
  },
  {
    id: 'level-5',
    name: 'Climber',
    description: 'Reach level 5.',
    icon: '◭',
    predicate: ({ stats }) => stats.level >= 4,
  },
  {
    id: 'level-10',
    name: 'High altitude',
    description: 'Reach level 10.',
    icon: '◮',
    predicate: ({ stats }) => stats.level >= 9,
  },

  // --- Daily goal ---------------------------------------------------------
  {
    id: 'daily-goal-first',
    name: 'Goal getter',
    description: 'Hit your daily XP goal for the first time.',
    icon: '✦',
    predicate: ({ dailyLog }) => !!dailyLog?.goalReached,
  },
  {
    id: 'daily-goal-double',
    name: 'Overachiever',
    description: 'Earn double your daily XP goal in a single day.',
    icon: '✧',
    predicate: ({ dailyLog, stats }) =>
      !!dailyLog && dailyLog.xpEarned >= stats.dailyGoalXp * 2,
  },
  {
    id: 'reviews-100-day',
    name: 'Sprinter',
    description: 'Do 100 reviews in a single day.',
    icon: '✶',
    predicate: ({ dailyLog }) => (dailyLog?.reviewsDone ?? 0) >= 100,
  },
  {
    id: 'flawless-day',
    name: 'Flawless day',
    description: 'Finish a day with at least 20 reviews and zero mistakes.',
    icon: '✷',
    predicate: ({ dailyLog }) =>
      !!dailyLog && dailyLog.reviewsDone >= 20 && dailyLog.mistakes === 0,
  },

  // --- Combo --------------------------------------------------------------
  {
    id: 'combo-10',
    name: 'On fire',
    description: 'Chain 10 correct answers in under 2 minutes.',
    icon: '✸',
    predicate: ({ comboCount }) => (comboCount ?? 0) >= 10,
  },
  {
    id: 'combo-25',
    name: 'Unstoppable',
    description: 'Chain 25 correct answers without breaking the rhythm.',
    icon: '✹',
    predicate: ({ comboCount }) => (comboCount ?? 0) >= 25,
  },

  // --- Streak shields -----------------------------------------------------
  {
    id: 'shield-cap',
    name: 'Fortified',
    description: 'Bank the maximum number of streak shields.',
    icon: '🛡',
    predicate: ({ stats }) => stats.streakShields >= 3,
  },
]

/**
 * Compare the current context against every achievement definition and
 * persist any that just met their predicate. Returns the newly-unlocked
 * definitions in their catalog order.
 */
export async function checkAndUnlockAchievements(
  ctx: AchievementContext,
): Promise<AchievementDef[]> {
  const existing = await db.achievements.toArray()
  const unlockedIds = new Set(existing.map((a) => a.id))
  const newlyUnlocked: AchievementDef[] = []

  for (const def of ACHIEVEMENTS) {
    if (unlockedIds.has(def.id)) continue
    if (!def.predicate(ctx)) continue
    const record: Achievement = {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      unlockedAt: Date.now(),
    }
    await db.achievements.put(record)
    newlyUnlocked.push(def)
  }
  return newlyUnlocked
}

/** All achievements with unlock state joined in. Used by the Profile page. */
export async function getAllAchievements(): Promise<
  Array<AchievementDef & { unlockedAt?: number }>
> {
  const unlocked = await db.achievements.toArray()
  const byId = new Map(unlocked.map((a) => [a.id, a.unlockedAt]))
  return ACHIEVEMENTS.map((def) => ({
    ...def,
    unlockedAt: byId.get(def.id),
  }))
}
