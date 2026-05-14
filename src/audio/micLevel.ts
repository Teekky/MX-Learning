/**
 * Microphone level meter — independent of the SpeechRecognition API.
 *
 * `useMicLevel(active)` opens a getUserMedia stream while `active` is true,
 * runs the audio through an AnalyserNode, and exposes a normalised
 * 0..1 RMS value updated on every animation frame. The hook tears down
 * the stream + audio context when `active` flips to false or the
 * component unmounts.
 *
 * Why this matters for pronunciation:
 *   When STT silently produces nothing, the user can't tell whether the
 *   problem is "mic not heard" or "STT can't transcribe what it heard".
 *   This meter answers that question visually — if the bar moves while
 *   you speak, your mic IS being captured by the page. The bug is
 *   downstream (STT, language match, audio quality), not in the mic.
 */

import { useEffect, useRef, useState } from 'react'

export type MicLevelState = 'idle' | 'requesting' | 'live' | 'denied' | 'unsupported'

export interface UseMicLevelResult {
  /** Smoothed RMS level in [0, 1]. 0 when not active. */
  level: number
  /** What the meter is currently doing — drives the UI. */
  state: MicLevelState
}

export function useMicLevel(active: boolean): UseMicLevelResult {
  const [level, setLevel] = useState(0)
  const [state, setState] = useState<MicLevelState>('idle')

  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      cleanup()
      return
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setState('unsupported')
      return
    }

    let cancelled = false
    setState('requesting')
    setLevel(0)

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        // Some browsers fail to construct AudioContext until a user gesture
        // — but we're already inside a click handler, so this should work.
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (!Ctx) {
          setState('unsupported')
          return
        }
        const audioCtx = new Ctx()
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.6
        source.connect(analyser)

        const buffer = new Uint8Array(analyser.fftSize)
        let smoothed = 0

        const tick = () => {
          analyser.getByteTimeDomainData(buffer)
          // RMS centred at 128 (midpoint of 0..255).
          let sum = 0
          for (let i = 0; i < buffer.length; i++) {
            const v = (buffer[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / buffer.length)
          // Light smoothing on top of analyser's own — feels less jittery.
          smoothed = smoothed * 0.6 + rms * 0.4
          setLevel(Math.min(1, smoothed * 4)) // amplify for legibility
          rafRef.current = requestAnimationFrame(tick)
        }

        setState('live')
        tick()
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const name = (err as { name?: string })?.name
        setState(name === 'NotAllowedError' ? 'denied' : 'unsupported')
      })

    return () => {
      cancelled = true
      cleanup()
    }

    function cleanup() {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close()
        audioCtxRef.current = null
      }
      setLevel(0)
      setState((prev) => (prev === 'denied' ? prev : 'idle'))
    }
  }, [active])

  return { level, state }
}
