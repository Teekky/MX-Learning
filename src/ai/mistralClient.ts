/**
 * Mistral SDK client — isolated here so the ~500 kB `@mistralai/mistralai`
 * bundle only loads when an AI feature is actually used. Everything in this
 * module is async because the SDK arrives via a dynamic `import()`.
 *
 * Key management (does a key exist? where from?) lives in `./mistral`, which
 * carries no SDK dependency and is safe to import eagerly.
 */

import type { Mistral } from '@mistralai/mistralai'
import { getApiKey } from './mistral'

let _client: Mistral | null = null
let _clientKey: string | null = null

/**
 * The shared Mistral client for the current key. Rebuilt automatically when
 * the key changes (Settings → AI connection). Throws if no key is set — the
 * callers are sessions, and a missing key is a hard stop.
 */
export async function getMistralClient(): Promise<Mistral> {
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
    const { Mistral } = await import('@mistralai/mistralai')
    _client = new Mistral({ apiKey: key, serverURL })
    _clientKey = key
  }
  return _client
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
    const client = await getMistralClient()
    await client.models.list(undefined, { timeoutMs: PROBE_TIMEOUT_MS })
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
