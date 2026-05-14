/**
 * Pronunciation feedback — speak a target sentence, get a score.
 *
 * Per card flow:
 *   1. Pick a due card (SRS-scheduled, filtered by user's CEFR level), or
 *      grab a transient seed if the deck is sparse — same provider as the
 *      other practice modules.
 *   2. Display the target sentence (we use the first attached example).
 *   3. The user can press 🔊 to hear the TTS model as many times as they
 *      want — pronunciation requires the model voice, no penalty.
 *   4. The user presses 🎙 to record. Web Speech API transcribes live.
 *   5. On stop (manual or auto-silence), we compare the transcript to the
 *      target with `compareSentence` for a similarity score, plus
 *      `diffSentenceWords` for a word-by-word visual diff.
 *   6. The user can retry as many times as they want (only the last attempt
 *      counts) before pressing "Next sentence" — that's when FSRS is
 *      updated and XP awarded.
 *
 * UX notes for the mic:
 *   - We track THREE listening states: idle → starting (waiting for the
 *     browser to grant mic + the engine to fire onStart) → listening
 *     (engine confirmed live). This avoids the trap where we tell the
 *     user "Listening…" before the OS even routed audio to the page.
 *   - If the engine ends without producing any transcript (silence,
 *     denied permission, mic muted at OS level), we surface a friendly
 *     "We didn't catch any speech" hint instead of going silent.
 *
 * Quality mapping (similarity → SM-2 quality):
 *   ≥ 0.95 → 5    ≥ 0.85 → 4    ≥ 0.70 → 3    ≥ 0.50 → 2    else 1
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@/db/database'
import {
  getPracticeBatch,
  persistTransient,
  type PracticePair,
} from '@/db/practiceProvider'
import { scheduleNext } from '@/utils/fsrs'
import { xpForReview } from '@/utils/levels'
import { recordReview } from '@/utils/dailyLog'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { compareSentence, diffSentenceWords, type DiffToken } from '@/utils/strings'
import { useAppStore } from '@/store/useAppStore'
import { speak, stopSpeaking } from '@/audio/tts'
import { isSTTSupported, startRecognition, type STTHandle } from '@/audio/stt'
import { useMicLevel } from '@/audio/micLevel'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import type { Quality, Review } from '@/types'

const MAX_CARDS_PER_SESSION = 8

type MicState = 'idle' | 'starting' | 'listening'

type Attempt = {
  transcript: string
  similarity: number
  quality: Quality
  diff: DiffToken[]
  responseTimeMs: number
}

type State =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'no-stt' }
  | {
      kind: 'running'
      pairs: PracticePair[]
      current: number
      correct: number
      xp: number
      mic: MicState
      live: string
      /** Last finalised attempt for the current card; null until they speak. */
      attempt: Attempt | null
      /** Wall-clock when this card mounted — used for response time. */
      cardStartedAt: number
      permissionDenied: boolean
      /** Surface a friendly message when the engine ends with no transcript. */
      lastNoSpeech: boolean
      /** Unknown STT error codes (network, audio-capture, service-not-allowed…). */
      lastErrorCode: string | null
    }
  | { kind: 'done'; total: number; correct: number; xp: number; seconds: number }

export function PronunciationSession() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>(() =>
    isSTTSupported() ? { kind: 'loading' } : { kind: 'no-stt' },
  )
  const [startedAt] = useState(Date.now())

  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)
  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)

  const recRef = useRef<STTHandle | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  /* Live mic level — independent of STT. Active whenever the user has
     pressed Record (state.mic === 'starting' | 'listening'). The bar
     answers "is my voice reaching the page at all?" visually. */
  const micActive =
    state.kind === 'running' && state.mic !== 'idle'
  const { level: micLevel, state: micMeterState } = useMicLevel(micActive)

  /* -------------------------- Initial load -------------------------- */
  useEffect(() => {
    if (stateRef.current.kind !== 'loading') return
    const levels = stats?.cefrLevel
      ? allowedLevelsFor(stats.cefrLevel)
      : undefined
    getPracticeBatch(MAX_CARDS_PER_SESSION, levels).then((pairs) => {
      const usable = pairs.filter(
        (p) => (p.word.examples?.[0]?.en ?? '').trim().length > 0,
      )
      if (usable.length === 0) {
        setState({ kind: 'empty' })
      } else {
        setState({
          kind: 'running',
          pairs: usable,
          current: 0,
          correct: 0,
          xp: 0,
          mic: 'idle',
          live: '',
          attempt: null,
          cardStartedAt: Date.now(),
          permissionDenied: false,
          lastNoSpeech: false,
          lastErrorCode: null,
        })
      }
    })
  }, [stats?.cefrLevel])

  /* -------------------------- Cleanup on unmount -------------------------- */
  useEffect(() => {
    return () => {
      recRef.current?.abort()
      recRef.current = null
      stopSpeaking()
    }
  }, [])

  /* -------------------------- Mic controls -------------------------- */

  const startListening = useCallback(() => {
    const s = stateRef.current
    if (s.kind !== 'running' || s.mic !== 'idle') return

    stopSpeaking() // don't record the model voice we just played
    setState({
      ...s,
      mic: 'starting',
      live: '',
      attempt: null,
      permissionDenied: false,
      lastNoSpeech: false,
      lastErrorCode: null,
    })

    const handle = startRecognition(
      {
        onStart: () =>
          setState((prev) =>
            prev.kind === 'running' ? { ...prev, mic: 'listening' } : prev,
          ),
        onInterim: (t) =>
          setState((prev) =>
            prev.kind === 'running' ? { ...prev, live: t, lastNoSpeech: false } : prev,
          ),
        onFinal: (t) =>
          setState((prev) =>
            prev.kind === 'running' ? { ...prev, live: t.trim() } : prev,
          ),
        onError: (error) => {
          setState((prev) =>
            prev.kind === 'running'
              ? {
                  ...prev,
                  mic: 'idle',
                  permissionDenied: error === 'not-allowed',
                  lastNoSpeech: error === 'no-speech',
                  // 'aborted' = user pressed Stop; not really an error.
                  lastErrorCode:
                    error && !['not-allowed', 'no-speech', 'aborted'].includes(error)
                      ? error
                      : null,
                }
              : prev,
          )
        },
        onEnd: () => {
          // Score whatever we captured. The latest `live` value is the best
          // transcript — onInterim writes interim text, onFinal overwrites
          // with finalised text if the engine produced one.
          setState((prev) => {
            if (prev.kind !== 'running') return prev
            const transcript = prev.live.trim()
            const target = currentSentence(prev)
            if (!transcript || !target) {
              // Engine ended without producing any transcript and no error
              // fired (otherwise lastErrorCode would already be set). The
              // most common cause: SR couldn't reach its server. Hint at it.
              return {
                ...prev,
                mic: 'idle',
                lastNoSpeech: true,
              }
            }
            const cmp = compareSentence(transcript, target)
            const quality = qualityFromSimilarity(cmp.similarity)
            const attempt: Attempt = {
              transcript,
              similarity: cmp.similarity,
              quality,
              diff: diffSentenceWords(target, transcript),
              responseTimeMs: Date.now() - prev.cardStartedAt,
            }
            if (settings?.soundEnabled) {
              if (quality >= 4) playDing()
              else if (quality <= 2) playBuzz()
            }
            if (settings?.vibrationsEnabled && quality <= 2) vibrate(40)
            return { ...prev, mic: 'idle', attempt, lastNoSpeech: false }
          })
        },
      },
      // continuous=true matches the AudioChat / Interview modules and was
      // the original setup that worked well. The user keeps the mic open
      // until they tap "Stop & score" — the engine doesn't auto-cut on
      // pauses, which avoids losing the end of longer sentences.
      { lang: 'en-US', continuous: true },
    )

    if (!handle) {
      setState((prev) =>
        prev.kind === 'running' ? { ...prev, mic: 'idle' } : prev,
      )
      return
    }
    recRef.current = handle
  }, [settings?.soundEnabled, settings?.vibrationsEnabled])

  const stopListening = useCallback(() => {
    recRef.current?.stop()
    recRef.current = null
  }, [])

  /* -------------------------- Hear the target -------------------------- */
  const playTarget = useCallback(() => {
    const s = stateRef.current
    if (s.kind !== 'running') return
    const target = currentSentence(s)
    if (!target) return
    void speak(target, {
      voiceURI: settings?.voiceURI,
      rate: settings?.voiceRate ?? 1,
      pitch: settings?.voicePitch ?? 1,
    })
  }, [settings?.voiceURI, settings?.voiceRate, settings?.voicePitch])

  /* -------------------------- Commit + advance -------------------------- */
  async function commitAndAdvance() {
    const s = stateRef.current
    if (s.kind !== 'running' || !s.attempt) return

    const pair = s.pairs[s.current]
    const live = pair.transient ? await persistTransient(pair) : pair
    const cardId = live.card.id
    const wordId = live.word.id
    if (cardId == null || wordId == null) return

    const { quality, similarity, transcript, responseTimeMs } = s.attempt
    const wasCorrect = quality >= 4

    const updatedCard = scheduleNext(live.card, quality)
    await db.cards.put(updatedCard)

    const review: Review = {
      cardId,
      wordId,
      timestamp: Date.now(),
      quality,
      responseTimeMs,
      exerciseType: 'pronunciation',
      wasCorrect,
      userInput: transcript,
    }
    await db.reviews.add(review)

    if (wasCorrect) registerCorrect()
    else registerWrong()

    const xpGained = Math.round(
      xpForReview(quality, live.card.difficultyScore) *
        Math.max(0, Math.min(1, similarity)),
    )
    await addXp(xpGained)
    incrementReviews()

    if (stats) {
      const dailyLog = await recordReview({
        xp: xpGained,
        wasCorrect,
        timeSpentSeconds: Math.round(responseTimeMs / 1000),
        dailyGoalXp: stats.dailyGoalXp,
      })
      await notifyDailyLog(dailyLog)
    }

    const nextIndex = s.current + 1
    if (nextIndex >= s.pairs.length) {
      setState({
        kind: 'done',
        total: s.pairs.length,
        correct: s.correct + (wasCorrect ? 1 : 0),
        xp: s.xp + xpGained,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      })
    } else {
      setState({
        ...s,
        current: nextIndex,
        correct: s.correct + (wasCorrect ? 1 : 0),
        xp: s.xp + xpGained,
        attempt: null,
        live: '',
        cardStartedAt: Date.now(),
        lastNoSpeech: false,
        lastErrorCode: null,
      })
    }
  }

  function retry() {
    setState((prev) =>
      prev.kind === 'running'
        ? {
            ...prev,
            attempt: null,
            live: '',
            cardStartedAt: Date.now(),
            lastNoSpeech: false,
            lastErrorCode: null,
          }
        : prev,
    )
  }

  /* ============================== Render ============================== */

  if (state.kind === 'loading') {
    return <div className="text-center text-text-muted">Loading sentences…</div>
  }

  if (state.kind === 'no-stt') {
    return (
      <Notice
        title="Speech recognition not available."
        body="Use Microsoft Edge, Google Chrome, or Brave to practice pronunciation. Firefox doesn't support the Web Speech API."
      />
    )
  }

  if (state.kind === 'empty') {
    return (
      <Notice
        title="No sentence available."
        body="Add a few words to your deck (Learn from anything works great), then come back."
      />
    )
  }

  if (state.kind === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl space-y-6 text-center"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-2xl shadow-accent/40">
          <span className="font-display text-4xl">◐</span>
        </div>
        <h1 className="font-display text-3xl font-semibold">Nice speaking.</h1>
        <div className="card grid grid-cols-3 gap-6">
          <SummaryStat
            label="Cleared"
            value={`${state.correct} / ${state.total}`}
          />
          <SummaryStat label="XP earned" value={`+${state.xp}`} />
          <SummaryStat
            label="Time"
            value={
              state.seconds >= 60
                ? `${Math.round(state.seconds / 60)} min`
                : `${state.seconds}s`
            }
          />
        </div>
        <div className="flex justify-center gap-3">
          <Link to="/practice" className="btn-ghost">
            Back to menu
          </Link>
          <button onClick={() => navigate(0)} className="btn-primary">
            Another round
          </button>
        </div>
      </motion.div>
    )
  }

  /* ---------------------------- Running view ---------------------------- */
  const pair = state.pairs[state.current]
  const target = currentSentence(state)
  const progress = ((state.current + 1) / state.pairs.length) * 100
  const isMicBusy = state.mic !== 'idle'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress + meta */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
          <span>
            Card {state.current + 1} / {state.pairs.length}
          </span>
          <span>+{state.xp} XP</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      {/* Target sentence card */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-xs uppercase tracking-wider text-text-subtle">
            Read this aloud
          </div>
          <div className="flex flex-wrap items-baseline gap-2 text-xs text-text-subtle">
            <span className="font-display text-sm font-semibold text-accent">
              {pair.word.lemma}
            </span>
            <span>· {pair.word.level}</span>
            <span>· {pair.word.partOfSpeech}</span>
          </div>
        </div>
        <p className="font-display text-2xl leading-snug text-text">
          “{target}”
        </p>
        {pair.word.examples?.[0]?.fr && (
          <p className="text-sm text-text-muted">
            {pair.word.examples[0].fr}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={playTarget}
            className="btn-ghost text-sm"
            disabled={isMicBusy}
            aria-label="Hear the model pronunciation"
          >
            🔊 Hear it
          </button>
          {state.mic === 'idle' ? (
            <button
              type="button"
              onClick={startListening}
              className="btn-primary"
              aria-label="Record your attempt"
            >
              🎙 {state.attempt ? 'Try again' : 'Record attempt'}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="inline-flex items-center gap-2 rounded-xl bg-danger px-5 py-2.5 font-medium text-white shadow-lg shadow-danger/40 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <span className="relative inline-flex h-2 w-2">
                <span
                  className={
                    'absolute inset-0 rounded-full bg-white/70 ' +
                    (state.mic === 'listening' ? 'animate-ping' : '')
                  }
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {state.mic === 'starting' ? 'Starting mic…' : 'Stop & score'}
            </button>
          )}
        </div>
        {state.permissionDenied && (
          <p className="text-xs text-warning">
            Microphone access denied. Open this site's permissions in your
            browser, allow the microphone, and reload.
          </p>
        )}
      </section>

      {/* Live transcript while recording */}
      {isMicBusy && (
        <motion.section
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={
            'card space-y-3 ' +
            (state.mic === 'listening'
              ? 'border-accent/40'
              : 'border-border')
          }
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
            <span>
              {state.mic === 'starting'
                ? 'Waiting for the microphone…'
                : 'Listening — speak the sentence now'}
            </span>
            {state.mic === 'listening' && (
              <span className="flex items-center gap-1 text-accent">
                <PulseDot />
                Live
              </span>
            )}
          </div>
          <MicLevelBar level={micLevel} state={micMeterState} />
          <p
            className={
              'font-display text-base ' +
              (state.live ? 'text-text' : 'italic text-text-subtle')
            }
          >
            {state.live ||
              (state.mic === 'starting'
                ? 'Granting mic access…'
                : 'I’m listening — read the sentence above out loud.')}
          </p>
        </motion.section>
      )}

      {/* Specific STT error (network, audio-capture, etc.) */}
      {!isMicBusy && state.lastErrorCode && !state.attempt && (
        <motion.section
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-warning/40"
        >
          <div className="text-xs uppercase tracking-wider text-warning">
            Speech recognition error · {state.lastErrorCode}
          </div>
          <p className="mt-2 text-sm text-text-muted">
            {explainSttError(state.lastErrorCode)}
          </p>
          <p className="mt-2 text-xs text-text-subtle">
            Open DevTools (F12) and check the console for <code className="rounded bg-bg-subtle px-1">[stt]</code> logs to debug further.
          </p>
        </motion.section>
      )}

      {/* No-speech hint after a silent attempt */}
      {!isMicBusy && state.lastNoSpeech && !state.lastErrorCode && !state.attempt && (
        <motion.section
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-warning/40"
        >
          <div className="text-xs uppercase tracking-wider text-warning">
            Hmm, no speech recognised
          </div>
          <p className="mt-2 text-sm text-text-muted">
            The mic captured audio (the meter moved) but the engine produced
            no transcript. Common causes:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-muted">
            <li>
              <strong className="text-text">Network blocked</strong> — Web
              Speech API in Chrome/Edge sends audio to Google/Microsoft
              servers. A VPN, proxy, or Brave Shields can block this.
            </li>
            <li>
              <strong className="text-text">Accent not recognised</strong> —
              speak slightly slower and over-articulate.
            </li>
            <li>
              Open DevTools (F12) →
              <code className="mx-1 rounded bg-bg-subtle px-1">[stt]</code>
              logs show exactly which events fired.
            </li>
          </ul>
        </motion.section>
      )}

      {/* Score + diff once attempt is finalised */}
      <AnimatePresence>
        {state.attempt && state.mic === 'idle' && (
          <motion.section
            key="score"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card space-y-4"
          >
            <ScoreHeader attempt={state.attempt} />
            <div>
              <div className="mb-2 text-xs uppercase tracking-wider text-text-subtle">
                Your attempt
              </div>
              <DiffView tokens={state.attempt.diff} />
            </div>
            <p className="text-xs text-text-subtle">
              Retry as many times as you want. Pressing
              <strong className="text-text"> Next sentence </strong>
              locks in the current attempt and updates your SRS card.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={retry} className="btn-ghost text-sm">
                ↻ Try again
              </button>
              <button onClick={() => void commitAndAdvance()} className="btn-primary text-sm">
                {state.current + 1 >= state.pairs.length
                  ? 'Finish session →'
                  : 'Next sentence →'}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================== helpers ============================== */

function currentSentence(s: Extract<State, { kind: 'running' }>): string {
  const pair = s.pairs[s.current]
  return (pair.word.examples?.[0]?.en ?? '').trim()
}

function explainSttError(code: string): string {
  switch (code) {
    case 'network':
      return 'The speech engine could not reach its server. Check your network — disable VPN/proxy/Brave Shields if active.'
    case 'audio-capture':
      return "Your microphone couldn't be accessed. Make sure no other app is using it and try again."
    case 'service-not-allowed':
      return 'Speech recognition is blocked by the browser or an extension. Try a fresh window or a different browser.'
    case 'language-not-supported':
      return 'The selected language is not supported by this browser. Try Chrome or Edge.'
    case 'bad-grammar':
      return 'The internal grammar config is invalid (rare). Reload the page and try again.'
    default:
      return `Unhandled error code: "${code}". Try a different browser if this persists.`
  }
}

function qualityFromSimilarity(sim: number): Quality {
  if (sim >= 0.95) return 5
  if (sim >= 0.85) return 4
  if (sim >= 0.7) return 3
  if (sim >= 0.5) return 2
  return 1
}

function MicLevelBar({
  level,
  state,
}: {
  level: number
  state: 'idle' | 'requesting' | 'live' | 'denied' | 'unsupported'
}) {
  // Light buckets so the bar reads as discrete activity, not pure noise.
  const pct = Math.min(100, Math.max(0, level * 100))
  const helper =
    state === 'requesting'
      ? 'Asking the browser for mic access…'
      : state === 'denied'
        ? 'Mic blocked — allow it in browser settings.'
        : state === 'unsupported'
          ? 'No audio meter available in this browser.'
          : pct < 4
            ? 'No audio detected — speak closer or check the input.'
            : pct < 18
              ? 'Faint signal — try speaking up.'
              : 'Mic is hearing you 👍'
  return (
    <div className="space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
        <motion.div
          className={
            'h-full rounded-full ' +
            (state === 'live' && pct >= 4 ? 'bg-accent' : 'bg-border')
          }
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.08, ease: 'linear' }}
        />
      </div>
      <p
        className={
          'text-[11px] ' +
          (state === 'denied'
            ? 'text-warning'
            : state === 'live' && pct >= 4
              ? 'text-text-subtle'
              : 'text-text-muted')
        }
      >
        {helper}
      </p>
    </div>
  )
}

function PulseDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
    </span>
  )
}

function ScoreHeader({ attempt }: { attempt: Attempt }) {
  const pct = Math.round(attempt.similarity * 100)
  const tone =
    attempt.quality >= 4
      ? 'text-success'
      : attempt.quality === 3
        ? 'text-accent'
        : 'text-warning'
  const verdict =
    attempt.quality === 5
      ? 'Native-level'
      : attempt.quality === 4
        ? 'Solid'
        : attempt.quality === 3
          ? 'Almost there'
          : attempt.quality === 2
            ? 'Half-way — try again'
            : 'Way off — listen and retry'
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-wider text-text-subtle">
          Match
        </div>
        <div className={`font-display text-3xl font-semibold ${tone}`}>
          {pct}%
        </div>
      </div>
      <div className={`font-display text-base font-semibold ${tone}`}>
        {verdict}
      </div>
    </div>
  )
}

function DiffView({ tokens }: { tokens: DiffToken[] }) {
  if (tokens.length === 0) {
    return (
      <p className="text-sm italic text-text-subtle">
        We didn't catch any speech — try again.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5 leading-relaxed">
      {tokens.map((t, i) => (
        <DiffChip key={i} token={t} />
      ))}
    </div>
  )
}

function DiffChip({ token }: { token: DiffToken }) {
  const styles: Record<DiffToken['status'], string> = {
    ok: 'bg-success/10 text-success border-success/30',
    wrong: 'bg-warning/10 text-warning border-warning/30',
    missing: 'bg-danger/10 text-danger border-danger/30 line-through opacity-80',
    extra: 'bg-bg-subtle text-text-subtle border-border italic',
  }
  const titles: Record<DiffToken['status'], string> = {
    ok: 'Matches the target word',
    wrong: 'Different from the target word',
    missing: 'You skipped this word',
    extra: 'Extra word, not in the target',
  }
  return (
    <span
      title={titles[token.status]}
      className={
        'rounded-md border px-2 py-0.5 font-display text-sm ' + styles[token.status]
      }
    >
      {token.text}
    </span>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold text-text">
        {value}
      </div>
    </div>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="mb-2 font-display text-2xl font-semibold">{title}</h1>
      <p className="mb-6 text-text-muted">{body}</p>
      <Link to="/practice" className="btn-ghost inline-flex">
        ← Back to practice menu
      </Link>
    </div>
  )
}
