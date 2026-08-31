/**
 * Mistral API key management — the *only* part of the AI layer that is safe
 * to pull into an eager bundle. It carries no dependency on the Mistral SDK
 * (~500 kB), so screens that merely need to know "is a key configured?"
 * (the dashboard, every practice tile) stay cheap. The SDK client itself
 * lives in `./mistralClient`, behind a dynamic import.
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
 *
 * The SDK client in `./mistralClient` re-reads `getApiKey()` on every call
 * and rebuilds itself when the key changes, so there is nothing to
 * invalidate here beyond the local cache.
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
}

export function getModelName(): string {
  return MODEL
}
