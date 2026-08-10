/**
 * The four answers, and what each one means to the scheduler.
 *
 * Mapping onto the SM-2 quality scale used by `utils/fsrs`:
 *
 *   Again → 1   below 3, so it counts as a lapse: ease drops, interval
 *               collapses to ~20% and the card comes back this session.
 *   Hard  → 3   a *pass*, not a failure. This is the distinction that gets
 *               lost in two-button designs: "I got there, but it hurt"
 *               deserves a short interval, not a reset.
 *   Good  → 4   clean recall at the expected effort.
 *   Easy  → 5   instant, and the interval stretches by an extra 30%.
 *
 * Colours are written out in full because Tailwind cannot see class names
 * assembled at runtime.
 */

import type { Quality } from '@/types'

export type GradeKey = 'again' | 'hard' | 'good' | 'easy'

export interface Grade {
  key: GradeKey
  label: string
  /** One-word gloss shown under the label — what the button actually means. */
  hint: string
  quality: Quality
  /** Keyboard shortcut. */
  digit: '1' | '2' | '3' | '4'
  /** Button styling. */
  className: string
  /** Fill used by the swipe overlay. */
  overlayClassName: string
}

export const GRADES: readonly Grade[] = [
  {
    key: 'again',
    label: 'Again',
    hint: 'No idea',
    quality: 1,
    digit: '1',
    className: 'border-grade-again/35 bg-grade-again/10 text-grade-again hover:bg-grade-again/18',
    overlayClassName: 'bg-grade-again text-on-accent',
  },
  {
    key: 'hard',
    label: 'Hard',
    hint: 'Struggled',
    quality: 3,
    digit: '2',
    className: 'border-grade-hard/35 bg-grade-hard/10 text-grade-hard hover:bg-grade-hard/18',
    overlayClassName: 'bg-grade-hard text-on-accent',
  },
  {
    key: 'good',
    label: 'Good',
    hint: 'Recalled',
    quality: 4,
    digit: '3',
    className: 'border-grade-good/35 bg-grade-good/10 text-grade-good hover:bg-grade-good/18',
    overlayClassName: 'bg-grade-good text-on-accent',
  },
  {
    key: 'easy',
    label: 'Easy',
    hint: 'Instant',
    quality: 5,
    digit: '4',
    className: 'border-grade-easy/35 bg-grade-easy/10 text-grade-easy hover:bg-grade-easy/18',
    overlayClassName: 'bg-grade-easy text-on-accent',
  },
]

export const GRADE_BY_DIGIT: Record<string, Grade> = Object.fromEntries(
  GRADES.map((g) => [g.digit, g]),
)

/** Swipe shortcuts: left is the harsh one, right is the kind one. */
export const SWIPE_LEFT = GRADES[0] // Again
export const SWIPE_RIGHT = GRADES[2] // Good

/** Human-readable interval, e.g. `10 m`, `1 d`, `3 wk`, `1.5 y`. */
export function formatInterval(days: number): string {
  if (days <= 0) return '<1 d'
  if (days < 1) return `${Math.round(days * 24 * 60)} m`
  if (days < 30) return `${Math.round(days)} d`
  if (days < 365) return `${Math.round(days / 7)} wk`
  const years = days / 365
  return `${years < 10 ? years.toFixed(1) : Math.round(years)} y`
}
