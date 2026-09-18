/**
 * Writing to the deck.
 *
 * Every path that adds vocabulary — the manual form, the idiom library, an
 * AI import — goes through here, so three invariants hold everywhere:
 *
 *   1. A word always gets an SRS card. A word without one is invisible to
 *      the scheduler and silently never reviewed.
 *   2. Duplicates are matched on lowercased lemma, so "Bite the bullet"
 *      does not become a second copy of "bite the bullet".
 *   3. Text is sanitised on the way in (same helper the backup importer
 *      uses), so nothing weird reaches the DB regardless of the source.
 */

import { db } from './database'
import { newCard } from '@/utils/fsrs'
import { sanitizeText } from '@/utils/backup'
import type { Word } from '@/types'

export type NewWord = Omit<Word, 'id' | 'addedAt' | 'source'> &
  Partial<Pick<Word, 'addedAt' | 'source'>>

export interface AddResult {
  /** `added` — new row; `duplicate` — an entry with this lemma already exists. */
  status: 'added' | 'duplicate'
  wordId: number
}

/** Trim and clean every user-facing string on a word. */
function clean(input: NewWord): NewWord {
  return {
    ...input,
    lemma: sanitizeText(input.lemma, 200) ?? '',
    ipa: sanitizeText(input.ipa, 200) ?? undefined,
    fr: sanitizeText(input.fr, 400) ?? undefined,
    definitionEn: sanitizeText(input.definitionEn, 2000) ?? undefined,
    literal: sanitizeText(input.literal, 400) ?? undefined,
    tags: (input.tags ?? [])
      .map((t) => sanitizeText(t, 60))
      .filter((t): t is string => Boolean(t)),
    examples: (input.examples ?? [])
      .map((ex) => {
        const en = sanitizeText(ex.en, 2000)
        if (!en) return null
        const fr = sanitizeText(ex.fr, 2000)
        return fr ? { en, fr } : { en }
      })
      .filter((ex): ex is { en: string; fr?: string } => ex !== null),
  }
}

/** Find an existing entry by lemma, case-insensitively. */
export async function findByLemma(lemma: string): Promise<Word | undefined> {
  const needle = lemma.trim().toLowerCase()
  if (!needle) return undefined
  return db.words.filter((w) => w.lemma.toLowerCase() === needle).first()
}

/**
 * Add a word and its card in one transaction.
 *
 * If the lemma is already in the deck nothing is written and the existing
 * id comes back — callers surface that as "already in your deck" rather
 * than pretending to have added something.
 */
export async function addWordToDeck(input: NewWord): Promise<AddResult> {
  const word = clean(input)
  if (!word.lemma) throw new Error('A word needs a lemma.')

  const existing = await findByLemma(word.lemma)
  if (existing?.id != null) {
    return { status: 'duplicate', wordId: existing.id }
  }

  const now = Date.now()
  return db.transaction('rw', [db.words, db.cards], async () => {
    const id = (await db.words.add({
      ...word,
      addedAt: word.addedAt ?? now,
      source: word.source ?? 'user',
    } as Word)) as number
    // New cards are due immediately: something you just chose to learn
    // should show up in tonight's queue, not in a week.
    await db.cards.add(newCard(id, now))
    return { status: 'added' as const, wordId: id }
  })
}

/** Add several words, skipping the ones already present. Returns the tally. */
export async function addManyToDeck(
  inputs: NewWord[],
): Promise<{ added: number; duplicates: number }> {
  let added = 0
  let duplicates = 0
  for (const input of inputs) {
    const result = await addWordToDeck(input)
    if (result.status === 'added') added++
    else duplicates++
  }
  return { added, duplicates }
}

/** Patch an existing word. Its SRS card and history are untouched. */
export async function updateWord(id: number, patch: Partial<NewWord>): Promise<void> {
  const cleaned = clean(patch as NewWord)
  const next: Partial<Word> = {}
  // Only copy fields the caller actually supplied, so a partial edit does
  // not blank out everything it left alone.
  for (const key of Object.keys(patch) as Array<keyof NewWord>) {
    const value = cleaned[key]
    if (value !== undefined) (next as Record<string, unknown>)[key] = value
  }
  if (Object.keys(next).length === 0) return
  await db.words.update(id, next)
}

/** Which of these lemmas are already in the deck (lowercased set). */
export async function existingLemmas(lemmas: string[]): Promise<Set<string>> {
  const wanted = new Set(lemmas.map((l) => l.trim().toLowerCase()))
  const found = new Set<string>()
  await db.words.each((w) => {
    const key = w.lemma.toLowerCase()
    if (wanted.has(key)) found.add(key)
  })
  return found
}
