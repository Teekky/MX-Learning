/**
 * Time-Attack — translate as many FR → EN words as possible in 60 seconds.
 *
 * Doesn't run the FSRS scheduler (different cognitive mode), but feeds
 * Dynamic Weighting: each attempt nudges the word's `difficultyScore`.
 * XP and streak still accrue normally.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@/db/database'
import {
  getPracticeWordPool,
  persistTransientWord,
  type PracticeWord,
} from '@/db/practiceProvider'
import { useAppStore } from '@/store/useAppStore'
import { recordReview } from '@/utils/dailyLog'
import { compareAnswer } from '@/utils/strings'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import { allowedLevelsFor } from '@/utils/levelFilter'

const DURATION_SECONDS = 60
const XP_PER_CORRECT = 5

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; words: PracticeWord[] }
  | {
      kind: 'playing'
      words: PracticeWord[]
      index: number
      correct: number
      wrong: number
      flash: 'none' | 'good' | 'bad'
      lastExpected?: string
    }
  | { kind: 'done'; correct: number; wrong: number; xp: number }

export function TimeAttackSession() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)

  /* ----------------------------- Load words --------------------------- */
  useEffect(() => {
    const userLevel = stats?.cefrLevel
    const allowedLevels = userLevel ? allowedLevelsFor(userLevel) : undefined
    // Pool = deck words with a French translation + transient seed
    // entries (also gated on `fr` so the prompt always renders). The
    // seed entries get persisted on first attempt — see persistOnAttempt.
    getPracticeWordPool(
      allowedLevels,
      (w) => !!w.fr && w.fr.trim().length > 0,
    ).then((pool) => {
      setPhase({ kind: 'ready', words: shuffle(pool) })
    })
  }, [stats?.cefrLevel])

  /* ------------------------------ Timer ------------------------------- */
  useEffect(() => {
    if (phase.kind !== 'playing') return
    if (secondsLeft <= 0) {
      finishGame()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind, secondsLeft])

  function finishGame() {
    const p = phaseRef.current
    if (p.kind !== 'playing') return
    const xp = p.correct * XP_PER_CORRECT
    setPhase({ kind: 'done', correct: p.correct, wrong: p.wrong, xp })
    void awardEndXp(p.correct)
  }

  async function awardEndXp(correctCount: number) {
    if (!stats) return
    if (correctCount === 0) {
      // Still log the activity for streak/daily-log purposes (0 XP).
      const dailyLog = await recordReview({
        xp: 0,
        wasCorrect: false,
        timeSpentSeconds: DURATION_SECONDS,
        dailyGoalXp: stats.dailyGoalXp,
      })
      await notifyDailyLog(dailyLog)
      return
    }
    const xpTotal = correctCount * XP_PER_CORRECT
    await addXp(xpTotal) // bumps streak too
    const dailyLog = await recordReview({
      xp: xpTotal,
      wasCorrect: true,
      timeSpentSeconds: DURATION_SECONDS,
      dailyGoalXp: stats.dailyGoalXp,
    })
    await notifyDailyLog(dailyLog)
  }

  /* --------------------------- Start gameplay ------------------------- */
  function start() {
    if (phase.kind !== 'ready') return
    setSecondsLeft(DURATION_SECONDS)
    setPhase({
      kind: 'playing',
      words: phase.words,
      index: 0,
      correct: 0,
      wrong: 0,
      flash: 'none',
    })
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  /* --------------------------- Submit answer -------------------------- */
  const submit = useCallback(async () => {
    const p = phaseRef.current
    if (p.kind !== 'playing') return
    const entry = p.words[p.index]
    const expected = entry.word.lemma
    const { isCorrect, isTypo } = compareAnswer(value, expected)
    const success = isCorrect || isTypo

    // Feedback (immediate).
    if (settings?.soundEnabled) success ? playDing(0.4) : playBuzz(0.3)
    if (settings?.vibrationsEnabled) vibrate(success ? 8 : [6, 30, 6])

    // Persist + nudge in the background so the UI can advance immediately.
    void persistOnAttemptThenNudge(entry, success, p.words, p.index)

    // Track attempt count for the session-end stats hook (incrementReviews
    // is called once per attempt for analytics parity with other modes).
    incrementReviews()
    if (success) registerCorrect()
    else registerWrong()

    // Move to next word.
    setValue('')
    setPhase({
      kind: 'playing',
      words: p.words,
      index: (p.index + 1) % p.words.length,
      correct: p.correct + (success ? 1 : 0),
      wrong: p.wrong + (success ? 0 : 1),
      flash: success ? 'good' : 'bad',
      lastExpected: success ? undefined : expected,
    })
    // Quick clear of the flash.
    setTimeout(() => {
      const cur = phaseRef.current
      if (cur.kind === 'playing')
        setPhase({ ...cur, flash: 'none', lastExpected: undefined })
    }, 220)
  }, [value, settings?.soundEnabled, settings?.vibrationsEnabled, incrementReviews, registerCorrect, registerWrong])

  function skip() {
    const p = phaseRef.current
    if (p.kind !== 'playing') return
    const entry = p.words[p.index]
    setValue('')
    setPhase({
      kind: 'playing',
      words: p.words,
      index: (p.index + 1) % p.words.length,
      correct: p.correct,
      wrong: p.wrong + 1,
      flash: 'bad',
      lastExpected: entry.word.lemma,
    })
    void persistOnAttemptThenNudge(entry, false, p.words, p.index)
    setTimeout(() => {
      const cur = phaseRef.current
      if (cur.kind === 'playing')
        setPhase({ ...cur, flash: 'none', lastExpected: undefined })
    }, 220)
  }

  /* ------------------------------ Render ------------------------------ */

  if (phase.kind === 'loading') {
    return <div className="text-center text-text-muted">Loading words…</div>
  }

  if (phase.kind === 'ready') {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-3 font-display text-3xl font-semibold tracking-tight">
          Time-Attack · 60 seconds
        </h1>
        <p className="mb-8 text-text-muted">
          Translate as many words as you can from French to English.
          <br />
          Press <kbd className="rounded bg-bg-subtle px-1.5 py-0.5">Enter</kbd> to
          submit, <kbd className="rounded bg-bg-subtle px-1.5 py-0.5">Tab</kbd> to
          skip. +{XP_PER_CORRECT} XP per correct answer.
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/practice" className="btn-ghost">
            ← Back
          </Link>
          <button onClick={start} className="btn-primary">
            Start
          </button>
        </div>
      </div>
    )
  }

  if (phase.kind === 'done') {
    const total = phase.correct + phase.wrong
    const accuracy = total === 0 ? 0 : Math.round((phase.correct / total) * 100)
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl space-y-6 text-center"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-2xl shadow-accent/40">
          <span className="font-display text-4xl">⏱</span>
        </div>
        <h1 className="font-display text-3xl font-semibold">Time's up.</h1>
        <div className="card grid grid-cols-3 gap-6">
          <SummaryStat label="Correct" value={`${phase.correct}`} />
          <SummaryStat label="Accuracy" value={`${accuracy}%`} />
          <SummaryStat label="XP earned" value={`+${phase.xp}`} />
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

  /* phase.kind === 'playing' */
  const current = phase.words[phase.index]
  const flashClass =
    phase.flash === 'good'
      ? 'border-success bg-success/10'
      : phase.flash === 'bad'
        ? 'border-danger bg-danger/10'
        : ''

  return (
    <div className="mx-auto max-w-2xl">
      {/* Timer + score row */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-text-subtle">
          ✓ {phase.correct} · ✗ {phase.wrong}
        </div>
        <Timer secondsLeft={secondsLeft} total={DURATION_SECONDS} />
      </div>

      <motion.div
        animate={{ scale: phase.flash !== 'none' ? 1.01 : 1 }}
        transition={{ duration: 0.1 }}
        className={`card transition-colors ${flashClass}`}
      >
        <div className="text-xs uppercase tracking-wider text-text-subtle">
          French
        </div>
        <div className="mt-2 mb-6 font-display text-3xl font-semibold text-text">
          {current.word.fr}
        </div>

        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (value.trim()) submit()
              } else if (e.key === 'Tab') {
                e.preventDefault()
                skip()
              }
            }}
            placeholder="Type the English word…"
            className="input flex-1 text-lg"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button onClick={skip} className="btn-ghost" title="Skip (Tab)">
            Skip
          </button>
        </div>

        <AnimatePresence>
          {phase.lastExpected && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-sm text-danger"
            >
              Was: <strong>{phase.lastExpected}</strong>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* ---------------------------- helpers --------------------------------- */

function Timer({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const pct = (secondsLeft / total) * 100
  const tone =
    secondsLeft <= 10 ? 'text-danger' : secondsLeft <= 20 ? 'text-warning' : 'text-text'
  return (
    <div className="flex items-center gap-3">
      <span className={`font-display text-2xl font-semibold tabular-nums ${tone}`}>
        {secondsLeft}s
      </span>
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-bg-subtle">
        <motion.div
          className={`h-full rounded-full ${
            secondsLeft <= 10 ? 'bg-danger' : 'bg-accent'
          }`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
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

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function nudgeDifficulty(wordId: number, wasCorrect: boolean) {
  const card = await db.cards.where('wordId').equals(wordId).first()
  if (!card?.id) return
  const delta = wasCorrect ? -0.03 : 0.1
  const next = Math.max(0, Math.min(1, card.difficultyScore + delta))
  await db.cards.update(card.id, { difficultyScore: next })
}

/**
 * Time-Attack's "review" equivalent: persist the transient seed entry
 * the first time the user attempts it (right or wrong = engagement),
 * then nudge its difficulty score for Dynamic Weighting. Mutates the
 * shared `pool` so the same lemma isn't re-persisted on a later loop.
 */
async function persistOnAttemptThenNudge(
  entry: PracticeWord,
  wasCorrect: boolean,
  pool: PracticeWord[],
  index: number,
) {
  let live = entry
  if (entry.transient) {
    live = await persistTransientWord(entry)
    pool[index] = live
    // Backfill any other slots that point at the same lemma (the pool
    // wraps around in long sessions, so the same seed could appear
    // again before persistence completes — keep them in sync).
    const lemma = live.word.lemma.toLowerCase()
    for (let i = 0; i < pool.length; i++) {
      if (i === index) continue
      if (pool[i].word.lemma.toLowerCase() === lemma) pool[i] = live
    }
  }
  if (live.word.id != null) {
    void nudgeDifficulty(live.word.id, wasCorrect)
  }
}
