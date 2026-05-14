/**
 * Speech-to-Text wrapper around the Web Speech API.
 *
 * Free & on-device on Chromium browsers (Edge on Windows ships excellent
 * en-US recognition). Firefox has no native support — we detect and bail.
 *
 * Two modes:
 *   - single shot: starts, emits final transcript on end.
 *   - continuous : emits interim + final as the user speaks; caller stops it.
 */

// The standard name is SpeechRecognition; Chromium exposes webkitSpeechRecognition.
// TypeScript doesn't ship lib.dom types for it, so we declare what we use.
interface SR extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((ev: SREvent) => void) | null
  onend: (() => void) | null
  onerror: ((ev: SRErrorEvent) => void) | null
  onstart: (() => void) | null
}

interface SREvent {
  resultIndex: number
  results: ArrayLike<SRResultList>
}

interface SRResultList {
  length: number
  isFinal: boolean
  [index: number]: { transcript: string; confidence: number }
}

interface SRErrorEvent {
  error: string
  message?: string
}

interface SRConstructor {
  new (): SR
}

function getCtor(): SRConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor
    webkitSpeechRecognition?: SRConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSTTSupported(): boolean {
  return getCtor() !== null
}

export interface STTHandle {
  stop(): void
  abort(): void
}

export interface STTCallbacks {
  /** Called with the interim (non-final) transcript as the user speaks. */
  onInterim?: (text: string) => void
  /** Called with the final transcript when the utterance ends. */
  onFinal?: (text: string) => void
  /** Called whenever recognition ends for any reason. */
  onEnd?: () => void
  /** Called on error. `error` is a string like 'no-speech', 'not-allowed'. */
  onError?: (error: string) => void
  /** Called as soon as the mic is actually live. */
  onStart?: () => void
}

export interface STTOptions {
  /** BCP-47 language tag. Default 'en-US'. */
  lang?: string
  /** Keep mic open until stop() is called. Default true. */
  continuous?: boolean
}

/**
 * Start recognition. Returns a handle with stop()/abort(), or null if STT
 * isn't supported on this browser.
 */
export function startRecognition(
  cbs: STTCallbacks,
  opts: STTOptions = {},
): STTHandle | null {
  const Ctor = getCtor()
  if (!Ctor) return null

  const rec = new Ctor()
  rec.lang = opts.lang ?? 'en-US'
  rec.continuous = opts.continuous ?? true
  rec.interimResults = true
  rec.maxAlternatives = 1

  let finalText = ''
  let resultCount = 0

  // Visible logs in DevTools — invaluable when STT silently fails because
  // of a network block or unrecognised accent. The user can open the
  // console and see exactly which events fired and which didn't.
  const dbg = (msg: string, ...rest: unknown[]) =>
    // eslint-disable-next-line no-console
    console.log(`[stt] ${msg}`, ...rest)

  rec.onstart = () => {
    dbg('onstart — mic is live, listening for audio')
    cbs.onStart?.()
  }
  rec.onresult = (ev) => {
    let interim = ''
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const result = ev.results[i]
      const alt = result[0]
      const chunk = alt.transcript.trim()
      if (!chunk) continue
      if (result.isFinal) {
        finalText = finalText ? `${finalText} ${chunk}` : chunk
      } else {
        interim = interim ? `${interim} ${chunk}` : chunk
      }
    }
    const live = interim
      ? finalText
        ? `${finalText} ${interim}`
        : interim
      : finalText
    if (live) {
      resultCount++
      dbg('onresult', { final: !!finalText, text: live.slice(0, 80) })
      cbs.onInterim?.(live)
    }
  }
  rec.onerror = (ev) => {
    // eslint-disable-next-line no-console
    console.warn(`[stt] onerror — ${ev.error}`, ev.message ?? '')
    cbs.onError?.(ev.error)
  }
  rec.onend = () => {
    const trimmed = finalText.trim()
    dbg(
      `onend — ${resultCount} result event${resultCount === 1 ? '' : 's'} fired, finalText="${trimmed.slice(0, 80)}"`,
    )
    if (trimmed) cbs.onFinal?.(trimmed)
    cbs.onEnd?.()
  }

  try {
    rec.start()
  } catch (err) {
    cbs.onError?.((err as Error).message ?? 'start-failed')
    return null
  }

  return {
    stop: () => {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    },
    abort: () => {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    },
  }
}
