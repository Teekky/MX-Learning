/**
 * High-level DB queries used by the practice modules.
 *
 * CEFR gating: most exercise queries accept an optional `allowedLevels`
 * list (see `utils/levelFilter`). When provided, only words whose level
 * is in that list are returned. This lets an A1 learner stay in A1/A2
 * territory instead of being flooded with the seed's B2/C1 vocab.
 */

import { db } from './database'
import { isoDate } from '@/utils/dailyLog'
import type { DailyLog, Level, SRSCard, Word } from '@/types'

/** All cards due now, ordered by most overdue first. */
export async function getDueCards(limit = 20): Promise<SRSCard[]> {
  const now = Date.now()
  return db.cards
    .where('due')
    .belowOrEqual(now)
    .limit(limit)
    .toArray()
    .then((cards) => cards.sort((a, b) => a.due - b.due))
}

/** Join a card with its word (single lookup). */
export async function getWordForCard(card: SRSCard): Promise<Word | undefined> {
  return db.words.get(card.wordId)
}

/**
 * Pair every due card with its Word, filtering out any orphans.
 *
 * CEFR filter strategy:
 *   - If `allowedLevels` yields at least one pair, honour it.
 *   - If the filter returns zero but there ARE unfiltered due pairs,
 *     we fall back to the unfiltered set. This matters a lot now that
 *     auto-seed is gone: the user's deck is 100% their own imports +
 *     AI-generated items, so blocking them by level would be punishing
 *     their own choices (e.g. they pasted a C1 article while still
 *     marked B1 in the DB). The gate existed to keep beginners from
 *     drowning in the old B2/C1-heavy seed — without the seed, let
 *     them practice whatever they put in their deck.
 *
 * Why fetch all when filtering? Because a DB-level limit picks the
 * most-overdue N cards before we can inspect `word.level`. If every
 * overdue card is off-level, filtering would return nothing even when
 * matching cards exist further down the list.
 */
export async function getDuePairs(
  limit = 20,
  allowedLevels?: Level[],
): Promise<Array<{ card: SRSCard; word: Word }>> {
  const now = Date.now()
  const allDue = await db.cards.where('due').belowOrEqual(now).toArray()
  if (allDue.length === 0) return []
  allDue.sort((a, b) => a.due - b.due)
  const words = await db.words.bulkGet(allDue.map((c) => c.wordId))
  const joined = allDue
    .map((card, i) => ({ card, word: words[i] as Word | undefined }))
    .filter((p): p is { card: SRSCard; word: Word } => Boolean(p.word))

  if (!allowedLevels) return joined.slice(0, limit)

  const allowSet = new Set(allowedLevels)
  const inLevel = joined.filter((p) => allowSet.has(p.word.level))
  // Graceful fallback: if the level filter produced nothing, still hand
  // the user SOMETHING to review rather than a misleading empty state.
  const pool = inLevel.length > 0 ? inLevel : joined
  return pool.slice(0, limit)
}

/** Count of cards due now, optionally restricted to `allowedLevels`. */
export async function countDue(allowedLevels?: Level[]): Promise<number> {
  const now = Date.now()
  if (!allowedLevels) {
    return db.cards.where('due').belowOrEqual(now).count()
  }
  // Need to join on word.level — overfetch all due cards and filter.
  const cards = await db.cards.where('due').belowOrEqual(now).toArray()
  if (cards.length === 0) return 0
  const words = await db.words.bulkGet(cards.map((c) => c.wordId))
  const allowSet = new Set(allowedLevels)
  let n = 0
  for (const w of words) if (w && allowSet.has(w.level)) n++
  return n
}

/** Total vocabulary size, optionally restricted to `allowedLevels`. */
export async function countWords(allowedLevels?: Level[]): Promise<number> {
  if (!allowedLevels) return db.words.count()
  const allowSet = new Set(allowedLevels)
  return db.words.filter((w) => allowSet.has(w.level)).count()
}

/**
 * One pass over the deck for the dashboard's headline numbers.
 *
 * "Learned" is deliberately stricter than "seen once": a card counts only
 * after two successful repetitions AND a week-long interval, which is the
 * point at which recall stops being short-term memory. Anything less would
 * let the number climb on the first evening and mean nothing afterwards.
 */
export interface DeckSummary {
  /** Every entry in the deck. */
  total: number
  /** Cards that have survived to a ≥ 6-day interval. */
  learned: number
  /** Seen at least once, but not yet learned. */
  learning: number
  /** Never reviewed. */
  fresh: number
  /** Due right now. */
  due: number
}

export async function getDeckSummary(): Promise<DeckSummary> {
  const now = Date.now()
  const cards = await db.cards.toArray()
  const summary: DeckSummary = {
    total: cards.length,
    learned: 0,
    learning: 0,
    fresh: 0,
    due: 0,
  }
  for (const c of cards) {
    if (c.due <= now) summary.due++
    if (!c.lastReviewed) summary.fresh++
    else if (c.repetition >= 2 && c.intervalDays >= 6) summary.learned++
    else summary.learning++
  }
  return summary
}

/**
 * Retention over the last `days` days: the share of reviews the user got
 * right. Computed from the review log rather than the daily rollup so it
 * survives a rollup gap, and returns `null` when there is nothing to
 * average — an honest "—" beats a confident 0%.
 */
export async function getRetention(days = 30): Promise<number | null> {
  const since = Date.now() - days * 86_400_000
  const reviews = await db.reviews.where('timestamp').aboveOrEqual(since).toArray()
  if (reviews.length === 0) return null
  const correct = reviews.reduce((n, r) => n + (r.wasCorrect ? 1 : 0), 0)
  return correct / reviews.length
}

/** All words at/under the user's level (+ stretch), for non-SRS modes. */
export async function getWordsAtLevel(
  allowedLevels: Level[],
): Promise<Word[]> {
  const allowSet = new Set(allowedLevels)
  return db.words.filter((w) => allowSet.has(w.level)).toArray()
}

/** Every word in the deck (seed + user-imported + generated). */
export async function getAllWords(): Promise<Word[]> {
  return db.words.toArray()
}

/**
 * All SRS cards keyed by their wordId — used by the deck page to render a
 * per-word "next due / lapses / ease" summary without one query per row.
 * The deck is small (hundreds of words) so a single bulk read is cheaper
 * than per-row lookups.
 */
export async function getAllCardsByWordId(): Promise<Map<number, SRSCard>> {
  const all = await db.cards.toArray()
  const map = new Map<number, SRSCard>()
  for (const c of all) map.set(c.wordId, c)
  return map
}

/**
 * Bulk-delete a set of words (and their SRS cards + reviews) in one
 * transaction. Used by the deck's multi-select action.
 */
export async function deleteWordsByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  await db.transaction('rw', [db.words, db.cards, db.reviews], async () => {
    await db.cards.where('wordId').anyOf(ids).delete()
    await db.reviews.where('wordId').anyOf(ids).delete()
    await db.words.bulkDelete(ids)
  })
}

/**
 * Delete a word AND its SRS card(s). Safe for user-imported or
 * Mistral-generated entries; seed words can also be removed if the user
 * chooses — they no longer re-appear because auto-seeding is disabled.
 */
export async function deleteWord(wordId: number): Promise<void> {
  await db.transaction('rw', [db.words, db.cards, db.reviews], async () => {
    await db.cards.where('wordId').equals(wordId).delete()
    await db.reviews.where('wordId').equals(wordId).delete()
    await db.words.delete(wordId)
  })
}

/**
 * Bulk-remove all words of a given source and everything tied to them.
 *
 * Primary use: wiping the curated seed on existing installs where it was
 * auto-inserted by earlier app versions. Returns how many words were
 * deleted so the UI can confirm.
 */
export async function deleteWordsBySource(
  source: Word['source'],
): Promise<number> {
  let deleted = 0
  await db.transaction('rw', [db.words, db.cards, db.reviews], async () => {
    const targets = await db.words.where('source').equals(source).toArray()
    const ids = targets.map((w) => w.id!).filter((id) => id != null)
    if (ids.length === 0) return
    await db.cards.where('wordId').anyOf(ids).delete()
    await db.reviews.where('wordId').anyOf(ids).delete()
    await db.words.bulkDelete(ids)
    deleted = ids.length
  })
  return deleted
}

/**
 * The user's weakest cards, paired with their Word.
 *
 * "Weak" = most-lapsed. Ties broken by lowest ease (harder recall) and
 * lower repetition streak. Cards that have never been reviewed are
 * excluded — we can't call a fresh card "weak".
 *
 * Useful for the weekly review → "drill just these" flow. If CEFR
 * filtering is provided we restrict to words in-level.
 */
export async function getWeakPairs(
  limit = 10,
  allowedLevels?: Level[],
): Promise<Array<{ card: SRSCard; word: Word }>> {
  const all = await db.cards.toArray()
  // Only cards the user has actually struggled with.
  const reviewed = all.filter((c) => (c.lastReviewed ?? 0) > 0 && c.lapses > 0)
  reviewed.sort((a, b) => {
    if (b.lapses !== a.lapses) return b.lapses - a.lapses
    if (a.ease !== b.ease) return a.ease - b.ease
    return a.repetition - b.repetition
  })
  if (reviewed.length === 0) return []
  const words = await db.words.bulkGet(reviewed.map((c) => c.wordId))
  const allowSet = allowedLevels ? new Set(allowedLevels) : null
  const pairs: Array<{ card: SRSCard; word: Word }> = []
  for (let i = 0; i < reviewed.length && pairs.length < limit; i++) {
    const word = words[i] as Word | undefined
    if (!word) continue
    if (allowSet && !allowSet.has(word.level)) continue
    pairs.push({ card: reviewed[i], word })
  }
  return pairs
}

/**
 * Fetch the last `days` daily logs, newest first, with gaps filled by
 * empty rollups. The dashboard uses this for the weekly strip chart,
 * so it needs every day present even if the user was away that day.
 */
export async function getDailyLogsRange(days = 7): Promise<DailyLog[]> {
  const result: DailyLog[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Collect in newest-first order.
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const date = isoDate(d)
    const found = await db.dailyLogs.get(date)
    result.push(
      found ?? {
        date,
        xpEarned: 0,
        reviewsDone: 0,
        timeSpentSeconds: 0,
        mistakes: 0,
        goalReached: false,
      },
    )
  }
  return result
}
