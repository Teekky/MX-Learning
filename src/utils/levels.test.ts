import { describe, expect, it } from 'vitest'
import { levelFromXp, xpForReview } from './levels'

describe('levelFromXp', () => {
  it('level 0 at zero XP', () => {
    const l = levelFromXp(0)
    expect(l.level).toBe(0)
    expect(l.name).toBe('Novice')
    expect(l.progress).toBe(0)
  })

  it('crosses to the next level exactly on the threshold', () => {
    expect(levelFromXp(99).level).toBe(0)
    expect(levelFromXp(100).level).toBe(1)
    expect(levelFromXp(250).level).toBe(2)
  })

  it('reports fractional progress inside a level', () => {
    // Between 100 and 250 → halfway is 175.
    const l = levelFromXp(175)
    expect(l.level).toBe(1)
    expect(l.current).toBe(100)
    expect(l.next).toBe(250)
    expect(l.progress).toBeCloseTo(0.5)
  })

  it('clamps progress to [0,1] past the top threshold', () => {
    const l = levelFromXp(10_000_000)
    expect(l.progress).toBeGreaterThanOrEqual(0)
    expect(l.progress).toBeLessThanOrEqual(1)
    expect(l.name).toBe('Mythic')
  })
})

describe('xpForReview', () => {
  it('gives a small consolation for a wrong answer', () => {
    expect(xpForReview(1, 0.5)).toBe(1)
    expect(xpForReview(2, 0.9)).toBe(1)
  })

  it('scales with quality', () => {
    expect(xpForReview(3, 0)).toBe(6)
    expect(xpForReview(4, 0)).toBe(8)
    expect(xpForReview(5, 0)).toBe(10)
  })

  it('adds a difficulty bonus of up to +5', () => {
    expect(xpForReview(5, 1)).toBe(15)
    expect(xpForReview(3, 0.4)).toBe(6 + 2)
  })
})
