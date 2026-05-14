/**
 * Daily motivation quote — one per calendar day, English only.
 *
 * Strategy:
 *   1. Check localStorage for a cached quote keyed by today's ISO date. If
 *      hit, return it (zero network).
 *   2. Otherwise ask Mistral for a fresh one, calibrated to the user's
 *      CEFR level and seeded with the ISO date for extra variety.
 *   3. If Mistral fails (no key / rate limit / offline), fall back to a
 *      curated static list indexed by day-of-year so the user still sees
 *      a fresh line every day even without the network.
 *
 * The cache survives reloads but resets at midnight naturally, because the
 * key includes the date.
 */

import { chatJSON } from './chat'
import { hasMistralKey } from './mistral'
import { isoDate } from '@/utils/dailyLog'
import type { Level } from '@/types'

const CACHE_PREFIX = 'mx:motivation:'

/** Static fallback pool — short, warm, English. */
const FALLBACK_QUOTES: string[] = [
  "Tiny daily effort compounds. Five minutes today beats an hour next week.",
  "Fluency isn't a finish line — it's a rhythm. Keep the rhythm.",
  'Every sentence you struggle with is a sentence you own tomorrow.',
  "You don't need to be fearless — just one notch braver than yesterday.",
  "Mistakes are the sound of English moving from your head to your tongue.",
  'Read one line. Say one line. Win one line. Repeat.',
  "Pronunciation gets crisper with the sentences you actually care about.",
  'The words you reach for are the words that start reaching back.',
  "Your accent is a passport, not a flaw. Trim it, don't erase it.",
  'Comfort is a nice place to visit, never a nice place to live in a new language.',
  "Look up that one word you keep dodging. That's the whole lesson.",
  'Speak before you feel ready. Readiness shows up after the first sentence.',
  'Progress hides in sessions that felt pointless. Trust the log.',
  "Short, curious questions beat long, careful speeches. Ask more, prove less.",
  "If it felt hard today, the circuit is being rewired. Good.",
  'Translate thoughts, not sentences. Ideas first, grammar second.',
  "One idiom well-placed outweighs ten memorised definitions.",
  'Confidence is built in the moments you would rather skip.',
  "A clumsy sentence spoken out loud beats a perfect sentence left unsaid.",
  "Today's awkward phrasing is tomorrow's natural instinct.",
  'Read something you love in English for ten minutes. The grammar follows.',
  "Celebrate the reviews you finished, not the ones you missed.",
  'Every review is a small bet on your future self in an interview.',
  'Notice the English you consumed today without translating. That list is growing.',
  "When in doubt, pick the shorter, rounder word. Native speakers do.",
  'Curiosity beats willpower. Chase a topic you actually want to discuss.',
  "Thirty deliberate minutes beat three distracted hours.",
  "You're not learning English. You're becoming someone who speaks it.",
  'Write the sentence you are afraid to write. Then read it aloud.',
  "A native speaker is just someone who stopped apologising for their accent.",
]

const SYSTEM_PROMPT = `You write ONE short motivational line in English for a French learner practicing to reach near-native level.

Rules:
- English only. No French, no quotes around the line, no hashtags, no emojis.
- One sentence, 10 to 22 words. Warm, grounded, a little clever. Not cheesy, not corny.
- Avoid generic gym-bro phrasing ("no pain no gain", "hustle", "grind").
- Vary the angle: sometimes practical, sometimes philosophical, sometimes playful, sometimes about identity.
- Do NOT mention "today" explicitly; the app will surface it once per day.

Return strict JSON only:
{
  "line": "Your single English sentence here."
}`

interface Raw {
  line?: string
}

export interface DailyMotivation {
  /** ISO date (local) the line was generated for. */
  date: string
  /** The English motivational line. */
  line: string
  /** "mistral" if generated, "fallback" if the static pool was used. */
  source: 'mistral' | 'fallback'
}

/**
 * Fetch today's motivation. Cached in localStorage so the same day never
 * triggers a second network round-trip.
 */
export async function getDailyMotivation(
  level: Level = 'B2',
): Promise<DailyMotivation> {
  const date = isoDate()
  const cacheKey = `${CACHE_PREFIX}${date}`

  // 1) Cache hit — reuse verbatim.
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached) as DailyMotivation
      if (parsed.date === date && parsed.line) return parsed
    }
  } catch {
    /* localStorage can be disabled — fall through. */
  }

  // 2) Try Mistral (skip if no key).
  if (hasMistralKey()) {
    try {
      const raw = await chatJSON<Raw>(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Date seed: ${date}. Learner CEFR level: ${level}. Write today's line.`,
          },
        ],
        { temperature: 0.95, maxTokens: 120 },
      )
      const line = (raw.line ?? '').trim().replace(/^["“]+|["”]+$/g, '')
      if (line.length > 0) {
        const out: DailyMotivation = { date, line, source: 'mistral' }
        safePersist(cacheKey, out)
        return out
      }
    } catch {
      /* Rate limit, network, bad JSON — silently drop to fallback. */
    }
  }

  // 3) Fallback pool — day-of-year index so it rotates deterministically.
  const doy = dayOfYear(new Date())
  const line = FALLBACK_QUOTES[doy % FALLBACK_QUOTES.length]
  const out: DailyMotivation = { date, line, source: 'fallback' }
  safePersist(cacheKey, out)
  return out
}

function safePersist(key: string, value: DailyMotivation) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    // Sweep yesterday's and older cache entries to keep storage tidy.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(CACHE_PREFIX) && k !== key) localStorage.removeItem(k)
    }
  } catch {
    /* Storage blocked — nothing to do. */
  }
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - start.getTime()
  return Math.floor(diff / 86_400_000)
}
