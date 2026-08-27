/**
 * Mistral AI client — single source of truth for all LLM calls.
 *
 * Two ways to supply the key, checked in this order:
 *
 *   1. the key you paste into Settings → AI connection, kept in this
 *      browser's localStorage and never leaving the device except as the
 *      Authorization header on a request to api.mistral.ai;
 *   2. `VITE_MISTRAL_API_KEY` from `.env.local`, baked in at build time.
 *
 * The runtime key exists because of the phone. A build-time key has to be
 * present on the machine that runs `vite build`, which for the GitHub Pages
 * deploy means shipping it inside a public JavaScript bundle — readable by
 * anyone who opens the page. The Settings key never touches the repository
 * or the bundle: it lives only in the browser that typed it.
 *
 * Never hardcode a key in source. Never commit `.env.local`.
 */

import { Mistral } from '@mistralai/mistralai'

/** localStorage slot for the key entered in Settings. */
const STORAGE_KEY = 'mx:mistral-api-key'

const ENV_KEY = import.meta.env.VITE_MISTRAL_API_KEY as string | undefined
const MODEL =
  (import.meta.env.VITE_MISTRAL_MODEL as string | undefined) ??
  'mistral-large-latest'

/** The placeholder in `.env.example` is not a key. */
function usable(k: string | null | undefined): k is string {
  const v = k?.trim()
  return Boolean(v) && v !== 'your_mistral_api_key_here'
}

/* localStorage reads are cheap but not free, and `hasMistralKey()` is called
   in render paths. Cached, invalidated by setUserApiKey. */
let _cached: string | null | undefined

function readStored(): string | null {
  if (_cached === undefined) {
    try {
      _cached = localStorage.getItem(STORAGE_KEY)
    } catch {
      /* Private mode / blocked storage — behave as if nothing was saved. */
      _cached = null
    }
  }
  return _cached
}

/** Where the key currently in use came from. Drives the Settings copy. */
export type KeySource = 'user' | 'build' | 'none'

export function apiKeySource(): KeySource {
  if (usable(readStored())) return 'user'
  if (usable(ENV_KEY)) return 'build'
  return 'none'
}

/** The active key, or undefined when there is none. */
export function getApiKey(): string | undefined {
  const own = readStored()
  if (usable(own)) return own.trim()
  if (usable(ENV_KEY)) return ENV_KEY.trim()
  return undefined
}

export function hasMistralKey(): boolean {
  return getApiKey() !== undefined
}

/** The key saved in Settings, verbatim — for the Settings field only. */
export function getUserApiKey(): string {
  return readStored() ?? ''
}

/**
 * Save (or, with an empty string, forget) the key entered in Settings.
 * Drops the memoised client so the next call picks the new key up.
 */
export function setUserApiKey(key: string): void {
  const trimmed = key.trim()
  try {
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Storage blocked: the key still works for this session via the cache
       below, it just will not survive a reload. */
  }
  _cached = trimmed || null
  _client = null
}

let _client: Mistral | null = null
let _clientKey: string | null = null

export function getMistralClient(): Mistral {
  const key = getApiKey()
  if (!key) {
    throw new Error(
      'Mistral API key missing. Add one in Settings → AI connection.',
    )
  }
  if (!_client || _clientKey !== key) {
    // In dev, route through Vite proxy at /api/mistral to dodge CORS.
    // In a packaged build, call the official endpoint directly — it sends
    // `access-control-allow-origin: *`, so the browser is allowed to.
    const serverURL = import.meta.env.DEV
      ? `${window.location.origin}/api/mistral`
      : 'https://api.mistral.ai'
    _client = new Mistral({ apiKey: key, serverURL })
    _clientKey = key
  }
  return _client
}

export function getModelName(): string {
  return MODEL
}

/**
 * One cheap round trip, so Settings can say "it works" instead of "it is
 * saved". Resolves with an error message on failure rather than throwing —
 * the caller is a form, not a session.
 */
export async function testMistralKey(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const res = await getMistralClient().chat.complete({
      model: getModelName(),
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      maxTokens: 5,
      temperature: 0,
    })
    /* The content may be a string or an array of chunks; either shape means
       the key, the model name and the network all worked. */
    if (!res.choices?.[0]?.message) {
      return { ok: false, error: 'Empty response from Mistral.' }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    /* 401 is by far the likeliest failure, and the raw SDK message for it is
       not something you want to read on a phone. */
    if (/401|unauthorized|invalid.*api.*key/i.test(msg)) {
      return { ok: false, error: 'Mistral rejected this key (401).' }
    }
    return { ok: false, error: msg }
  }
}
