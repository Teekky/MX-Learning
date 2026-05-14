/**
 * Mistral chat helpers — thin wrappers around the client.
 *
 * Two entry points:
 *   - chat(messages)     → plain text reply
 *   - chatJSON(messages) → JSON object reply (asks for json_object format)
 *
 * Both include a single retry on transient errors.
 */

import { getMistralClient, getModelName } from './mistral'

export type Role = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: Role
  content: string
}

interface ChatOptions {
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

/** Plain text completion. */
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const client = getMistralClient()
  const run = () =>
    client.chat.complete({
      model: getModelName(),
      messages,
      temperature: opts.temperature ?? 0.7,
      maxTokens: opts.maxTokens ?? 400,
    })

  const res = await withRetry(run)
  const first = res.choices?.[0]?.message?.content
  if (typeof first === 'string') return first.trim()
  // Mistral sometimes returns an array of content chunks.
  if (Array.isArray(first)) {
    return first
      .map((c) => (typeof c === 'string' ? c : 'text' in c ? c.text : ''))
      .join('')
      .trim()
  }
  throw new Error('Mistral returned an empty reply.')
}

/** Ask Mistral for a strict JSON object and parse it. */
export async function chatJSON<T = unknown>(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<T> {
  const client = getMistralClient()
  const run = () =>
    client.chat.complete({
      model: getModelName(),
      messages,
      temperature: opts.temperature ?? 0.4,
      maxTokens: opts.maxTokens ?? 400,
      responseFormat: { type: 'json_object' },
    })

  const res = await withRetry(run)
  const raw = res.choices?.[0]?.message?.content
  const text =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw)
        ? raw
            .map((c) => (typeof c === 'string' ? c : 'text' in c ? c.text : ''))
            .join('')
        : ''
  if (!text) throw new Error('Mistral returned an empty JSON reply.')

  try {
    return JSON.parse(text) as T
  } catch {
    // Fallback: try to extract the first {...} block.
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as T
    throw new Error(`Mistral JSON parse failed: ${text.slice(0, 200)}`)
  }
}

/**
 * Retry transient errors with backoff.
 *   - 429 rate limit: up to 3 attempts, longer delays (1.2s → 2.8s)
 *   - other transients (5xx / network): 1 retry at 500ms
 *
 * On final 429 failure we throw a friendly user-facing message instead of
 * Mistral's raw body.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const rateDelays = [1200, 2800]
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (is429(err)) {
        if (attempt < rateDelays.length) {
          await new Promise((r) => setTimeout(r, rateDelays[attempt]))
          continue
        }
        throw new Error(
          'Mistral rate limit hit. Please wait ~10 seconds and try again.',
        )
      }
      if (isTransient(err) && attempt === 0) {
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }
}

function is429(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { status?: number; statusCode?: number; message?: string }
  if (anyErr.status === 429 || anyErr.statusCode === 429) return true
  const msg = (anyErr.message ?? '').toLowerCase()
  return msg.includes('429') || msg.includes('rate limit')
}

function isTransient(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { status?: number; message?: string }
  if (anyErr.status && [408, 500, 502, 503, 504].includes(anyErr.status)) {
    return true
  }
  const msg = (anyErr.message ?? '').toLowerCase()
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('fetch')
  )
}
