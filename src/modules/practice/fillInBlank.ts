/**
 * Helpers for the Fill-in-the-blank exercise.
 * Keeps UI components free of string logic.
 */

import type { Quality, Word } from '@/types'

/** Escape regex metacharacters. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Replace the first occurrence of the lemma (with common conjugation suffixes)
 * in `sentence` with underscores of matching length.
 *
 * Returns the masked sentence AND the exact string the user must type.
 * Falls back to masking the bare lemma if no match is found.
 */
export function maskLemma(
  sentence: string,
  lemma: string,
): { masked: string; expected: string } {
  const base = escapeRegex(lemma)
  // Match: word-boundary lemma + optional suffix + word-boundary.
  // Covers: leverage / leverages / leveraged / leveraging / leverager.
  const re = new RegExp(`\\b(${base}(?:s|es|ed|d|ing|ly|er|ers|ness)?)\\b`, 'i')
  const m = sentence.match(re)
  if (!m || m.index === undefined) {
    return { masked: sentence.replace(re, '_'.repeat(lemma.length)), expected: lemma }
  }
  const expected = m[1]
  const masked =
    sentence.slice(0, m.index) +
    '_'.repeat(expected.length) +
    sentence.slice(m.index + expected.length)
  return { masked, expected }
}

/** Pick a random example sentence from a word. */
export function pickExample(word: Word): { en: string; fr?: string } {
  if (word.examples.length === 0) {
    return { en: `This sentence uses "${word.lemma}".` }
  }
  return word.examples[Math.floor(Math.random() * word.examples.length)]
}

/**
 * Convert (isCorrect, isTypo, responseTimeMs) → SM-2 quality 0..5.
 */
export function qualityFromAnswer(
  isCorrect: boolean,
  isTypo: boolean,
  responseTimeMs: number,
): Quality {
  if (isCorrect) {
    if (responseTimeMs < 3000) return 5
    if (responseTimeMs < 7000) return 4
    return 3
  }
  if (isTypo) return 2
  return 1
}
