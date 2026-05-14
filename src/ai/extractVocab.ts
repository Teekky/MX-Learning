/**
 * Extract learn-worthy vocabulary from a user-supplied passage.
 *
 * The "Learn from anything" flow: Teekky pastes an article / email / doc,
 * Mistral picks out the words that are actually above her comfort zone,
 * returning enough metadata (CEFR, FR, EN def, example) to drop the word
 * straight into the SRS deck — same shape as the seed.
 *
 * Design choices:
 *   - Request a bounded list (8–20). More is noise.
 *   - Skip words at or below the user's current CEFR level (no point
 *     re-learning "the"/"work" if you're C1).
 *   - Skip proper nouns, URLs, numbers, emoji — Mistral does this.
 *   - Return the EXACT example sentence from the source (quoted span),
 *     so the learner sees the word in the context they encountered.
 *   - One Mistral call, JSON mode. No chunking yet — Mistral can handle
 *     ~4k tokens of context easily.
 */

import { chatJSON } from './chat'
import type { ChatMessage } from './chat'
import type { Level, PartOfSpeech } from '@/types'

export interface ExtractedWord {
  lemma: string
  partOfSpeech: PartOfSpeech
  level: Level
  fr: string
  definitionEn: string
  /** A short excerpt from the source passage that contains the word. */
  exampleEn: string
  /** The surface form as it appeared in the passage. */
  surfaceForm: string
}

interface RawWord {
  lemma?: string
  part_of_speech?: string
  level?: string
  fr?: string
  definition_en?: string
  example_en?: string
  surface_form?: string
}

interface RawResponse {
  words?: RawWord[]
}

const MAX_WORDS = 20
const MIN_WORDS = 1
const MAX_PASSAGE_CHARS = 6000

const POS_MAP: Record<string, PartOfSpeech> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  adverb: 'adverb',
  preposition: 'preposition',
  conjunction: 'conjunction',
  pronoun: 'pronoun',
  interjection: 'interjection',
  phrase: 'phrase',
  idiom: 'idiom',
}

const VALID_LEVELS = new Set<Level>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

function systemPrompt(userLevel: Level): string {
  return `You are a professional English tutor for a French learner currently at CEFR level ${userLevel}.
Your job: read an English passage and extract every distinct content word / phrase worth adding to a vocabulary deck — 8 to 20 items.

Selection rules (strict):
- Include every meaningful word regardless of CEFR level. A new word is a new word — even A1 items are valid to learn and review.
- Skip proper nouns, brand names, people names, URLs, numbers, emoji, and pure function words (the, of, and, is, it, a…).
- Prefer words that carry real meaning. Include idioms, phrasal verbs, and common collocations when present.
- Deduplicate: if the same lemma appears multiple times, include it once.
- If the passage contains fewer than 8 distinct content words, return as many as exist. Do not pad.
- Cap at 20.

For each word, return:
  - lemma: base/dictionary form (lowercase, singular, infinitive).
  - part_of_speech: one of noun, verb, adjective, adverb, preposition, conjunction, pronoun, interjection, phrase, idiom.
  - level: CEFR level of the word itself (A1, A2, B1, B2, C1, or C2), judged honestly — do NOT auto-label everything as the user's level.
  - fr: accurate French translation (the most natural one in context).
  - definition_en: plain-English definition, ONE short sentence, simpler than the word itself.
  - example_en: a SHORT excerpt (max 20 words) from the passage that contains the word. Quote the source, do not paraphrase. If the passage sentence is long, take just the clause that contains the word.
  - surface_form: exactly how the word appears in the passage (e.g. "leveraged").

Return strict JSON: { "words": [ ... ] }. No prose, no markdown.`
}

export async function extractVocabulary(
  passage: string,
  opts: { signal?: AbortSignal; userLevel?: Level } = {},
): Promise<ExtractedWord[]> {
  const trimmed = passage.trim()
  if (!trimmed) return []

  const level = opts.userLevel ?? 'B2'
  const clipped =
    trimmed.length > MAX_PASSAGE_CHARS
      ? trimmed.slice(0, MAX_PASSAGE_CHARS) + '…'
      : trimmed

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(level) },
    {
      role: 'user',
      content: `Passage:\n"""\n${clipped}\n"""\n\nExtract vocabulary per the rules. Return the JSON object now.`,
    },
  ]

  const raw = await chatJSON<RawResponse>(messages, {
    temperature: 0.3,
    maxTokens: 2000,
    signal: opts.signal,
  })

  const out: ExtractedWord[] = []
  const seen = new Set<string>()
  for (const w of raw.words ?? []) {
    const norm = normalize(w)
    if (!norm) continue
    const key = norm.lemma.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(norm)
    if (out.length >= MAX_WORDS) break
  }

  if (out.length < MIN_WORDS && (raw.words?.length ?? 0) > 0) {
    // Mistral returned items but none were valid — surface as error so the
    // UI can show a specific message rather than a silent empty list.
    throw new Error('Extracted items were invalid — please try again.')
  }

  return out
}

function normalize(raw: RawWord): ExtractedWord | null {
  const lemma = (raw.lemma ?? '').trim().toLowerCase()
  if (!lemma || lemma.length > 60) return null

  const posRaw = (raw.part_of_speech ?? '').trim().toLowerCase()
  const partOfSpeech = POS_MAP[posRaw] ?? 'other'

  const levelRaw = (raw.level ?? '').trim().toUpperCase()
  if (!VALID_LEVELS.has(levelRaw as Level)) return null
  const level = levelRaw as Level

  const fr = (raw.fr ?? '').trim()
  const definitionEn = (raw.definition_en ?? '').trim()
  const exampleEn = (raw.example_en ?? '').trim()
  const surfaceForm = (raw.surface_form ?? lemma).trim()

  if (!fr || !definitionEn || !exampleEn) return null

  return {
    lemma,
    partOfSpeech,
    level,
    fr,
    definitionEn,
    exampleEn,
    surfaceForm,
  }
}
