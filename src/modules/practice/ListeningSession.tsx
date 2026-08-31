/**
 * Listening dictation — audio-first practice: hear a sentence, type it back.
 *
 * Flow per card:
 *   1. Pick a due card (SRS-scheduled, filtered by user's CEFR level).
 *   2. Mistral generates ONE natural sentence using the target word,
 *      calibrated to the learner's level (short at A1, richer at C1).
 *   3. TTS plays the sentence — the UI does NOT show the text.
 *   4. User types what they heard. Two replays are allowed (full-XP);
 *      each extra replay costs a small XP penalty. "Show me" reveals
 *      the sentence for 50% XP.
 *   5. Answer is compared with character-level Levenshtein tolerance
 *      (see utils/strings.ts → compareSentence). Quality maps to SM-2.
 *   6. Reveal sentence + translation + mistakes highlighted.
 *
 * Why full-sentence dictation (not word-only):
 *   The skill we train is LISTENING — following real speech, not just
 *   matching a single token. This is the core C1/C2 gap for a French
 *   learner targeting Airbnb SF. At lower levels Mistral's sentence
 *   length calibration keeps it fair.
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
import { useAppStore } from '@/store/useAppStore'
import { compareSentence } from '@/utils/strings'
import { generateContextSentence } from '@/ai/wordInContext'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { hasMistralKey } from '@/ai/mistral'
import { speak, stopSpeaking } from '@/audio/tts'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import { EmptyDeckNotice } from './EmptyDeckNotice'
import type { Quality, Review } from '@/types'
import { Key, KeyHint } from '@/components/ui'
import { SessionComplete } from './SessionComplete'
import { noAutofill } from '@/utils/noAutofill'

const MAX_CARDS_PER_SESSION = 8
/** How many free replays before XP penalty kicks in. */
const FREE_REPLAYS = 2
/** XP multiplier after you've exceeded free replays. */
const PENALTY_MULT_EXTRA_REPLAY = 0.85
/** XP multiplier if the user reveals the sentence before submitting. */
const PENALTY_MULT_REVEAL = 0.5

type Generated = {
  sentence: string
  translationFr?: string
  aiGenerated: boolean
}

type Submitted = {
  wasCorrect: boolean
  quality: Quality
  similarity: number
  responseTimeMs: number
  userInput: string
  xpMultiplier: number
}

type State =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'no-key' }
  | {
      kind: 'running'
      pairs: PracticePair[]
      current: number
      correct: number
      xp: number
      gen: Generated | null
      submitted: Submitted | null
      playCount: number
      revealed: boolean
      genError: string
    }
  | {
      kind: 'done'
      total: number
      correct: number
      xp: number
      seconds: number
    }

export function ListeningSession() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [value, setValue] = useState('')
  const [startedAt] = useState(Date.now())
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)
  const startedCardAt = useRef(Date.now())
  const stateRef = useRef(state)
  stateRef.current = state

  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)
  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)

  /* ----------------------------- Bootstrap ---------------------------- */
  useEffect(() => {
    if (!hasMistralKey()) {
      setState({ kind: 'no-key' })
      return
    }
    const levels = stats?.cefrLevel
      ? allowedLevelsFor(stats.cefrLevel)
      : undefined
    // The provider mixes due cards with transient seed entries — the
    // user can drill from launch with no friction, and only words they
    // actually review get written to the deck (see practiceProvider).
    getPracticeBatch(MAX_CARDS_PER_SESSION, levels).then((pairs) => {
      if (pairs.length === 0) setState({ kind: 'empty' })
      else
        setState({
          kind: 'running',
          pairs,
          current: 0,
          correct: 0,
          xp: 0,
          gen: null,
          submitted: null,
          playCount: 0,
          revealed: false,
          genError: '',
        })
    })
  }, [stats?.cefrLevel])

  /* ------- Generate sentence (user presses ▶ to play) ----------------- */
  /**
   * NOTE — no autoplay on purpose.
   *
   * We used to auto-play right after the sentence came back from Mistral,
   * then bump `playCount` to 1. That raced with React's re-render on
   * `setState({...prev, gen})`: the effect cleanup fires before the async
   * `speak()` resolves, cleanup calls `stopSpeaking()`, the utterance gets
   * cancelled — but `playCount` was still being set to 1. The user saw
   * the counter say "Plays: 1" with nothing ever heard.
   *
   * Simpler fix than guarding the race: don't autoplay. The big ▶ button
   * is the obvious first action, and `playCount` now reflects reality —
   * it starts at 0 and only clicking ▶ increments it.
   */
  useEffect(() => {
    const s = stateRef.current
    if (s.kind !== 'running') return
    if (s.gen) return
    const pair = s.pairs[s.current]
    let cancelled = false

    const run = async () => {
      try {
        const ctx = await generateContextSentence(pair.word, {
          level: stats?.cefrLevel,
        })
        if (cancelled) return
        const gen: Generated = {
          sentence: ctx.sentence,
          translationFr: ctx.translationFr,
          aiGenerated: true,
        }
        setState((prev) =>
          prev.kind === 'running' && prev.current === s.current
            ? { ...prev, gen, genError: '' }
            : prev,
        )
      } catch (err) {
        if (cancelled) return
        // Fallback: use a seeded example from the word itself.
        const ex = pair.word.examples[0]
        const sentence = ex?.en ?? pair.word.lemma
        const gen: Generated = {
          sentence,
          translationFr: ex?.fr,
          aiGenerated: false,
        }
        setState((prev) =>
          prev.kind === 'running' && prev.current === s.current
            ? { ...prev, gen, genError: errMessage(err) }
            : prev,
        )
      }
    }
    run()
    return () => {
      cancelled = true
      stopSpeaking()
    }
    // We intentionally depend on state (not just current) so a new card
    // also triggers generation.
  }, [state])

  /* ------------------ Reset timers when card advances ----------------- */
  useEffect(() => {
    if (state.kind === 'running' && state.gen && !state.submitted) {
      startedCardAt.current = Date.now()
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    if (state.kind === 'running' && state.submitted) {
      setTimeout(() => nextBtnRef.current?.focus(), 0)
    }
  }, [state])

  /* ------------------------- Stop TTS on exit ------------------------- */
  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  function replay(slow = false) {
    const s = stateRef.current
    if (s.kind !== 'running' || !s.gen) return
    stopSpeaking()
    void speak(s.gen.sentence, {
      voiceURI: settings?.voiceURI,
      rate: slow ? 0.7 : settings?.voiceRate ?? 1,
      pitch: settings?.voicePitch ?? 1,
    })
    setState((prev) =>
      prev.kind === 'running'
        ? { ...prev, playCount: prev.playCount + 1 }
        : prev,
    )
  }

  function revealSentence() {
    setState((prev) =>
      prev.kind === 'running' ? { ...prev, revealed: true } : prev,
    )
  }

  /* ----------------------------- Submit ------------------------------- */
  const submit = useCallback(() => {
    const s = stateRef.current
    if (s.kind !== 'running' || !s.gen || s.submitted) return
    const responseTimeMs = Date.now() - startedCardAt.current

    const { isCorrect, isTypo, similarity } = compareSentence(
      value,
      s.gen.sentence,
    )

    // Quality mapping: treat listening more leniently on speed than typing.
    let quality: Quality
    if (isCorrect) {
      quality = similarity >= 0.99 ? 5 : 4
    } else if (isTypo) {
      quality = 2
    } else {
      quality = 1
    }

    // XP multiplier: reveal >> extra replays.
    let xpMultiplier = 1
    if (s.revealed) xpMultiplier *= PENALTY_MULT_REVEAL
    const extraReplays = Math.max(0, s.playCount - FREE_REPLAYS)
    for (let i = 0; i < extraReplays; i++) {
      xpMultiplier *= PENALTY_MULT_EXTRA_REPLAY
    }
    xpMultiplier = Math.max(0.1, Math.round(xpMultiplier * 100) / 100)

    const submitted: Submitted = {
      wasCorrect: isCorrect,
      quality,
      similarity,
      responseTimeMs,
      userInput: value,
      xpMultiplier,
    }

    if (settings?.soundEnabled) isCorrect ? playDing() : playBuzz()
    if (settings?.vibrationsEnabled) vibrate(isCorrect ? 12 : [8, 40, 8])

    setState({ ...s, submitted })
  }, [value, settings?.soundEnabled, settings?.vibrationsEnabled])

  /* ------------------------------ Next -------------------------------- */
  const advance = useCallback(async () => {
    const s = stateRef.current
    if (s.kind !== 'running' || !s.gen || !s.submitted || !stats) return
    const pair = s.pairs[s.current]
    const r = s.submitted

    // Materialise the deck row before scheduling — see persistTransient.
    const live = pair.transient ? await persistTransient(pair) : pair

    // Persist: schedule next FSRS, log review, update daily log.
    const nextCard = scheduleNext(live.card, r.quality)
    await db.cards.put(nextCard)

    const review: Review = {
      cardId: live.card.id!,
      wordId: live.word.id!,
      timestamp: Date.now(),
      quality: r.quality,
      responseTimeMs: r.responseTimeMs,
      exerciseType: 'listening-dictation',
      wasCorrect: r.wasCorrect,
      userInput: r.userInput,
    }
    await db.reviews.add(review)

    const rawXp = xpForReview(r.quality, live.card.difficultyScore)
    const xpGained = Math.max(1, Math.round(rawXp * r.xpMultiplier))
    await addXp(xpGained)
    incrementReviews()
    if (r.wasCorrect) registerCorrect()
    else registerWrong()

    const dailyLog = await recordReview({
      xp: xpGained,
      wasCorrect: r.wasCorrect,
      timeSpentSeconds: Math.round(r.responseTimeMs / 1000),
      dailyGoalXp: stats.dailyGoalXp,
    })
    await notifyDailyLog(dailyLog)

    const nextIdx = s.current + 1
    const newCorrect = s.correct + (r.wasCorrect ? 1 : 0)
    const newXp = s.xp + xpGained

    if (nextIdx >= s.pairs.length) {
      setState({
        kind: 'done',
        total: s.pairs.length,
        correct: newCorrect,
        xp: newXp,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      })
      setValue('')
    } else {
      setState({
        ...s,
        current: nextIdx,
        correct: newCorrect,
        xp: newXp,
        gen: null,
        submitted: null,
        playCount: 0,
        revealed: false,
        genError: '',
      })
      setValue('')
    }
  }, [stats, addXp, incrementReviews, registerCorrect, registerWrong, startedAt])

  /* ------------------------------ Render ------------------------------ */
  if (state.kind === 'loading') {
    return (
      <div className="text-center text-text-muted">Loading due cards…</div>
    )
  }

  if (state.kind === 'no-key') {
    return (
      <Notice
        title="Mistral API key missing."
        body="Paste your own key in Settings → AI connection to use the listening mode."
      />
    )
  }

  if (state.kind === 'empty') {
    return <EmptyDeckNotice mode="listening" />
  }

  if (state.kind === 'done') {
    return (
      <SessionComplete
        icon="◒"
        title="Ear-training done."
        stats={[
          { label: 'Correct', value: `${state.correct} / ${state.total}` },
          { label: 'XP earned', value: `+${state.xp}` },
          { label: 'Time', value: `${state.seconds}s` },
        ]}
        onRepeat={() => navigate(0)}
      />
    )
  }

  /* state.kind === 'running' */
  const pair = state.pairs[state.current]
  const loadingGen = !state.gen
  const submitted = state.submitted
  const gen = state.gen

  function onKey(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    if (submitted) advance()
    else if (value.trim()) submit()
  }

  return (
    <motion.div
      key={pair.key}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl"
      onKeyDown={onKey}
      tabIndex={-1}
    >
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
        <span>
          Card {state.current + 1} of {state.pairs.length}
        </span>
        <span>
          {pair.word.level}
          {gen?.aiGenerated ? ' · AI' : ''}
        </span>
      </div>

      <div className="card space-y-6">
        {loadingGen ? (
          <div className="flex items-center gap-3 text-text-muted">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
            Loading the sentence…
          </div>
        ) : (
          <>
            {/* Audio controls */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => replay(false)}
                aria-label="Play sentence"
                title="Play again"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/40 transition-transform hover:brightness-110 active:scale-95"
              >
                <span className="text-xl">▶</span>
              </button>
              <button
                onClick={() => replay(true)}
                title="Play slower"
                className="rounded-full border border-border bg-bg px-3 py-2 text-sm text-text-muted transition hover:border-accent/40 hover:text-text"
              >
                ◐ Slow
              </button>
              <div className="flex flex-col text-xs text-text-subtle">
                <span>
                  Plays: <strong className="text-text">{state.playCount}</strong>
                  {state.playCount > FREE_REPLAYS && (
                    <span className="ml-1 text-warning">(reduced XP)</span>
                  )}
                </span>
                <span>
                  Free replays: {FREE_REPLAYS}
                </span>
              </div>
              <div className="ml-auto">
                {!state.revealed && !submitted && (
                  <button
                    onClick={revealSentence}
                    className="text-xs text-text-subtle underline underline-offset-2 hover:text-text"
                  >
                    Show me (−50% XP)
                  </button>
                )}
              </div>
            </div>

            {/* Revealed-text fallback (always shown after submit, optional before) */}
            {(state.revealed || submitted) && (
              <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3 text-base leading-relaxed text-text">
                {gen!.sentence}
                {gen!.translationFr && (
                  <p className="mt-1 text-xs text-text-subtle">
                    Traduction : {gen!.translationFr}
                  </p>
                )}
              </div>
            )}

            {/* Input */}
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              readOnly={!!submitted}
              placeholder="Type what you heard. Punctuation and capitalization don't count."
              rows={3}
              className={`input w-full resize-none text-base leading-relaxed ${submitted ? 'opacity-70' : ''}`}
              {...noAutofill}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <KeyHint className="mt-0 text-left">
                Press <Key>Enter</Key> to {submitted ? 'continue' : 'submit'}.
              </KeyHint>
              {!submitted ? (
                <button
                  onClick={submit}
                  disabled={!value.trim()}
                  className="btn-primary w-full disabled:opacity-40 sm:w-auto"
                >
                  Submit
                </button>
              ) : (
                <button
                  ref={nextBtnRef}
                  onClick={advance}
                  className="btn-primary w-full sm:w-auto"
                >
                  Next →
                </button>
              )}
            </div>

            <AnimatePresence>
              {submitted && (
                <Feedback
                  submitted={submitted}
                  expected={gen!.sentence}
                  userInput={value}
                />
              )}
            </AnimatePresence>

            {state.genError && gen && !gen.aiGenerated && (
              <p className="text-xs text-warning">
                AI unavailable — used a seeded example instead.
              </p>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

/* ----------------------------- Sub-components -------------------------- */

function Feedback({
  submitted,
  expected,
  userInput,
}: {
  submitted: Submitted
  expected: string
  userInput: string
}) {
  const { wasCorrect, quality, similarity, xpMultiplier } = submitted
  const tone = wasCorrect ? 'success' : quality === 2 ? 'warning' : 'danger'
  const pct = Math.round(similarity * 100)
  const title = wasCorrect
    ? quality === 5
      ? 'Perfect transcription.'
      : 'Correct — a close match.'
    : quality === 2
      ? `Almost — ${pct}% match.`
      : `Not quite — ${pct}% match.`

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`overflow-hidden rounded-xl border px-4 py-3 text-sm ${
        tone === 'success'
          ? 'border-success/30 bg-success/5'
          : tone === 'warning'
            ? 'border-warning/30 bg-warning/5'
            : 'border-danger/30 bg-danger/5'
      }`}
    >
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <span
          className={
            tone === 'success'
              ? 'text-success'
              : tone === 'warning'
                ? 'text-warning'
                : 'text-danger'
          }
        >
          {tone === 'success' ? '✓' : tone === 'warning' ? '~' : '✗'}
        </span>
        <span className="text-text">{title}</span>
        {xpMultiplier < 1 && (
          <span className="ml-auto text-xs text-text-subtle">
            XP ×{xpMultiplier}
          </span>
        )}
      </div>
      {!wasCorrect && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-text-subtle">You typed:</p>
          <p className="italic text-text-muted">
            {userInput.trim() || <span className="opacity-60">(empty)</span>}
          </p>
          <p className="mt-2 text-xs text-text-subtle">Expected:</p>
          <p className="text-text">{expected}</p>
        </div>
      )}
    </motion.div>
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

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
