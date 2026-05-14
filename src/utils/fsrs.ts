/**
 * MX Learning spaced-repetition scheduler.
 *
 * The user spec calls this FSRS but describes the SM-2 model
 * (quality 0..5, ease factor default 2.5, interval in days).
 * We follow that spec faithfully and add the "lapse softening" rule:
 * on a lapse the interval is reduced drastically but NOT reset to zero.
 */

import type { Quality, SRSCard } from '@/types'

const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3
const LAPSE_INTERVAL_FACTOR = 0.2 // lapse → 20% of previous interval (min 1d)
const HARD_INTERVAL_FACTOR = 1.2

/** Create a fresh card for a new word. */
export function newCard(wordId: number, due: number = Date.now()): SRSCard {
  return {
    wordId,
    due,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    repetition: 0,
    lapses: 0,
    difficultyScore: 0.3, // mild default difficulty
  }
}

/**
 * Compute the next state of a card after a review of given quality.
 * Returns a NEW card object (immutable).
 */
export function scheduleNext(card: SRSCard, quality: Quality): SRSCard {
  const next: SRSCard = { ...card, lastReviewed: Date.now() }

  // Update difficulty score (Dynamic Weighting input).
  // Wrong answers ratchet difficulty up; perfect answers lower it slowly.
  const delta = quality < 3 ? 0.15 : quality === 5 ? -0.05 : -0.02
  next.difficultyScore = Math.max(0, Math.min(1, card.difficultyScore + delta))

  if (quality < 3) {
    // Lapse: known card got wrong. Soften interval but don't reset to 0.
    next.lapses = card.lapses + 1
    next.repetition = 0
    next.intervalDays = Math.max(
      1,
      Math.round(card.intervalDays * LAPSE_INTERVAL_FACTOR),
    )
    // Reduce ease but cap at MIN_EASE.
    next.ease = Math.max(MIN_EASE, card.ease - 0.2)
  } else {
    // Successful recall.
    next.repetition = card.repetition + 1

    if (next.repetition === 1) {
      next.intervalDays = 1
    } else if (next.repetition === 2) {
      next.intervalDays = 6
    } else {
      const factor =
        quality === 3
          ? HARD_INTERVAL_FACTOR
          : quality === 4
            ? card.ease
            : card.ease * 1.3 // perfect answer — extra spacing
      next.intervalDays = Math.round(card.intervalDays * factor)
    }

    // Update ease (SM-2 formula, clamped).
    const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    next.ease = Math.max(MIN_EASE, card.ease + easeDelta)
  }

  next.due = Date.now() + next.intervalDays * 86400_000
  return next
}

/** Quick helper: is the card due now? */
export function isDue(card: SRSCard, now: number = Date.now()): boolean {
  return card.due <= now
}
