/**
 * Splits an Aussie domain's word list into fixed, named quiz parts
 * (Part 1, Part 2, …) of `AUSSIE_PART_SIZE` words each, taken in the
 * domain's authored order. Words are written in loose thematic clusters
 * (shifts, then safety gear, then vehicles…), so consecutive parts tend
 * to stay on-topic rather than mixing everything at random.
 *
 * The split is deterministic — Part 1 is always the same 10 words — so
 * progress per part can be tracked and revisited meaningfully.
 */

import type { AussieDomain, AussieWordSeed } from '@/types'

export const AUSSIE_PART_SIZE = 10

export function aussiePartCount(domain: AussieDomain): number {
  return Math.ceil(domain.words.length / AUSSIE_PART_SIZE)
}

export function aussiePartWords(domain: AussieDomain, partIndex: number): AussieWordSeed[] {
  const start = partIndex * AUSSIE_PART_SIZE
  return domain.words.slice(start, start + AUSSIE_PART_SIZE)
}
