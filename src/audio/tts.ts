/**
 * Text-to-Speech wrapper around the Web Speech API.
 *
 * Free, native to all modern browsers (Edge on Windows ships great
 * Microsoft Neural voices that sound near-human). No network calls.
 */

let cachedVoices: SpeechSynthesisVoice[] = []

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      cachedVoices = voices
      resolve(voices)
      return
    }
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        cachedVoices = window.speechSynthesis.getVoices()
        resolve(cachedVoices)
      },
      { once: true },
    )
  })
}

export async function listEnglishVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = cachedVoices.length ? cachedVoices : await loadVoices()
  return voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
}

/**
 * Pick the best default English voice.
 * Priority: Microsoft neural en-US > Google en-US > any en-* > first voice.
 */
export async function pickDefaultVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await listEnglishVoices()
  if (voices.length === 0) return null

  const neural = voices.find(
    (v) => /microsoft/i.test(v.name) && /neural|natural/i.test(v.name),
  )
  if (neural) return neural

  const google = voices.find((v) => /google/i.test(v.name) && v.lang === 'en-US')
  if (google) return google

  const enUS = voices.find((v) => v.lang === 'en-US')
  if (enUS) return enUS

  return voices[0]
}

/**
 * Pick an Australian-accented voice, if this browser/OS ships one.
 *
 * Coverage varies a lot: Edge on Windows usually has a Microsoft neural
 * `en-AU` voice, some Chrome/OS combinations expose a Google `en-AU`
 * voice, and Brave typically exposes only a couple of generic voices with
 * no locale to filter on at all. Returning null (rather than throwing) is
 * the expected outcome on any of those — callers fall back to the normal
 * default voice.
 */
export async function pickAustralianVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await listEnglishVoices()
  if (voices.length === 0) return null

  const neuralAu = voices.find(
    (v) => v.lang.toLowerCase() === 'en-au' && /microsoft/i.test(v.name) && /neural|natural/i.test(v.name),
  )
  if (neuralAu) return neuralAu

  const googleAu = voices.find((v) => v.lang.toLowerCase() === 'en-au' && /google/i.test(v.name))
  if (googleAu) return googleAu

  const anyAu = voices.find((v) => v.lang.toLowerCase() === 'en-au')
  if (anyAu) return anyAu

  // A handful of engines only mark the accent in the voice name, not the locale.
  const namedAu = voices.find((v) => /australia/i.test(v.name))
  if (namedAu) return namedAu

  return null
}

export interface SpeakOptions {
  voiceURI?: string
  /** Prefer an Australian-accented voice when one is available (falls back silently). */
  preferAustralian?: boolean
  rate?: number // 0.1..10, default 1
  pitch?: number // 0..2, default 1
  volume?: number // 0..1, default 1
}

/** Speak a string. Cancels any in-flight utterance first. */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!text.trim()) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()

  const utter = new SpeechSynthesisUtterance(text)
  const voices = cachedVoices.length ? cachedVoices : await loadVoices()

  let chosen: SpeechSynthesisVoice | null = null
  if (opts.preferAustralian) chosen = await pickAustralianVoice()
  if (!chosen && opts.voiceURI) {
    chosen = voices.find((v) => v.voiceURI === opts.voiceURI) ?? null
  }
  if (!chosen) chosen = await pickDefaultVoice()
  if (chosen) utter.voice = chosen

  utter.rate = opts.rate ?? 1
  utter.pitch = opts.pitch ?? 1
  utter.volume = opts.volume ?? 1
  utter.lang = chosen?.lang ?? 'en-US'

  return new Promise<void>((resolve) => {
    utter.onend = () => resolve()
    utter.onerror = () => resolve()
    window.speechSynthesis.speak(utter)
  })
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}
