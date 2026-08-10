/**
 * Words-in-Context — Mistral generates a fresh, natural sentence for each word
 * in the user's due queue. Same fill-in-the-blank mechanic as FillInBlank, but
 * the sentences are AI-generated (tests generalization beyond seeded examples).
 *
 * Falls back to the word's seeded example if Mistral fails.
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
import { compareAnswer } from '@/utils/strings'
import { maskLemma, pickExample, qualityFromAnswer } from './fillInBlank'
import { generateContextSentence } from '@/ai/wordInContext'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { hasMistralKey } from '@/ai/mistral'
import { speak } from '@/audio/tts'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import { EmptyDeckNotice } from './EmptyDeckNotice'
import type { Review } from '@/types'
import { Key, KeyHint } from '@/components/ui'

const MAX_CARDS_PER_SESSION = 8

type Generated = {
  masked: string
  expected: string
  translationFr?: string
  hint?: string
  /** True when Mistral was the source, false when we fell back. */
  aiGenerated: boolean
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
      /** Generated data for the current word (null while loading). */
      gen: Generated | null
      /** Null until the user submits. */
      submitted: null | {
        wasCorrect: boolean
        quality: 0 | 1 | 2 | 3 | 4 | 5
        responseTimeMs: number
        userInput: string
      }
      /** Non-empty if the previous Mistral call failed. */
      genError: string
    }
  | {
      kind: 'done'
      total: number
      correct: number
      xp: number
      seconds: number
    }

export function WordsInContextSession() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [value, setValue] = useState('')
  const [startedAt] = useState(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
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
    // deck only grows when the user actually reviews a transient card.
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
          genError: '',
        })
    })
  }, [stats?.cefrLevel])

  /* --------------- Generate sentence for the current pair ------------- */
  useEffect(() => {
    const s = stateRef.current
    if (s.kind !== 'running') return
    if (s.gen) return // already generated for this card
    const pair = s.pairs[s.current]
    let cancelled = false

    const run = async () => {
      try {
        const ctx = await generateContextSentence(pair.word, {
          level: stats?.cefrLevel,
        })
        if (cancelled) return
        // Prefer Mistral's surface_form for masking; fall back to lemma.
        const { masked, expected } = maskLemma(
          ctx.sentence,
          ctx.surfaceForm || pair.word.lemma,
        )
        setState((prev) =>
          prev.kind === 'running' && prev.current === s.current
            ? {
                ...prev,
                gen: {
                  masked,
                  expected,
                  translationFr: ctx.translationFr,
                  hint: ctx.hint,
                  aiGenerated: true,
                },
                genError: '',
              }
            : prev,
        )
      } catch (err) {
        if (cancelled) return
        // Fallback to seeded example so the session keeps moving.
        const ex = pickExample(pair.word)
        const { masked, expected } = maskLemma(ex.en, pair.word.lemma)
        setState((prev) =>
          prev.kind === 'running' && prev.current === s.current
            ? {
                ...prev,
                gen: {
                  masked,
                  expected,
                  translationFr: ex.fr,
                  hint: pair.word.definitionEn,
                  aiGenerated: false,
                },
                genError: errMessage(err),
              }
            : prev,
        )
      }
    }
    run()
    return () => {
      cancelled = true
    }
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

  /* ----------------------------- Submit ------------------------------- */
  const submit = useCallback(() => {
    const s = stateRef.current
    if (s.kind !== 'running' || !s.gen || s.submitted) return
    const responseTimeMs = Date.now() - startedCardAt.current
    const { isCorrect, isTypo } = compareAnswer(value, s.gen.expected)
    const quality = qualityFromAnswer(isCorrect, isTypo, responseTimeMs)
    const submitted = { wasCorrect: isCorrect, quality, responseTimeMs, userInput: value }

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
      exerciseType: 'random-words-context',
      wasCorrect: r.wasCorrect,
      userInput: r.userInput,
    }
    await db.reviews.add(review)

    const xpGained = xpForReview(r.quality, live.card.difficultyScore)
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
        genError: '',
      })
      setValue('')
    }
  }, [stats, addXp, incrementReviews, registerCorrect, registerWrong, startedAt])

  /* ------------------------------ Render ------------------------------ */
  if (state.kind === 'loading') {
    return <div className="text-center text-text-muted">Loading due cards…</div>
  }

  if (state.kind === 'no-key') {
    return (
      <Notice
        title="Mistral API key missing."
        body="Add VITE_MISTRAL_API_KEY to .env.local to use this AI-powered mode."
      />
    )
  }

  if (state.kind === 'empty') {
    return <EmptyDeckNotice mode="random-words" />
  }

  if (state.kind === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl space-y-6 text-center"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-2xl shadow-accent/40">
          <span className="font-display text-4xl">✓</span>
        </div>
        <h1 className="font-display text-3xl font-semibold">Session complete.</h1>
        <div className="card grid grid-cols-3 gap-6">
          <SummaryStat label="Correct" value={`${state.correct} / ${state.total}`} />
          <SummaryStat label="XP earned" value={`+${state.xp}`} />
          <SummaryStat label="Time" value={`${state.seconds}s`} />
        </div>
        <div className="flex justify-center gap-3">
          <Link to="/practice" className="btn-ghost">Back to menu</Link>
          <button onClick={() => navigate(0)} className="btn-primary">Another round</button>
        </div>
      </motion.div>
    )
  }

  /* state.kind === 'running' */
  const pair = state.pairs[state.current]
  const loadingGen = !state.gen
  const submitted = state.submitted
  const gen = state.gen

  function onKey(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (submitted) advance()
    else if (value.trim()) submit()
  }

  const playSentence = () => {
    if (!gen) return
    speak(gen.masked.replace(/_+/g, pair.word.lemma), {
      voiceURI: settings?.voiceURI,
      rate: settings?.voiceRate ?? 1,
      pitch: settings?.voicePitch ?? 1,
    })
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
        <span>Card {state.current + 1} of {state.pairs.length}</span>
        <span>
          {pair.word.level} · {pair.word.tags.slice(0, 2).join(' · ')}
          {gen?.aiGenerated ? ' · AI' : ''}
        </span>
      </div>

      <div className="card space-y-6">
        {loadingGen ? (
          <div className="flex items-center gap-3 text-text-muted">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
            Generating a fresh sentence…
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <p className="font-display text-2xl leading-relaxed text-text">
                {gen!.masked}
              </p>
              <button
                onClick={playSentence}
                aria-label="Play sentence"
                title="Play sentence"
                className="shrink-0 rounded-full border border-border bg-bg-subtle px-3 py-2 text-text-muted transition-all hover:border-accent/50 hover:text-text"
              >
                ▶
              </button>
            </div>

            {gen!.hint && (
              <p className="text-sm text-text-subtle">
                <span className="uppercase tracking-wider">Hint:</span> {gen!.hint}
              </p>
            )}

            <div className="answer-row">
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                readOnly={!!submitted}
                placeholder="Type the missing word…"
                className={`input text-lg ${submitted ? 'opacity-70' : ''}`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {!submitted ? (
                <button
                  onClick={submit}
                  disabled={!value.trim()}
                  className="btn-primary disabled:opacity-40"
                >
                  Submit
                </button>
              ) : (
                <button ref={nextBtnRef} onClick={advance} className="btn-primary">
                  Next →
                </button>
              )}
            </div>

            <AnimatePresence>
              {submitted && (
                <Feedback
                  wasCorrect={submitted.wasCorrect}
                  quality={submitted.quality}
                  expected={gen!.expected}
                  wordFr={pair.word.fr}
                  translationFr={gen!.translationFr}
                />
              )}
            </AnimatePresence>

            {state.genError && !gen!.aiGenerated && (
              <p className="text-xs text-warning">
                AI unavailable — used a seeded example instead.
              </p>
            )}
          </>
        )}
      </div>

      <KeyHint>
        Press <Key>Enter</Key> to{submitted ? ' continue' : ' submit'}.
      </KeyHint>
    </motion.div>
  )
}

/* ----------------------------- Sub-components -------------------------- */

function Feedback({
  wasCorrect,
  quality,
  expected,
  wordFr,
  translationFr,
}: {
  wasCorrect: boolean
  quality: 0 | 1 | 2 | 3 | 4 | 5
  expected: string
  wordFr?: string
  translationFr?: string
}) {
  const tone = wasCorrect ? 'success' : quality === 2 ? 'warning' : 'danger'
  const title = wasCorrect
    ? quality === 5
      ? 'Perfect.'
      : quality === 4
        ? 'Correct.'
        : 'Got it — a bit slow.'
    : quality === 2
      ? 'Almost — tiny typo.'
      : 'Not quite.'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`overflow-hidden rounded-xl border px-4 py-3 text-sm ${
        tone === 'success'
          ? 'border-success/30 bg-success/5 text-text'
          : tone === 'warning'
            ? 'border-warning/30 bg-warning/5 text-text'
            : 'border-danger/30 bg-danger/5 text-text'
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
        <span>{title}</span>
      </div>
      {!wasCorrect && (
        <p className="text-text-muted">
          Expected: <strong className="text-text">{expected}</strong>
          {wordFr && (
            <> · <span className="italic">« {wordFr} »</span></>
          )}
        </p>
      )}
      {translationFr && (
        <p className="mt-2 text-xs text-text-subtle">Traduction : {translationFr}</p>
      )}
    </motion.div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-subtle">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-text">{value}</div>
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

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
