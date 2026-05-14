/**
 * Ask Mistral to generate a fresh, natural English sentence using a specific
 * word — for the "Words in context" practice mode.
 *
 * Sentence length and vocabulary register are calibrated against the
 * learner's CEFR level (A1..C2), so an A2 learner doesn't get a 16-word
 * collocation-heavy sentence, and a C2 learner doesn't get baby English.
 */

import { chatJSON } from './chat'
import type { ChatMessage } from './chat'
import type { Level, Word } from '@/types'

export interface ContextSentence {
  /** The generated English sentence. */
  sentence: string
  /** French translation of the sentence (displayed as a hint). */
  translationFr: string
  /** A one-line hint about the word's meaning, in English (no FR). */
  hint: string
  /** The exact form of the word that appears in the sentence (may be conjugated). */
  surfaceForm: string
}

/** Per-CEFR-level guidance on length + vocabulary complexity. */
const LEVEL_GUIDANCE: Record<Level, string> = {
  A1: 'Length 5–8 words. Use only the 500 most common English words. Simple present/past. No idioms, no phrasal verbs.',
  A2: 'Length 7–10 words. Very common vocabulary. Simple tenses. At most one easy phrasal verb.',
  B1: 'Length 9–12 words. Everyday professional vocabulary. One phrasal verb or common idiom is fine.',
  B2: 'Length 10–14 words. Natural professional register. Common idioms and collocations welcome.',
  C1: 'Length 12–16 words. Rich, idiomatic professional English. Collocations and subtle register shifts.',
  C2: 'Length 13–18 words. Near-native: rare collocations, nuanced register, occasional literary flourish.',
}

function systemPrompt(level: Level): string {
  return `You are a professional English tutor for a French learner currently at CEFR level ${level}.
Your job: generate ONE natural English sentence that demonstrates a target word in a realistic professional context (design, tech, business, leadership, or daily work).

LEVEL CALIBRATION (strict):
${LEVEL_GUIDANCE[level]}

Rules:
- The sentence MUST contain the target word or a natural conjugation/inflection of it.
- Tone: natural and modern. No clichés, no textbook-style phrasing.
- Avoid naming the word in a quoted/labeled way ("the word 'X' means..."). Use it naturally.
- Return strict JSON only.`
}

interface Raw {
  sentence?: string
  translation_fr?: string
  hint?: string
  surface_form?: string
}

export async function generateContextSentence(
  word: Word,
  opts: { signal?: AbortSignal; level?: Level } = {},
): Promise<ContextSentence> {
  const level = opts.level ?? 'B2'
  const userPrompt = buildPrompt(word)
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(level) },
    { role: 'user', content: userPrompt },
  ]

  const raw = await chatJSON<Raw>(messages, {
    temperature: 0.8,
    maxTokens: 300,
    signal: opts.signal,
  })

  const sentence = (raw.sentence ?? '').trim()
  const translationFr = (raw.translation_fr ?? '').trim()
  const hint = (raw.hint ?? '').trim()
  const surfaceForm = (raw.surface_form ?? word.lemma).trim()

  if (!sentence) throw new Error('Mistral returned no sentence.')
  return { sentence, translationFr, hint, surfaceForm }
}

function buildPrompt(word: Word): string {
  const tags = word.tags.length ? word.tags.join(', ') : 'professional'
  const pos = word.partOfSpeech
  const def = word.definitionEn ? `\nDefinition (EN): ${word.definitionEn}` : ''
  return `Target word: "${word.lemma}" (${pos}, ${word.level})
Tags: ${tags}${def}

Return JSON with this exact shape:
{
  "sentence": "A natural English sentence using the target word, calibrated to the level above.",
  "translation_fr": "Traduction française de la phrase.",
  "hint": "A short English hint about what the word means (one short clause, do not repeat the word).",
  "surface_form": "The exact form of the word as it appears in the sentence (e.g. 'leveraged' if conjugated)."
}`
}
