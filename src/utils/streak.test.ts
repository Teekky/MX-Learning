import { describe, expect, it } from 'vitest'
import {
  bumpStreak,
  displayStreak,
  maybeGrantShields,
  daysBetween,
  isoDateOffset,
  MAX_STREAK_SHIELDS,
  SHIELD_GRANT_INTERVAL_DAYS,
  type StreakState,
} from './streak'

const state = (over: Partial<StreakState> = {}): StreakState => ({
  currentStreak: 5,
  longestStreak: 10,
  lastActiveDay: '2026-01-10',
  streakShields: 0,
  ...over,
})

describe('date helpers', () => {
  it('daysBetween counts whole calendar days, signed', () => {
    expect(daysBetween('2026-01-10', '2026-01-13')).toBe(3)
    expect(daysBetween('2026-01-13', '2026-01-10')).toBe(-3)
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1)
  })
  it('isoDateOffset walks across month boundaries', () => {
    expect(isoDateOffset('2026-01-31', 1)).toBe('2026-02-01')
    expect(isoDateOffset('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('bumpStreak', () => {
  it('is a no-op when already active today', () => {
    const r = bumpStreak(state({ currentStreak: 5 }), '2026-01-10')
    expect(r.currentStreak).toBe(5)
    expect(r.shieldUsed).toBe(false)
    expect(r.streakBroken).toBe(false)
  })

  it('increments on the very next day', () => {
    const r = bumpStreak(state({ currentStreak: 5 }), '2026-01-11')
    expect(r.currentStreak).toBe(6)
    expect(r.lastActiveDay).toBe('2026-01-11')
    expect(r.shieldUsed).toBe(false)
  })

  it('tracks a new longest streak', () => {
    const r = bumpStreak(
      state({ currentStreak: 10, longestStreak: 10 }),
      '2026-01-11',
    )
    expect(r.longestStreak).toBe(11)
  })

  it('spends a shield to bridge exactly one missed day', () => {
    const r = bumpStreak(
      state({ currentStreak: 5, streakShields: 2 }),
      '2026-01-12',
    )
    expect(r.currentStreak).toBe(6)
    expect(r.streakShields).toBe(1)
    expect(r.shieldUsed).toBe(true)
    expect(r.streakBroken).toBe(false)
  })

  it('resets when one day is missed and no shield is available', () => {
    const r = bumpStreak(
      state({ currentStreak: 8, streakShields: 0 }),
      '2026-01-12',
    )
    expect(r.currentStreak).toBe(1)
    expect(r.streakBroken).toBe(true)
    expect(r.previousStreak).toBe(8)
  })

  it('resets on a gap of more than one day even with shields', () => {
    const r = bumpStreak(
      state({ currentStreak: 8, streakShields: 3 }),
      '2026-01-15',
    )
    expect(r.currentStreak).toBe(1)
    expect(r.streakShields).toBe(3)
    expect(r.shieldUsed).toBe(false)
  })

  it('does not cry "streak ended" for a trivial 1-day streak', () => {
    const r = bumpStreak(
      state({ currentStreak: 1, streakShields: 0 }),
      '2026-01-14',
    )
    expect(r.currentStreak).toBe(1)
    expect(r.streakBroken).toBe(false)
  })
})

describe('displayStreak', () => {
  const s = { currentStreak: 7, longestStreak: 9, lastActiveDay: '2026-01-10' }
  it('shows the real streak when active today or yesterday', () => {
    expect(displayStreak(s, '2026-01-10')).toBe(7)
    expect(displayStreak(s, '2026-01-11')).toBe(7)
  })
  it('shows 0 once two or more days have lapsed', () => {
    expect(displayStreak(s, '2026-01-12')).toBe(0)
  })
})

describe('maybeGrantShields', () => {
  it('grants nothing before the interval elapses', () => {
    const r = maybeGrantShields(
      { streakShields: 0, lastShieldGrantedDay: '2026-01-10' },
      '2026-01-14',
    )
    expect(r.granted).toBe(0)
    expect(r.lastShieldGrantedDay).toBe('2026-01-10')
  })

  it('grants one shield after one interval', () => {
    const r = maybeGrantShields(
      { streakShields: 0, lastShieldGrantedDay: '2026-01-10' },
      isoDateOffset('2026-01-10', SHIELD_GRANT_INTERVAL_DAYS),
    )
    expect(r.granted).toBe(1)
    expect(r.streakShields).toBe(1)
  })

  it('drip-restores multiple shields after a long absence, capped', () => {
    const r = maybeGrantShields(
      { streakShields: 0, lastShieldGrantedDay: '2026-01-01' },
      isoDateOffset('2026-01-01', SHIELD_GRANT_INTERVAL_DAYS * 9),
    )
    expect(r.streakShields).toBe(MAX_STREAK_SHIELDS)
    expect(r.granted).toBe(MAX_STREAK_SHIELDS)
  })

  it('advances the timer even when already at the cap', () => {
    const today = isoDateOffset('2026-01-01', SHIELD_GRANT_INTERVAL_DAYS * 2)
    const r = maybeGrantShields(
      { streakShields: MAX_STREAK_SHIELDS, lastShieldGrantedDay: '2026-01-01' },
      today,
    )
    expect(r.granted).toBe(0)
    expect(r.lastShieldGrantedDay).toBe(today)
  })
})
