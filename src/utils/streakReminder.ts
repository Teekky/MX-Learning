/**
 * Streak reminder predicate.
 *
 * The reminder system is **in-app only** — no browser notifications, no
 * permission prompts. The dashboard reads `shouldRemind(...)` and shows a
 * banner when it returns true; the in-app toast system handles streak
 * lifecycle events (broken, shield used) separately from this file.
 *
 * Keeping the predicate here (instead of inlining in the dashboard) means
 * any future surface that wants to nudge the user can share the same
 * single source of truth — the conditions can never disagree.
 */

import { isoDate } from './dailyLog'
import type { Settings, UserStats } from '@/types'

export interface ReminderContext {
  settings: Settings
  stats: UserStats
  /** Override "now" — handy for tests. Defaults to actual current time. */
  now?: Date
}

/**
 * Returns true when the dashboard banner should appear: the user opted
 * into reminders, the chosen hour has passed, and they haven't earned
 * any XP today.
 */
export function shouldRemind({
  settings,
  stats,
  now = new Date(),
}: ReminderContext): boolean {
  if (!settings.reminderEnabled) return false
  const hour = now.getHours()
  const targetHour = settings.reminderHour ?? 20
  if (hour < targetHour) return false
  // User already did some XP-earning activity today → no reminder needed.
  if (stats.lastActiveDay === isoDate(now)) return false
  return true
}
