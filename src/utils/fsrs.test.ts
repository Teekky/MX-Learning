import { describe, expect, it } from 'vitest'
import { newCard, scheduleNext, isDue } from './fsrs'
import type { SRSCard } from '@/types'

const base = (over: Partial<SRSCard> = {}): SRSCard => ({
  ...newCard(1),
  ...over,
})

describe('newCard', () => {
  it('starts fresh: default ease, no interval, no repetitions, due now', () => {
    const c = newCard(42, 1_000)
    expect(c).toMatchObject({
      wordId: 42,
      due: 1_000,
      ease: 2.5,
      intervalDays: 0,
      repetition: 0,
      lapses: 0,
    })
    expect(c.difficultyScore).toBeGreaterThan(0)
    expect(c.difficultyScore).toBeLessThan(1)
  })
})

describe('scheduleNext — successful recalls', () => {
  it('first pass schedules 1 day out', () => {
    const next = scheduleNext(base(), 4)
    expect(next.repetition).toBe(1)
    expect(next.intervalDays).toBe(1)
    expect(next.due).toBeGreaterThan(Date.now())
  })

  it('second pass schedules 6 days out', () => {
    const next = scheduleNext(base({ repetition: 1, intervalDays: 1 }), 4)
    expect(next.repetition).toBe(2)
    expect(next.intervalDays).toBe(6)
  })

  it('third pass onward multiplies the interval by ease', () => {
    const next = scheduleNext(
      base({ repetition: 2, intervalDays: 6, ease: 2.5 }),
      4,
    )
    expect(next.intervalDays).toBe(Math.round(6 * 2.5))
  })

  it('a perfect answer spaces further than a merely good one', () => {
    const card = base({ repetition: 2, intervalDays: 10, ease: 2.5 })
    const good = scheduleNext(card, 4)
    const perfect = scheduleNext(card, 5)
    expect(perfect.intervalDays).toBeGreaterThan(good.intervalDays)
  })

  it('a hard pass (q=3) grows the interval only slightly', () => {
    const next = scheduleNext(
      base({ repetition: 3, intervalDays: 20, ease: 2.5 }),
      3,
    )
    expect(next.intervalDays).toBe(Math.round(20 * 1.2))
  })
})

describe('scheduleNext — lapses', () => {
  it('softens the interval instead of resetting it to zero', () => {
    const next = scheduleNext(
      base({ repetition: 5, intervalDays: 50, ease: 2.5, lapses: 0 }),
      1,
    )
    expect(next.lapses).toBe(1)
    expect(next.repetition).toBe(0)
    expect(next.intervalDays).toBe(Math.round(50 * 0.2))
    expect(next.intervalDays).toBeGreaterThanOrEqual(1)
  })

  it('never drops the interval below 1 day', () => {
    const next = scheduleNext(base({ intervalDays: 2 }), 0)
    expect(next.intervalDays).toBe(1)
  })

  it('reduces ease but never past the 1.3 floor', () => {
    let card = base({ ease: 1.4 })
    card = scheduleNext(card, 1)
    expect(card.ease).toBeCloseTo(1.3)
    card = scheduleNext(card, 1)
    expect(card.ease).toBe(1.3)
  })
})

describe('scheduleNext — difficulty score', () => {
  it('ratchets up on a wrong answer and stays within [0,1]', () => {
    const next = scheduleNext(base({ difficultyScore: 0.95 }), 1)
    expect(next.difficultyScore).toBeGreaterThan(0.95)
    expect(next.difficultyScore).toBeLessThanOrEqual(1)
  })

  it('eases down on a perfect answer and never goes negative', () => {
    const next = scheduleNext(base({ difficultyScore: 0.02 }), 5)
    expect(next.difficultyScore).toBeGreaterThanOrEqual(0)
    expect(next.difficultyScore).toBeLessThan(0.02)
  })
})

describe('isDue', () => {
  it('is true when due is in the past, false when in the future', () => {
    expect(isDue(base({ due: Date.now() - 1000 }))).toBe(true)
    expect(isDue(base({ due: Date.now() + 100_000 }))).toBe(false)
  })
})
