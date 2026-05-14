/**
 * Teach a SINGLE word — for the "Learn from anything → one word" flow.
 *
 * The user types a word (e.g. "leverage", or even an inflected form like
 * "leveraged"); Mistral returns everything we need to actually TEACH that
 * word: lemma, POS, CEFR level of the word itself, IPA, FR translation,
 * a one-line definition, three example sentences calibrated to the
 * learner's level, and a short usage note.
 *
 * Why a separate helper from `extractVocab`:
 *   - extractVocab pulls items from a passage and ties each to a quoted
 *     example from that passage — wrong shape for "teach me one word".
 *   - We want MULTIPLE example sentences here so the learner can absorb
 *     the word in different contexts before being tested.
 *   - We want the word's actual CEFR level, even if it's higher or lower
 *     than the user's, so the deck classification stays honest.
 */

import { chatJSON } from './chat'
import type { ChatMessage } from './chat'
import type { Level, PartOfSpeech } from '@/types'

export interface TaughtWord {
  /** Normalized base form (e.g. user typed "leveraged" → lemma "leverage"). */
  lemma: string
  partOfSpeech: PartOfSpeech
  /** CEFR level of the WORD itself, not the learner. */
  level: Level
  /** IPA pronunciation. May be empty if Mistral can't produce one. */
  ipa?: string
  fr: string
  definitionEn: string
  /** 3 example sentences calibrated to the LEARNER's level. */
  examples: { en: string; fr: string }[]
  /** One-line note on common usage / register / typical collocations. */
  usageNote?: string
}

interface RawExample {
  en?: string
  fr?: string
}

interface RawResponse {
  lemma?: string
  part_of_speech?: string
  level?: string
  ipa?: string
  fr?: string
  definition_en?: string
  examples?: RawExample[]
  usage_note?: string
}

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

/** Per-CEFR-level guidance for the example sentences shown to the learner. */
const LEVEL_GUIDANCE: Record<Level, string> = {
  A1: 'Very short examples (5–8 words). Only the 500 most common English words. No idioms.',
  A2: 'Short examples (7–10 words). Common vocabulary, simple tenses.',
  B1: 'Everyday examples (9–12 words). One phrasal verb or common idiom is fine.',
  B2: 'Natural professional examples (10–14 words). Common idioms welcome.',
  C1: 'Rich, idiomatic examples (12–16 words). Collocations, register shifts.',
  C2: 'Near-native examples (13–18 words). Subtle nuance, rare collocations.',
}

function systemPrompt(userLevel: Level): string {
  return `You are a professional English tutor for a French learner currently at CEFR level ${userLevel}.

Your job: take ONE English word (or short phrase / idiom) the learner wants to understand and produce a complete teaching card.

If the input is conjugated, plural, or in any inflected form, NORMALISE it to the dictionary lemma (e.g. "leveraged" → "leverage", "stakeholders" → "stakeholder", "running late" → "run late").
If the input is misspelled, correct it. If it isn't a real English word, return level "B1", part_of_speech "other", and explain in usage_note that you couldn't recognise it.

Return STRICT JSON with this exact shape:
{
  "lemma": "base/dictionary form (lowercase, singular, infinitive)",
  "part_of_speech": "noun | verb | adjective | adverb | preposition | conjunction | pronoun | interjection | phrase | idiom",
  "level": "A1 | A2 | B1 | B2 | C1 | C2 — CEFR level of the word itself, judged honestly",
  "ipa": "IPA pronunciation between slashes, e.g. /ˈlɛv.ər.ɪdʒ/. Empty string if unsure.",
  "fr": "the most natural French translation",
  "definition_en": "ONE plain-English sentence, simpler than the word itself",
  "examples": [
    { "en": "Example sentence using the word naturally.", "fr": "Traduction française de la phrase." },
    { "en": "Different example, different context.", "fr": "Traduction." },
    { "en": "Third example, different register or tense.", "fr": "Traduction." }
  ],
  "usage_note": "Optional one-line note on register, common collocations, or pitfalls. Keep under 20 words. Empty string if no useful note."
}

EXAMPLE CALIBRATION (strict — for the THREE example sentences only):
${LEVEL_GUIDANCE[userLevel]}

Hard rules:
- Always return EXACTLY 3 examples in different contexts (work / daily life / abstract). Never fewer.
- Each example MUST contain the word (or a natural conjugation/inflection of it). NEVER a synonym.
- The definition_en MUST NOT use the word itself — define it via simpler synonyms.
- Tone: warm, professional, modern. No clichés, no textbook clichés.
- Output JSON only. No prose, no markdown.`
}

export async function teachWord(
  rawInput: string,
  opts: { signal?: AbortSignal; userLevel?: Level } = {},
): Promise<TaughtWord> {
  const input = rawInput.trim()
  if (!input) throw new Error('Type a word first.')
  if (input.length > 80) throw new Error('That looks too long for one word — paste it as text instead.')

  const userLevel = opts.userLevel ?? 'B1'
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(userLevel) },
    {
      role: 'user',
      content: `Word the learner wants to understand: "${input}"\n\nReturn the teaching card now.`,
    },
  ]

  const raw = await chatJSON<RawResponse>(messages, {
    temperature: 0.4,
    maxTokens: 700,
    signal: opts.signal,
  })

  return normalize(raw)
}

function normalize(raw: RawResponse): TaughtWord {
  const lemma = (raw.lemma ?? '').trim().toLowerCase()
  if (!lemma) throw new Error('Mistral returned no lemma — please try again.')

  const posRaw = (raw.part_of_speech ?? '').trim().toLowerCase()
  const partOfSpeech: PartOfSpeech = POS_MAP[posRaw] ?? 'other'

  const levelRaw = (raw.level ?? '').trim().toUpperCase()
  const level: Level = VALID_LEVELS.has(levelRaw as Level)
    ? (levelRaw as Level)
    : 'B1'

  const fr = (raw.fr ?? '').trim()
  const definitionEn = (raw.definition_en ?? '').trim()
  if (!fr || !definitionEn) {
    throw new Error('Mistral response was incomplete — please try again.')
  }

  const examples = (raw.examples ?? [])
    .map((ex) => ({ en: (ex.en ?? '').trim(), fr: (ex.fr ?? '').trim() }))
    .filter((ex) => ex.en.length > 0)
  if (examples.length === 0) {
    throw new Error('Mistral returned no examples — please try again.')
  }

  const ipa = (raw.ipa ?? '').trim() || undefined
  const usageNote = (raw.usage_note ?? '').trim() || undefined

  return {
    lemma,
    partOfSpeech,
    level,
    ipa,
    fr,
    definitionEn,
    examples,
    usageNote,
  }
}
