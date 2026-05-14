/**
 * Daily log — per-day rollup of XP, reviews, time, mistakes.
 * Also drives the daily goal widget on the dashboard.
 */

import { db } from '@/db/database'
import type { DailyLog } from '@/types'

/** ISO date string for the given instant (defaults to now), local timezone. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Fetch today's log (or a blank one if none yet). */
export async function getTodayLog(): Promise<DailyLog> {
  const date = isoDate()
  const found = await db.dailyLogs.get(date)
  return (
    found ?? {
      date,
      xpEarned: 0,
      reviewsDone: 0,
      timeSpentSeconds: 0,
      mistakes: 0,
      goalReached: false,
    }
  )
}

export interface ReviewEvent {
  xp: number
  wasCorrect: boolean
  timeSpentSeconds: number
  dailyGoalXp: number
}

/** Atomically update today's log for one review event. */
export async function recordReview(ev: ReviewEvent): Promise<DailyLog> {
  const date = isoDate()
  return db.transaction('rw', db.dailyLogs, async () => {
    const current = (await db.dailyLogs.get(date)) ?? {
      date,
      xpEarned: 0,
      reviewsDone: 0,
      timeSpentSeconds: 0,
      mistakes: 0,
      goalReached: false,
    }
    const updated: DailyLog = {
      ...current,
      xpEarned: current.xpEarned + ev.xp,
      reviewsDone: current.reviewsDone + 1,
      timeSpentSeconds: current.timeSpentSeconds + ev.timeSpentSeconds,
      mistakes: current.mistakes + (ev.wasCorrect ? 0 : 1),
      goalReached: current.xpEarned + ev.xp >= ev.dailyGoalXp,
    }
    await db.dailyLogs.put(updated)
    return updated
  })
}
