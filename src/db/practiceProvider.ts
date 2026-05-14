/**
 * Practice content provider — feeds modules from the deck first, then
 * tops up with TRANSIENT entries from the curated seed pool.
 *
 * Why "transient":
 *   The deck has to mean "words I have actively chosen to learn" — not
 *   "100 words the app put there for me on first launch". So we never
 *   pre-seed the database. Instead, when a module needs N items but the
 *   deck only has M < N due cards, we hand it M real pairs plus (N - M)
 *   ephemeral pairs drawn from `SEED_WORDS`. They get materialised into
 *   real DB rows only when the user actually reviews them in-session
 *   (`persistTransient`) — that's the moment the user signals "yes,
 *   keep this one for me".
 *
 *   Net effect: the user can practice from the very first launch with no
 *   friction, and the deck grows as a faithful journal of what they've
 *   touched.
 *
 * Two surfaces:
 *   - `getPracticeBatch` — SRS modes (Fill-in-Blank, Listening,
 *     Words-in-Context). Returns paired SRSCard + Word.
 *   - `getPracticeWordPool` — non-SRS modes (Time-Attack). Returns
 *     Word-only entries. Each persists on first attempt via
 *     `persistTransientWord`.
 */

import { db } from './database'
import { getDuePairs } from './queries'
import { SEED_WORDS } from '@/data/seedWords'
import { newCard } from '@/utils/fsrs'
import type { Level, SRSCard, Word } from '@/types'

/* ----------------------------- Types --------------------------------- */

export type PracticePair = {
  card: SRSCard
  word: Word
  /** True until the first review materialises the row in DB. */
  transient: boolean
  /** Stable React key (DB id when persisted, lemma otherwise). */
  key: string
}

export type PracticeWord = {
  word: Word
  transient: boolean
  key: string
}

/* --------------------------- Helpers --------------------------------- */

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Build a transient pair (in-memory only) from a seed entry. */
function transientPair(
  seed: (typeof SEED_WORDS)[number],
  now: number,
): PracticePair {
  const word: Word = { ...seed, source: 'seed', addedAt: now }
  // wordId=0 is a placeholder; replaced when persisted.
  const card: SRSCard = newCard(0, now)
  return {
    card,
    word,
    transient: true,
    key: `transient:${seed.lemma.toLowerCase()}`,
  }
}

/* -------------------- SRS-mode batch (paired) ------------------------ */

/**
 * Get up to `limit` cards for an SRS practice session.
 *
 * Strategy:
 *   1. Pull due pairs from the deck (CEFR-filtered if requested).
 *   2. Top up with transient seed entries until `limit` is reached or
 *      the seed pool is exhausted (skipping anything already in the deck
 *      to avoid showing the same lemma twice in one session).
 *
 * The result is shuffled within the transient tail; due cards keep their
 * "most overdue first" order at the top so the SRS still gets priority.
 */
export async function getPracticeBatch(
  limit: number,
  allowedLevels?: Level[],
): Promise<PracticePair[]> {
  const due = await getDuePairs(limit, allowedLevels)
  const persisted: PracticePair[] = due.map((p) => ({
    card: p.card,
    word: p.word,
    transient: false,
    key: `db:${p.card.id}`,
  }))
  if (persisted.length >= limit) return persisted

  const need = limit - persisted.length
  const allWords = await db.words.toArray()
  const taken = new Set<string>([
    ...persisted.map((p) => p.word.lemma.toLowerCase()),
    ...allWords.map((w) => w.lemma.toLowerCase()),
  ])
  const allowSet = allowedLevels ? new Set(allowedLevels) : null
  const inLevel = SEED_WORDS.filter((s) => {
    if (taken.has(s.lemma.toLowerCase())) return false
    if (allowSet && !allowSet.has(s.level)) return false
    return true
  })
  // If the level filter wiped the candidate pool, fall back to any seed
  // entry not already in the deck — better to drill an off-level word
  // than to return an empty batch.
  const pool =
    inLevel.length > 0
      ? inLevel
      : SEED_WORDS.filter((s) => !taken.has(s.lemma.toLowerCase()))
  if (pool.length === 0) return persisted

  const now = Date.now()
  const transient = shuffle(pool)
    .slice(0, need)
    .map((s) => transientPair(s, now))
  return [...persisted, ...transient]
}

/**
 * Materialise a transient pair as real DB rows (Word + SRSCard).
 * Idempotent: passing a non-transient pair returns it unchanged.
 *
 * Race-safe: if another tab/session already inserted the same lemma
 * between batch generation and this call, we reuse the existing row
 * rather than duplicating.
 */
export async function persistTransient(
  pair: PracticePair,
): Promise<PracticePair> {
  if (!pair.transient) return pair
  const now = Date.now()
  const wordToInsert: Word = { ...pair.word, addedAt: now }
  delete (wordToInsert as { id?: number }).id

  let wordId = 0
  let cardId = 0
  await db.transaction('rw', [db.words, db.cards], async () => {
    const existing = await db.words
      .where('lemma')
      .equalsIgnoreCase(wordToInsert.lemma)
      .first()
    if (existing?.id) {
      wordId = existing.id
      const existingCard = await db.cards.where('wordId').equals(wordId).first()
      cardId = existingCard?.id
        ? existingCard.id
        : ((await db.cards.add(newCard(wordId, now))) as number)
    } else {
      wordId = (await db.words.add(wordToInsert)) as number
      cardId = (await db.cards.add(newCard(wordId, now))) as number
    }
  })

  const persistedWord = (await db.words.get(wordId))!
  const persistedCard = (await db.cards.get(cardId))!
  return {
    card: persistedCard,
    word: persistedWord,
    transient: false,
    key: `db:${cardId}`,
  }
}

/* -------------------- Non-SRS word pool (Time-Attack) ---------------- */

/**
 * Pool of words for non-SRS modes (Time-Attack et al.).
 *
 * Same persistence rule as the paired version: deck words first, then
 * transient seed entries to ensure every learner has enough material
 * regardless of how empty their deck is.
 *
 * `filter` is applied to BOTH persisted and seed candidates — useful for
 * modes that need a particular field (e.g. Time-Attack requires `fr` to
 * show the prompt).
 */
export async function getPracticeWordPool(
  allowedLevels?: Level[],
  filter: (w: Word) => boolean = () => true,
): Promise<PracticeWord[]> {
  const allowSet = allowedLevels ? new Set(allowedLevels) : null
  const persistedAll = await db.words.toArray()
  const persisted: PracticeWord[] = persistedAll
    .filter((w) => (!allowSet || allowSet.has(w.level)) && filter(w))
    .map((w) => ({ word: w, transient: false, key: `db:${w.id}` }))

  const taken = new Set(persistedAll.map((w) => w.lemma.toLowerCase()))
  const now = Date.now()
  const inLevel = SEED_WORDS.filter((s) => {
    if (taken.has(s.lemma.toLowerCase())) return false
    if (allowSet && !allowSet.has(s.level)) return false
    const probe: Word = { ...s, source: 'seed', addedAt: now }
    return filter(probe)
  })
  // If level filter excludes everything but the deck is also thin,
  // fall back to any non-deck seed entry that satisfies `filter`.
  const seedPool =
    inLevel.length > 0
      ? inLevel
      : SEED_WORDS.filter((s) => {
          if (taken.has(s.lemma.toLowerCase())) return false
          const probe: Word = { ...s, source: 'seed', addedAt: now }
          return filter(probe)
        })

  const transient: PracticeWord[] = seedPool.map((s) => ({
    word: { ...s, source: 'seed', addedAt: now } as Word,
    transient: true,
    key: `transient:${s.lemma.toLowerCase()}`,
  }))

  return [...persisted, ...transient]
}

/**
 * Persist a transient word (and create its companion SRS card) on first
 * attempt. Returns the now-persistent equivalent so callers can use the
 * real `word.id` for downstream writes (e.g. `db.cards` updates).
 */
export async function persistTransientWord(
  pw: PracticeWord,
): Promise<PracticeWord> {
  if (!pw.transient) return pw
  const now = Date.now()
  const wordToInsert: Word = { ...pw.word, addedAt: now }
  delete (wordToInsert as { id?: number }).id

  let wordId = 0
  await db.transaction('rw', [db.words, db.cards], async () => {
    const existing = await db.words
      .where('lemma')
      .equalsIgnoreCase(wordToInsert.lemma)
      .first()
    if (existing?.id) {
      wordId = existing.id
      const existingCard = await db.cards
        .where('wordId')
        .equals(wordId)
        .first()
      if (!existingCard) await db.cards.add(newCard(wordId, now))
    } else {
      wordId = (await db.words.add(wordToInsert)) as number
      await db.cards.add(newCard(wordId, now))
    }
  })

  const persisted = (await db.words.get(wordId))!
  return { word: persisted, transient: false, key: `db:${wordId}` }
}
