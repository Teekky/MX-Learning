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
 * Result of probing a key. The two failure modes are not the same thing and
 * must not be treated the same: a key Mistral *refuses* is worse than none,
 * because every AI mode would then fail one request at a time. A key we could
 * not *reach* Mistral to check says nothing about the key — the phone was on
 * a dead Wi-Fi, in a tunnel, or behind a filtering DNS — and throwing it away
 * would leave you unable to save a perfectly good key from a train.
 */
export type KeyCheck =
  | { ok: true }
  | { ok: false; kind: 'rejected' | 'unreachable'; error: string }

/* The SDK defaults to 30s per request, which is a long time to stare at a
   spinner on a phone to learn that the network is down. */
const PROBE_TIMEOUT_MS = 12_000

/**
 * One cheap round trip, so Settings can say "it works" instead of "it is
 * saved". Resolves with a reason on failure rather than throwing — the caller
 * is a form, not a session.
 *
 * `GET /v1/models` rather than a completion: it is a small, fast call that
 * checks nothing but the key. A completion also has to find the model, which
 * makes "your key is fine but your tier cannot reach mistral-large" look
 * exactly like "your key is bad".
 */
export async function testMistralKey(): Promise<KeyCheck> {
  try {
    await getMistralClient().models.list(undefined, {
      timeoutMs: PROBE_TIMEOUT_MS,
    })
    return { ok: true }
  } catch (e) {
    /* Every SDK error raised from an HTTP *response* carries a statusCode —
       so its presence is the proof that we reached Mistral at all. Without
       one, the request never completed: timeout, DNS, offline. */
    const status = (e as { statusCode?: unknown } | null)?.statusCode
    if (typeof status === 'number') {
      if (status === 401 || status === 403) {
        return {
          ok: false,
          kind: 'rejected',
          error: `Mistral rejected this key (${status}).`,
        }
      }
      return {
        ok: false,
        kind: 'unreachable',
        error: `Mistral answered with HTTP ${status}.`,
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      kind: 'unreachable',
      error: /timed out/i.test(msg)
        ? 'Could not reach Mistral in time — check the connection and try again.'
        : `Could not reach Mistral: ${msg}`,
    }
  }
}
