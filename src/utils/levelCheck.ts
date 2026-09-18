/**
 * Persistence for the CEFR level-check history — one row per completed
 * placement test or later retake, so the profile can show progress over
 * time instead of only the current level.
 */

import { db } from '@/db/database'
import type { Level, LevelCheck } from '@/types'

/** Record a completed test and update the user's current CEFR level. */
export async function recordLevelCheck(
  level: Level,
  score: number,
  maxScore: number,
): Promise<void> {
  const stats = await db.userStats.get(1)
  if (stats) await db.userStats.put({ ...stats, cefrLevel: level })
  await db.levelChecks.add({ date: Date.now(), cefrLevel: level, score, maxScore })
}

/** Full history, most recent first. */
export async function getLevelCheckHistory(): Promise<LevelCheck[]> {
  return db.levelChecks.orderBy('date').reverse().toArray()
}
