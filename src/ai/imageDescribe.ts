/**
 * Image-description grader — uses Mistral's vision model (Pixtral) to
 * compare the user's English description against the actual image.
 *
 * Pixtral accepts either a public URL OR a base64 data URL. We use data
 * URLs so user-uploaded files work offline-ish, and we don't leak random
 * remote URLs to the model.
 */

import { getMistralClient } from './mistral'
import type { Level } from '@/types'

const VISION_MODEL =
  (import.meta.env.VITE_MISTRAL_VISION_MODEL as string | undefined) ??
  'pixtral-12b-2409'

export interface ImageGrade {
  /** 0..100 — how accurate + complete the description is. */
  score: number
  /** Short English verdict: "Spot on.", "Good but missed the mood.", etc. */
  verdict: string
  /** A polished, native-level one-paragraph description of the image. */
  model: string
  /** Things the user captured well. */
  strengths: string[]
  /** Things missed or inaccurate. */
  gaps: string[]
  /** 1–3 idiomatic / richer phrasings at the user's level. */
  suggestions: string[]
}

/** Per-level tuning for grading + the model paragraph. */
const LEVEL_GUIDANCE: Record<Level, string> = {
  A1: 'Expect 1–2 very simple sentences. Model description: 20–30 words, simple words only.',
  A2: 'Expect 2–3 simple sentences. Model description: 30–40 words, common words, simple tenses.',
  B1: 'Expect 3–4 clear sentences. Model description: 40–50 words, everyday vocabulary, one or two phrasal verbs.',
  B2: 'Expect a natural short paragraph. Model description: 45–60 words, varied register, common idioms welcome.',
  C1: 'Expect a rich paragraph. Model description: 50–70 words, precise verbs, collocations, natural register.',
  C2: 'Expect near-native nuance. Model description: 60–80 words, rare collocations, literary flourish.',
}

function systemPrompt(level: Level): string {
  return `You are an English writing coach for a French learner currently at CEFR level ${level}.
You will be shown ONE image and the user's written description of it in English.
Your job is to grade and coach, not to rewrite.

LEVEL CALIBRATION:
${LEVEL_GUIDANCE[level]}
Grade RELATIVE to the user's level — a learner producing clean prose for their level deserves a high score.

Return strict JSON only with this exact shape:
{
  "score": number,              // 0..100, based on accuracy + completeness + fluency, relative to the level above.
  "verdict": string,            // One short English sentence (≤ 12 words) summarising the grade.
  "model": string,              // YOUR own polished paragraph at the calibration above. Vivid, specific, no clichés.
  "strengths": string[],        // 1–3 short bullets — what the user nailed. English, each ≤ 14 words.
  "gaps": string[],             // 1–3 short bullets — important things they missed or got wrong. English, each ≤ 14 words.
  "suggestions": string[]       // 1–3 idiomatic phrasings or stronger word choices, ONE level above their current level. Each one short and actionable.
}

Be precise and generous. Award high scores for accurate, level-appropriate descriptions even if not exhaustive.
If the user's text is empty or irrelevant, return score 0, verdict "No description yet.", and still fill 'model' with your own.
Output JSON only. No markdown, no backticks.`
}

export async function gradeImageDescription(
  imageDataUrl: string,
  userDescription: string,
  level: Level = 'B2',
): Promise<ImageGrade> {
  const client = getMistralClient()

  const call = () =>
    client.chat.complete({
      model: VISION_MODEL,
      temperature: 0.4,
      maxTokens: 700,
      responseFormat: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt(level) },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Here is the user's description:\n"""${userDescription.trim() || '(empty)'}"""\n\nGrade it against the image. Return JSON only.`,
            },
            {
              type: 'image_url',
              imageUrl: imageDataUrl,
            },
          ],
        },
      ],
    })

  const res = await withRateLimitRetry(call)

  const raw = res.choices?.[0]?.message?.content
  const text =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw)
        ? raw
            .map((c) => (typeof c === 'string' ? c : 'text' in c ? c.text : ''))
            .join('')
        : ''
  if (!text) throw new Error('Pixtral returned an empty reply.')

  let parsed: Partial<ImageGrade>
  try {
    parsed = JSON.parse(text) as Partial<ImageGrade>
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`Pixtral JSON parse failed: ${text.slice(0, 200)}`)
    parsed = JSON.parse(match[0]) as Partial<ImageGrade>
  }

  return {
    score: clampScore(parsed.score),
    verdict: (parsed.verdict ?? '').toString().trim() || 'Good effort.',
    model: (parsed.model ?? '').toString().trim(),
    strengths: asStringArray(parsed.strengths),
    gaps: asStringArray(parsed.gaps),
    suggestions: asStringArray(parsed.suggestions),
  }
}

/* ------------------------------ helpers -------------------------------- */

/**
 * Retry up to 2 times on HTTP 429 with exponential backoff (1.5s → 3s).
 * Other errors propagate immediately.
 */
async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1500, 3000]
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!is429(err) || attempt === delays.length) {
        if (is429(err)) {
          throw new Error(
            'Mistral rate limit hit. Please wait ~10 seconds and try again.',
          )
        }
        throw err
      }
      await new Promise((r) => setTimeout(r, delays[attempt]))
    }
  }
  // Unreachable, but keeps TS happy.
  throw new Error('Retry loop exhausted.')
}

function is429(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { status?: number; statusCode?: number; message?: string }
  if (anyErr.status === 429 || anyErr.statusCode === 429) return true
  const msg = (anyErr.message ?? '').toLowerCase()
  return msg.includes('429') || msg.includes('rate limit')
}

function clampScore(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(100, Math.round(x)))
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((s) => s.length > 0)
    .slice(0, 3)
}

/** Convert a File (from an <input type=file>) to a base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

/** Fetch a remote URL and convert it to a base64 data URL (for Pixtral). */
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Downscale an image data URL to `maxDim` on the long edge and re-encode as
 * JPEG at the given quality. Keeps payload small so Pixtral doesn't blow its
 * token-per-minute rate limit (and so less data leaves the device).
 *
 * Runs entirely in the browser via a <canvas>. No network, no disk.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  maxDim = 1024,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const longEdge = Math.max(img.width, img.height)
      const scale = longEdge > maxDim ? maxDim / longEdge : 1
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D not available.'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      try {
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }
    img.onerror = () => reject(new Error('Image decode failed.'))
    img.src = dataUrl
  })
}
