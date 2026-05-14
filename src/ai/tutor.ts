/**
 * Writing-chat tutor — free-form English conversation with inline corrections.
 *
 * For each user message, Mistral returns JSON:
 *   - correction: a polished C1/C2 rewrite if the user made mistakes, else null
 *   - reply:      the tutor's natural reply, driving the conversation forward
 *   - note:       (optional) a tiny 1-line note in English about WHY the
 *                 correction was needed — only if correction is non-null
 */

import { chatJSON } from './chat'
import type { ChatMessage } from './chat'
import type { Level } from '@/types'

export interface TutorTurn {
  correction: string | null
  reply: string
  note: string | null
}

/** How the tutor should calibrate its own output for each CEFR level. */
const LEVEL_GUIDANCE: Record<Level, string> = {
  A1: 'Keep replies VERY short (1 sentence), simple present tense, the 500 most common English words. No idioms, no phrasal verbs, no jokes.',
  A2: 'Keep replies short (1–2 sentences), common words, simple past / present / future. One light phrasal verb max. No slang.',
  B1: 'Use clear, everyday English (1–2 sentences). Mix tenses naturally. A simple idiom or common phrasal verb is welcome.',
  B2: 'Use natural, varied English (2–3 sentences). Common idioms and phrasal verbs are welcome. Occasional nuance.',
  C1: 'Use rich, idiomatic English (2–3 sentences). Collocations, precise verbs, natural register shifts.',
  C2: 'Use near-native English (2–4 sentences). Subtle humour, literary turns, rare collocations, cultural references.',
}

function systemPrompt(level: Level): string {
  return `You are a friendly but exacting English tutor for Teekky, a senior French learner currently at CEFR level ${level}.

LEVEL CALIBRATION — this is how YOU speak:
${LEVEL_GUIDANCE[level]}
Stretch him slightly above his level, but never crash down to a lower one.

Teekky's background is UX/UI design, but he is NOT here to only talk shop. Follow HIS lead — travel, food, films, books, weekend plans, philosophy, politics, sports, family, music, coding, current events, whatever he brings up. Only talk about design, product, or Figma if HE raises it first. If no topic is set yet, pick something fresh and human (not work).

Treat the user as a peer. Keep replies warm and idiomatic for the level above.

For every user message, you must return STRICT JSON with this exact shape:
{
  "correction": string | null,   // If the user made ANY grammar, word-choice, or idiomatic mistake, provide a polished rewrite of their ENTIRE message — aim ONE level above his current (${level}). If their message is already clean for his level, return null.
  "reply":      string,          // Your natural reply in English, calibrated to the LEVEL CALIBRATION above. Ask a follow-up question when it fits.
  "note":       string | null    // If correction is non-null, ONE short English clause explaining the key fix (max ~12 words). Otherwise null.
}

Hard rules:
- Track the current topic from the conversation history and STAY on it. Never force-switch to design or product unless the user does.
- NEVER include both the raw user text and the correction — only the rewritten version.
- NEVER mention that you are an AI. Stay in tutor persona.
- If the user writes in French, gently reply in English and model the phrase they probably meant.
- If the user message is empty, ask a fresh open-ended question on a non-work topic.
- Output JSON only. No markdown, no backticks.`
}

export async function tutorReply(
  history: ChatMessage[],
  level: Level = 'B2',
): Promise<TutorTurn> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(level) },
    ...history,
  ]

  const raw = await chatJSON<Partial<TutorTurn>>(messages, {
    temperature: 0.7,
    maxTokens: 500,
  })

  const reply = (raw.reply ?? '').trim()
  if (!reply) throw new Error('Tutor returned an empty reply.')

  // Normalize nulls — some models emit "null" as a string.
  const correction =
    raw.correction && raw.correction !== 'null'
      ? String(raw.correction).trim() || null
      : null
  const note =
    raw.note && raw.note !== 'null' ? String(raw.note).trim() || null : null

  return { correction, reply, note: correction ? note : null }
}

/**
 * Opener shown before the user types anything.
 *
 * Deliberately wide-ranging — travel, food, culture, weekend, current
 * events — so the conversation doesn't always collapse back to work/design.
 * A couple of open-ended ones let the user pick the topic entirely.
 */
export function tutorOpener(): string {
  const openers = [
    "Hey Teekky — good to see you. What's on your mind today?",
    'Hi! Pick any topic and we\'ll go from there. What feels interesting right now?',
    'Hey — what did you get up to this weekend? Tell me the best bit.',
    'Hi there. Read, watched, or listened to anything good lately?',
    "Hey, tell me about somewhere you'd love to travel to next. Why that place?",
    "Morning! What's one small thing that made you happy this week?",
    'Hey — if you had a free afternoon tomorrow, how would you spend it?',
    "Hi! Let's start light: what's the last meal you cooked (or really enjoyed)?",
    "Hey Teekky. What's a topic you wish more people talked about? Go.",
  ]
  return openers[Math.floor(Math.random() * openers.length)]
}
