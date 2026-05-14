/**
 * Sound effects via the Web Audio API — zero network, zero assets.
 *
 * The spec asks for a "crystalline ding" for correct answers and subtle
 * vibration feedback. We synthesize the ding on the fly: a two-partial
 * chime with an exponential fade-out, which sounds clean and feels
 * rewarding without being loud.
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

/** Play a crystalline "correct" ding (≈ 0.35s). */
export function playDing(volume = 0.6): void {
  const ac = getContext()
  if (!ac) return
  if (ac.state === 'suspended') ac.resume().catch(() => undefined)

  const now = ac.currentTime

  // Two soft sine partials → bell-like sparkle.
  const freqs = [880, 1320]
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, now)
    osc.connect(gain).connect(ac.destination)

    const startAt = now + i * 0.015
    const peak = 0.0001 + volume * (i === 0 ? 0.9 : 0.55)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.35)
    osc.start(startAt)
    osc.stop(startAt + 0.4)
  })
}

/** Play a soft low "incorrect" thud (≈ 0.25s). */
export function playBuzz(volume = 0.4): void {
  const ac = getContext()
  if (!ac) return
  if (ac.state === 'suspended') ac.resume().catch(() => undefined)

  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(210, now)
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.18)
  osc.connect(gain).connect(ac.destination)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)

  osc.start(now)
  osc.stop(now + 0.3)
}

/** Soft vibration pattern (best-effort; silent where unsupported). */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // ignore
  }
}
