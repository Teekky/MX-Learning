/**
 * Streak helpers — daily learning streak tracking, with shield protection.
 *
 * Streak rules:
 *   - Activity on the SAME day as `lastActiveDay`: no change.
 *   - Activity exactly one day after `lastActiveDay`: streak += 1.
 *   - Activity after a gap of more than one day:
 *       - If exactly ONE day was missed AND a shield is available:
 *         consume one shield, treat the gap as if it didn't happen,
 *         streak += 1.
 *       - Otherwise: streak resets to 1.
 *
 * Shield replenishment:
 *   - Auto-granted: 1 shield every SHIELD_GRANT_INTERVAL_DAYS, capped at
 *     MAX_STREAK_SHIELDS. Computed lazily at hydrate time so we don't
 *     need a background job.
 *
 * Display rule (computed at render time):
 *   - If `lastActiveDay` is today or yesterday: show stored streak.
 *   - Otherwise: show 0 (the streak is broken and will reset on next activity).
 */

import { isoDate } from './dailyLog'

/** Hard cap on banked shields — prevents hoarding from making the streak meaningless. */
export const MAX_STREAK_SHIELDS = 3
/** Calendar days between auto-grants. One per week feels generous but honest. */
export const SHIELD_GRANT_INTERVAL_DAYS = 7

/** Return the ISO date string for the given offset in days from `from`. */
export function isoDateOffset(from: string, offsetDays: number): string {
  const [y, m, d] = from.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + offsetDays)
  return isoDate(dt)
}

/** Whole-day difference between two ISO dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  const ta = new Date(ya, ma - 1, da).getTime()
  const tb = new Date(yb, mb - 1, db).getTime()
  return Math.round((tb - ta) / (24 * 60 * 60 * 1000))
}

export interface StreakState {
  currentStreak: number
  longestStreak: number
  lastActiveDay: string
  streakShields: number
}

export interface BumpResult extends StreakState {
  /** True when this bump consumed a shield to bridge a 1-day gap. */
  shieldUsed: boolean
  /**
   * True when the streak was reset to 1 because a real gap occurred and
   * no shield could save it. Lets the caller surface a "your streak
   * ended" toast — shown only when `previousStreak` was non-trivial.
   */
  streakBroken: boolean
  /**
   * The streak count just before this bump. Useful for messaging
   * ("Your 12-day streak ended") since the new state has already moved on.
   */
  previousStreak: number
}

/**
 * Compute the new streak state given an activity happening today.
 *
 * Pure function — caller persists the result. The returned `shieldUsed`
 * flag lets the caller fire a "Streak shield used" toast.
 */
export function bumpStreak(prev: StreakState, today = isoDate()): BumpResult {
  const previousStreak = prev.currentStreak

  if (prev.lastActiveDay === today) {
    return { ...prev, shieldUsed: false, streakBroken: false, previousStreak }
  }

  const gap = daysBetween(prev.lastActiveDay, today)

  // Gap of 1 = bumped on the next day, no shield needed.
  if (gap === 1) {
    const next = prev.currentStreak + 1
    return {
      currentStreak: next,
      longestStreak: Math.max(prev.longestStreak, next),
      lastActiveDay: today,
      streakShields: prev.streakShields,
      shieldUsed: false,
      streakBroken: false,
      previousStreak,
    }
  }

  // Gap of 2 = exactly one day missed. Shield can save it.
  if (gap === 2 && prev.streakShields > 0) {
    const next = prev.currentStreak + 1
    return {
      currentStreak: next,
      longestStreak: Math.max(prev.longestStreak, next),
      lastActiveDay: today,
      streakShields: prev.streakShields - 1,
      shieldUsed: true,
      streakBroken: false,
      previousStreak,
    }
  }

  // Anything else (gap > 2, or gap = 2 with no shield, or backwards date): reset.
  // We only flag `streakBroken` when there was actually a streak to lose —
  // a fresh user starting from 0 shouldn't see "your 0-day streak ended".
  return {
    currentStreak: 1,
    longestStreak: Math.max(prev.longestStreak, 1),
    lastActiveDay: today,
    streakShields: prev.streakShields,
    shieldUsed: false,
    streakBroken: previousStreak >= 2,
    previousStreak,
  }
}

/**
 * Returns the streak number to DISPLAY in the UI, accounting for broken streaks
 * the user hasn't yet realised (no activity for 2+ days).
 *
 * Note: a SHIELD-protected user is still "alive" if they were last active
 * 2 days ago, but that's only known at bump time. For display, we keep
 * the conservative rule: if more than 1 day has passed without activity,
 * the streak shows as 0 until the user opens the app again. The shield
 * will then save it on next XP-earning action.
 */
export function displayStreak(
  prev: { currentStreak: number; longestStreak: number; lastActiveDay: string },
  today = isoDate(),
): number {
  if (prev.lastActiveDay === today) return prev.currentStreak
  if (prev.lastActiveDay === isoDateOffset(today, -1)) return prev.currentStreak
  return 0
}

export interface ShieldGrantState {
  streakShields: number
  lastShieldGrantedDay: string
}

export interface GrantResult extends ShieldGrantState {
  /** Number of shields granted this call (0 when nothing changed). */
  granted: number
}

/**
 * Drip-replenishment: grant up to N new shields based on how many full
 * SHIELD_GRANT_INTERVAL_DAYS have elapsed since the last grant. Capped
 * at MAX_STREAK_SHIELDS. Pure function; caller persists the result.
 *
 * Granting in batches matters for users who skip a few weeks: if we
 * only granted 1 shield no matter the gap, returning after 3 weeks
 * would still leave you with just 1 shield. With drip we restore the
 * cap, which is the natural mental model.
 */
export function maybeGrantShields(
  prev: ShieldGrantState,
  today = isoDate(),
): GrantResult {
  const elapsed = daysBetween(prev.lastShieldGrantedDay, today)
  if (elapsed < SHIELD_GRANT_INTERVAL_DAYS) {
    return { ...prev, granted: 0 }
  }
  const earned = Math.floor(elapsed / SHIELD_GRANT_INTERVAL_DAYS)
  const next = Math.min(MAX_STREAK_SHIELDS, prev.streakShields + earned)
  const actuallyGranted = next - prev.streakShields
  if (actuallyGranted <= 0) {
    // Already at cap — still advance the timer so the next grant can happen
    // a week from now, not a week from the historical grant date.
    return {
      streakShields: prev.streakShields,
      lastShieldGrantedDay: today,
      granted: 0,
    }
  }
  return {
    streakShields: next,
    lastShieldGrantedDay: today,
    granted: actuallyGranted,
  }
}
