/**
 * The review session — full-screen, no chrome, one card at a time.
 *
 * Deliberately routed *outside* the app shell: no sidebar, no top bar, no
 * navigation. For the five minutes this takes, the queue is the only thing
 * on screen. The only way out is the explicit close button.
 *
 * Controls, all three of them doing the same job:
 *   tap / Space          reveal
 *   1 2 3 4              Again / Hard / Good / Easy
 *   swipe ← →            Again / Good
 *
 * "Again" puts the card back at the end of the queue rather than letting it
 * disappear for a day: a card you just failed is the one you most need to
 * see again before you close the app.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { db } from '@/db/database'
import { getDuePairs, countDue } from '@/db/queries'
import { scheduleNext } from '@/utils/fsrs'
import { xpForReview } from '@/utils/levels'
import { recordReview } from '@/utils/dailyLog'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { useAppStore } from '@/store/useAppStore'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import { buttonClass, EmptyState, PageLoader } from '@/components/ui'
import { Link } from 'react-router-dom'
import { ReviewCard } from './ReviewCard'
import { ReviewComplete, type ReviewSummary } from './ReviewComplete'
import { GRADES, GRADE_BY_DIGIT, formatInterval, type Grade } from './grades'
import type { SRSCard, Word } from '@/types'

/** Cards pulled per session — about five minutes at a steady pace. */
const SESSION_SIZE = 20
/** How many times a single card may be re-queued by "Again" in one session. */
const MAX_REQUEUES = 2

type Pair = { card: SRSCard; word: Word; requeues: number }

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'running' }
  | { kind: 'done'; summary: ReviewSummary }

export function ReviewPage() {
  const navigate = useNavigate()

  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [queue, setQueue] = useState<Pair[]>([])
  const [position, setPosition] = useState(0)
  const [revealed, setRevealed] = useState(false)
  /* Bumped by "Keep going" to pull a fresh batch without a page reload. */
  const [batch, setBatch] = useState(0)

  /* Session tallies. Refs, not state: they change on every grade but the
     UI only reads them once, on the completion screen. Both clocks are set
     when the queue loads — reading the clock during render would make the
     component impure. */
  const startedAt = useRef(0)
  const shownAt = useRef(0)
  const tally = useRef({ reviewed: 0, firstTry: 0, xp: 0 })
  /* Guards against a double-grade from a fast keypress + swipe landing
     on the same card while the DB write is still in flight. */
  const busy = useRef(false)

  const current = queue[position]

  /* ---------------------------------------------------------------- */
  /*  Load the queue                                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false
    const levels = stats?.cefrLevel ? allowedLevelsFor(stats.cefrLevel) : undefined
    getDuePairs(SESSION_SIZE, levels).then((pairs) => {
      if (cancelled) return
      if (pairs.length === 0) {
        setPhase({ kind: 'empty' })
        return
      }
      setQueue(pairs.map((p) => ({ ...p, requeues: 0 })))
      setPhase({ kind: 'running' })
      startedAt.current = Date.now()
      shownAt.current = Date.now()
    })
    return () => {
      cancelled = true
    }
  }, [stats?.cefrLevel, batch])

  /** Pull the next batch of due cards, keeping the user in the flow. */
  const restart = useCallback(() => {
    tally.current = { reviewed: 0, firstTry: 0, xp: 0 }
    setQueue([])
    setPosition(0)
    setRevealed(false)
    setPhase({ kind: 'loading' })
    setBatch((n) => n + 1)
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Grading                                                          */
  /* ---------------------------------------------------------------- */

  const finish = useCallback(async () => {
    const levels = stats?.cefrLevel ? allowedLevelsFor(stats.cefrLevel) : undefined
    const remaining = await countDue(levels).catch(() => 0)
    setPhase({
      kind: 'done',
      summary: {
        reviewed: tally.current.reviewed,
        firstTry: tally.current.firstTry,
        xp: tally.current.xp,
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
        remaining,
      },
    })
  }, [stats?.cefrLevel])

  const grade = useCallback(
    async (g: Grade) => {
      if (!current || !stats || busy.current) return
      busy.current = true

      const responseTimeMs = Math.min(Date.now() - shownAt.current, 5 * 60_000)
      const wasCorrect = g.quality >= 3
      const nextCard = scheduleNext(current.card, g.quality)

      try {
        await db.cards.put(nextCard)
        await db.reviews.add({
          cardId: current.card.id!,
          wordId: current.word.id!,
          timestamp: Date.now(),
          quality: g.quality,
          responseTimeMs,
          exerciseType: 'flashcard',
          wasCorrect,
        })

        const xpGained = xpForReview(g.quality, current.card.difficultyScore)
        await addXp(xpGained)
        incrementReviews()
        if (wasCorrect) registerCorrect()
        else registerWrong()

        const dailyLog = await recordReview({
          xp: xpGained,
          wasCorrect,
          timeSpentSeconds: Math.round(responseTimeMs / 1000),
          dailyGoalXp: stats.dailyGoalXp,
        })
        await notifyDailyLog(dailyLog)

        tally.current.reviewed += 1
        tally.current.xp += xpGained
        /* "First try" only counts a confident pass on a card's first showing —
           re-queued cards can't inflate the number. */
        if (g.quality >= 4 && current.requeues === 0) tally.current.firstTry += 1

        if (settings?.soundEnabled) {
          if (wasCorrect) playDing(0.35)
          else playBuzz(0.25)
        }
        if (settings?.vibrationsEnabled) vibrate(wasCorrect ? 12 : [14, 40, 14])

        /* Failed cards come back before the session ends. */
        const requeue = g.quality < 3 && current.requeues < MAX_REQUEUES
        setQueue((q) => {
          const updated = q.map((p, i) =>
            i === position ? { ...p, card: nextCard } : p,
          )
          if (!requeue) return updated
          return [
            ...updated,
            { card: nextCard, word: current.word, requeues: current.requeues + 1 },
          ]
        })

        const nextPosition = position + 1
        // `queue.length` is the pre-requeue length; a re-queue always adds one.
        if (nextPosition >= queue.length + (requeue ? 1 : 0)) {
          await finish()
        } else {
          // Advance and hand the next card a clean slate: hidden answer,
          // fresh response clock.
          shownAt.current = Date.now()
          setRevealed(false)
          setPosition(nextPosition)
        }
      } finally {
        busy.current = false
      }
    },
    [
      current,
      stats,
      settings,
      position,
      queue.length,
      addXp,
      incrementReviews,
      registerCorrect,
      registerWrong,
      notifyDailyLog,
      finish,
    ],
  )

  /* ---------------------------------------------------------------- */
  /*  Keyboard                                                         */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (phase.kind !== 'running') return
    const onKey = (e: KeyboardEvent) => {
      // Never steal keys from a focused text field.
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        navigate('/')
        return
      }
      if (!revealed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          setRevealed(true)
        }
        return
      }
      const g = GRADE_BY_DIGIT[e.key]
      if (g) {
        e.preventDefault()
        void grade(g)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase.kind, revealed, grade, navigate])

  /* Preview of what each button does to the schedule. Anki-style, and the
     single best argument for keeping four buttons instead of two. */
  const intervals = useMemo(() => {
    if (!current) return null
    return Object.fromEntries(
      GRADES.map((g) => [g.key, formatInterval(scheduleNext(current.card, g.quality).intervalDays)]),
    ) as Record<Grade['key'], string>
  }, [current])

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (phase.kind === 'loading') {
    return (
      <Shell>
        <PageLoader label="Building your queue…" />
      </Shell>
    )
  }

  if (phase.kind === 'empty') {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-md px-gutter">
          <EmptyState
            icon="✦"
            title="Nothing is due right now"
            body="That is the system working, not a bug. Add a few words, or drill something else while the schedule catches up."
          >
            <Link to="/deck" className={buttonClass('primary')}>
              Add words
            </Link>
            <Link to="/practice" className={buttonClass('ghost')}>
              Practice modes
            </Link>
          </EmptyState>
          <div className="mt-6 text-center">
            <Link to="/" className="btn-quiet">
              Back to dashboard
            </Link>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase.kind === 'done') {
    return (
      <Shell>
        <ReviewComplete summary={phase.summary} onContinue={restart} />
      </Shell>
    )
  }

  if (!current) return null

  const progress = queue.length > 0 ? position / queue.length : 0

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg text-text">
      {/* --- Header: progress + exit ---------------------------------- */}
      <header
        className="edge-x flex shrink-0 items-center gap-4 pb-3"
        style={{ paddingTop: 'calc(var(--space-3) + var(--safe-top))' }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="End review"
          className="press -ml-2 flex h-tap w-tap shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-bg-subtle hover:text-text"
        >
          <X size={22} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
            <motion.div
              className="h-full origin-left rounded-full bg-accent"
              initial={false}
              animate={{ scaleX: progress }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <span className="shrink-0 font-mono text-sm tabular-nums text-text-muted">
          {position + 1}
          <span className="text-text-subtle">/{queue.length}</span>
        </span>
      </header>

      {/* --- The card -------------------------------------------------- */}
      <main className="edge-x flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-4">
        <AnimatePresence mode="wait">
          <ReviewCard
            key={`${current.card.id}-${current.requeues}`}
            word={current.word}
            card={current.card}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onGrade={(g) => void grade(g)}
            index={position + 1}
            total={queue.length}
          />
        </AnimatePresence>
      </main>

      {/* --- Actions, in the thumb arc --------------------------------- */}
      <footer className="edge-x thumb-zone shrink-0 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {!revealed ? (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className={buttonClass('primary', 'lg', 'w-full')}
              >
                Reveal
                <kbd className="ml-1 hidden rounded border-hair border-on-accent/40 px-1.5 py-0.5 font-mono text-2xs opacity-70 sm:inline">
                  space
                </kbd>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="grades"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="grid grid-cols-4 gap-2"
              role="group"
              aria-label="How well did you recall it?"
            >
              {GRADES.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => void grade(g)}
                  aria-keyshortcuts={g.digit}
                  className={[
                    'press no-select flex min-h-[64px] flex-col items-center justify-center gap-0.5',
                    'rounded-lg border-ink px-1 shadow-sm',
                    g.className,
                  ].join(' ')}
                >
                  <span className="font-display text-sm font-semibold">{g.label}</span>
                  <span className="font-mono text-2xs tabular-nums opacity-75">
                    {intervals?.[g.key]}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-3 hidden text-center text-2xs uppercase tracking-wider text-text-subtle sm:block">
          {revealed
            ? '1 · 2 · 3 · 4  to grade   —   swipe ← again, → good'
            : 'space to reveal   —   esc to leave'}
        </p>
      </footer>
    </div>
  )
}

/** Full-height wrapper for the non-card phases, so nothing jumps. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg text-text"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      {children}
    </div>
  )
}
