/**
 * Interview Simulator — role-parameterized English interview practice.
 *
 * The user picks:
 *   - role      (free text, e.g. "Senior Product Designer", "Data Analyst")
 *   - company   (optional free text, e.g. "Airbnb", "early-stage startup")
 *   - round     (behavioral | technical | culture | mixed)
 *
 * The simulator runs a multi-turn conversation:
 *   - `interviewerOpener()`  — immediate first line (no API call needed)
 *   - `interviewerReply()`   — next question, given history + setup + level
 *   - `interviewCoach()`     — end-of-session feedback pass
 *
 * Calibration:
 *   - Interviewer's OWN English is calibrated to the user's CEFR level
 *     (we don't dump C1 jargon on an A2 learner) but content is still
 *     realistic for the chosen role.
 *   - The user can interrupt / ask clarifying questions at any time —
 *     the prompt tells the interviewer to answer briefly then re-ask.
 */

import { chat, chatJSON } from './chat'
import type { ChatMessage } from './chat'
import type { Level } from '@/types'

export type InterviewRound = 'behavioral' | 'technical' | 'culture' | 'mixed'

export interface InterviewSetup {
  /** User-chosen role — e.g. "Senior Product Designer". */
  role: string
  /** Optional company/context — e.g. "Airbnb", "early-stage fintech". */
  company?: string
  /** Which kind of interview round to simulate. */
  round: InterviewRound
}

export interface InterviewerTurn {
  /** Next line from the interviewer — a question, follow-up, or clarification. */
  reply: string
  /** Set to true on the last planned question so the UI can show "wrap up?". */
  endOfRound: boolean
}

export interface CoachFeedback {
  /** One-paragraph overall impression. */
  overall: string
  /** 3 things the user did well. */
  strengths: string[]
  /** 3 concrete things to improve next time. */
  improvements: string[]
  /** Overall rating, 0..10 (integer). */
  rating: number
  /** Short English-language advice on what to focus on next session. */
  nextFocus: string
}

/** Level-scoped calibration for the INTERVIEWER's spoken English. */
const LEVEL_GUIDANCE: Record<Level, string> = {
  A1: 'Speak in VERY simple present tense, one short question at a time (under 10 words). Use the 500 most common English words. No idioms, no multi-part questions.',
  A2: 'Speak in short, clear sentences (one question at a time, under 15 words). Common words only. One easy phrasal verb max.',
  B1: 'Speak in plain professional English (1–2 short sentences). Mix tenses naturally. Simple idioms are fine.',
  B2: 'Speak in natural professional English (2–3 sentences). Realistic interview tone — warm but probing. Idioms and phrasal verbs welcome.',
  C1: 'Speak like a real senior interviewer — idiomatic, precise, follow-up probes, occasional light humour. 2–4 sentences.',
  C2: 'Speak like a top-tier interviewer — subtle challenges, nuanced follow-ups, cultural references. Natural, varied register.',
}

const ROUND_FOCUS: Record<InterviewRound, string> = {
  behavioral:
    'Focus on BEHAVIORAL questions: past experience, STAR-format prompts (Situation / Task / Action / Result), leadership, conflict, failure, collaboration. Probe with follow-ups ("What would you do differently?", "How did the team react?").',
  technical:
    'Focus on ROLE-APPROPRIATE technical questions: case studies, critiques, hands-on problem-framing, trade-offs. Adjust the depth to the role seniority the user specified. Do NOT ask the user to write code — this is spoken/written practice, not a live coding test.',
  culture:
    'Focus on CULTURE / VALUES-FIT questions: motivation, work style, why this company, how they handle ambiguity, feedback, growth.',
  mixed:
    'Blend behavioral, role-appropriate technical thinking, and culture-fit. Vary the angles. Start warm, get progressively more probing.',
}

function systemPrompt(setup: InterviewSetup, level: Level): string {
  const companyLine = setup.company
    ? `You represent "${setup.company}" — reflect its style (pace, bar, formality) when it fits. If it's a well-known company, lean into that tone realistically.`
    : 'No specific company is set — behave like a senior hiring manager at a respected, modern company.'

  return `You are a senior, experienced interviewer conducting an English-language interview for the role: "${setup.role}".
${companyLine}

ROUND TYPE: ${setup.round}
${ROUND_FOCUS[setup.round]}

The candidate is a French native learning English, currently at CEFR ${level}. The interview must feel REAL — not a language lesson. Never correct their grammar, never praise their English. Just interview them.

LEVEL CALIBRATION — how YOU speak to them:
${LEVEL_GUIDANCE[level]}

Interview flow rules:
- Plan for roughly 6–8 questions total. Mark endOfRound=true ONLY on the last planned question.
- One question at a time. Wait for their answer. Then either probe deeper OR move on.
- React naturally: "Interesting, tell me more about…", "And what happened next?", short affirmations.
- If the candidate INTERRUPTS or asks a clarifying question back (e.g. "Can you repeat?", "What do you mean by X?", "Do you mean A or B?"), give a brief, genuine answer (1 sentence) and then re-issue or rephrase your question. Do NOT punish them for asking.
- If their answer is very short or evasive, follow up ONCE to draw them out before moving on.
- No grammar feedback. No "great English". Zero meta-commentary about the simulation.
- Stay in persona throughout.

Output STRICT JSON:
{
  "reply":       string,   // Your next line — a question, a probe, or a clarifying answer+rephrase. Calibrated to the LEVEL CALIBRATION.
  "endOfRound":  boolean   // true ONLY on your final planned question (so the UI can offer to wrap up).
}

No markdown, no backticks. JSON only.`
}

/** Instant first line — no API call. Keeps the session snappy. */
export function interviewerOpener(setup: InterviewSetup, level: Level): string {
  const roleLine = setup.role || 'this role'
  const companyLine = setup.company ? ` at ${setup.company}` : ''

  // Short, warm, level-aware. A1/A2 = ultra-simple, C1/C2 = natural.
  if (level === 'A1') {
    return `Hi. Welcome. Thank you for coming. Tell me about yourself, please.`
  }
  if (level === 'A2') {
    return `Hi, welcome. Thanks for making time today. To start — can you tell me a bit about yourself?`
  }
  if (level === 'B1') {
    return `Hi, welcome — thanks for being here. To kick things off, can you walk me through your background and what brings you to ${roleLine}${companyLine}?`
  }
  return `Hi, thanks for making the time. Let's dive in — give me the short version of your story so far, and what draws you to ${roleLine}${companyLine}.`
}

/** Ask the LLM for the next interviewer turn. */
export async function interviewerReply(
  history: ChatMessage[],
  setup: InterviewSetup,
  level: Level = 'B2',
): Promise<InterviewerTurn> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(setup, level) },
    ...history,
  ]

  const raw = await chatJSON<Partial<InterviewerTurn>>(messages, {
    temperature: 0.75,
    maxTokens: 350,
  })

  const reply = (raw.reply ?? '').trim()
  if (!reply) throw new Error('Interviewer returned an empty reply.')

  return {
    reply,
    endOfRound: raw.endOfRound === true,
  }
}

/** Build the wrap-up coach feedback at end of session. */
export async function interviewCoach(
  history: ChatMessage[],
  setup: InterviewSetup,
  level: Level = 'B2',
): Promise<CoachFeedback> {
  const coachSystem = `You are an English-speaking interview coach. You just observed an interview for the role "${setup.role}"${
    setup.company ? ` at ${setup.company}` : ''
  } (round: ${setup.round}). The candidate's CEFR level is ${level}.

Review the transcript and produce STRICT JSON feedback aimed at helping them ace the NEXT real interview. Be direct, kind, specific. Never inflate. If an answer was weak, say so and give a better phrasing they could have used. Speak IN ENGLISH (immersion). Calibrate vocabulary slightly above their level (${level}) to stretch them.

{
  "overall":      string,    // 2–3 sentence overall impression.
  "strengths":    string[],  // Exactly 3 short bullets (one line each).
  "improvements": string[],  // Exactly 3 short bullets with concrete advice.
  "rating":       number,    // Overall 0–10 integer.
  "nextFocus":    string     // One sentence on what to practice next time.
}

No markdown, no backticks. JSON only.`

  const transcript = history
    .map((m) => {
      const who = m.role === 'assistant' ? 'INTERVIEWER' : 'CANDIDATE'
      return `${who}: ${m.content}`
    })
    .join('\n\n')

  const messages: ChatMessage[] = [
    { role: 'system', content: coachSystem },
    { role: 'user', content: `Transcript:\n\n${transcript}` },
  ]

  const raw = await chatJSON<Partial<CoachFeedback>>(messages, {
    temperature: 0.4,
    maxTokens: 700,
  })

  return {
    overall: (raw.overall ?? '').trim() || 'Nice session — keep it up.',
    strengths: (raw.strengths ?? []).slice(0, 3).map(String),
    improvements: (raw.improvements ?? []).slice(0, 3).map(String),
    rating: clampRating(raw.rating),
    nextFocus:
      (raw.nextFocus ?? '').trim() ||
      'Practice another round next time with more concrete examples.',
  }
}

function clampRating(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n ?? 0)
  if (!Number.isFinite(v)) return 5
  return Math.max(0, Math.min(10, Math.round(v)))
}

/**
 * Lightweight heuristic — did the user probably INTERRUPT / ask a clarifier
 * rather than answer? Used by the UI to show a small "re-ask" cue. The LLM
 * also handles this natively, but this keeps the UI honest.
 */
export function looksLikeInterruption(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (t.length === 0) return false
  // Short + ends with "?" → probably a clarifier.
  if (t.length < 80 && t.endsWith('?')) return true
  return /^(sorry|wait|repeat|can you|could you|what do you mean|pardon|one sec|hold on)/.test(
    t,
  )
}

/** Optional non-JSON text utility (unused by default but handy for debug). */
export async function rawReply(messages: ChatMessage[]): Promise<string> {
  return chat(messages, { temperature: 0.7, maxTokens: 350 })
}
