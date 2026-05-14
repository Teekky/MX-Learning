/**
 * Seed the database with the initial curated vocabulary.
 *
 * Two passes, both idempotent:
 *   1. INSERT missing seed words (keyed on lemma + source='seed'). This lets
 *      existing users pick up new batches on launch without wiping progress.
 *   2. SYNC mutable metadata (level, partOfSpeech, definitionEn, fr,
 *      frequencyRank, tags, examples) from the code-side seed → DB, so when
 *      we reclassify a word (e.g. "deadline" A2→B2) existing installs get
 *      the correction too. We DO NOT touch `source`, `addedAt`, or any SRS
 *      card state — user progress stays intact.
 */

import { db } from './database'
import { SEED_WORDS } from '@/data/seedWords'
import { newCard } from '@/utils/fsrs'
import type { Word } from '@/types'

export async function seedIfEmpty(): Promise<void> {
  const existingSeedWords = await db.words
    .where('source')
    .equals('seed')
    .toArray()
  const existingByLemma = new Map(
    existingSeedWords.map((w) => [w.lemma.toLowerCase(), w]),
  )

  const missing = SEED_WORDS.filter(
    (w) => !existingByLemma.has(w.lemma.toLowerCase()),
  )

  // Detect metadata drift between code seed and DB (level relabels, etc.).
  const drifted: Array<{ id: number; patch: Partial<Word> }> = []
  for (const seed of SEED_WORDS) {
    const existing = existingByLemma.get(seed.lemma.toLowerCase())
    if (!existing || existing.id == null) continue
    const patch: Partial<Word> = {}
    if (existing.level !== seed.level) patch.level = seed.level
    if (existing.partOfSpeech !== seed.partOfSpeech) {
      patch.partOfSpeech = seed.partOfSpeech
    }
    if (existing.definitionEn !== seed.definitionEn) {
      patch.definitionEn = seed.definitionEn
    }
    if (existing.fr !== seed.fr) patch.fr = seed.fr
    if (existing.frequencyRank !== seed.frequencyRank) {
      patch.frequencyRank = seed.frequencyRank
    }
    if (!sameTags(existing.tags, seed.tags)) patch.tags = seed.tags
    // Examples rarely drift, skip to keep this cheap.
    if (Object.keys(patch).length > 0) {
      drifted.push({ id: existing.id, patch })
    }
  }

  if (missing.length === 0 && drifted.length === 0) return

  const now = Date.now()

  await db.transaction('rw', [db.words, db.cards], async () => {
    // 1. Insert new seed words.
    for (const seed of missing) {
      const toInsert: Word = {
        ...seed,
        source: 'seed',
        addedAt: now,
      }
      const id = (await db.words.add(toInsert)) as number
      await db.cards.add(newCard(id, now))
    }
    // 2. Sync drifted metadata on existing seed rows.
    for (const { id, patch } of drifted) {
      await db.words.update(id, patch)
    }
  })
}

function sameTags(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a || !b) return a === b
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((t, i) => t === sortedB[i])
}
