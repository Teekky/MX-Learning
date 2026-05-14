/**
 * Fill-in-the-blank session — runs the user through up to N due cards
 * using the FillInBlankExercise component.
 *
 * Lifted out of the old PracticeSessionPage so multiple practice modes
 * can coexist behind the same /practice/:mode router slot.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
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
import { useAppStore } from '@/store/useAppStore'
import { FillInBlankExercise, type FillInBlankResult } from './FillInBlankExercise'
import { EmptyDeckNotice } from './EmptyDeckNotice'
import type { Review } from '@/types'

const MAX_CARDS_PER_SESSION = 10

type SessionState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | {
      kind: 'running'
      pairs: PracticePair[]
      current: number
      correct: number
      xp: number
    }
  | {
      kind: 'done'
      total: number
      correct: number
      xp: number
      seconds: number
    }

export function FillInBlankSession() {
  const navigate = useNavigate()
  const [state, setState] = useState<SessionState>({ kind: 'loading' })
  const [startedAt] = useState(Date.now())

  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)
  const stats = useAppStore((s) => s.stats)

  useEffect(() => {
    const levels = stats?.cefrLevel
      ? allowedLevelsFor(stats.cefrLevel)
      : undefined
    // The provider mixes due cards with transient seed entries so a
    // brand-new user can drill from the very first launch — nothing
    // gets written to the deck unless they actually review it.
    getPracticeBatch(MAX_CARDS_PER_SESSION, levels).then((pairs) => {
      if (pairs.length === 0) setState({ kind: 'empty' })
      else
        setState({
          kind: 'running',
          pairs,
          current: 0,
          correct: 0,
          xp: 0,
        })
    })
  }, [stats?.cefrLevel])

  if (state.kind === 'loading') {
    return <div className="text-center text-text-muted">Loading due cards…</div>
  }

  if (state.kind === 'empty') {
    return <EmptyDeckNotice mode="fill-in-blank" />
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
        <h1 className="font-display text-3xl font-semibold">
          Session complete.
        </h1>
        <div className="card grid grid-cols-3 gap-6">
          <SummaryStat
            label="Correct"
            value={`${state.correct} / ${state.total}`}
          />
          <SummaryStat label="XP earned" value={`+${state.xp}`} />
          <SummaryStat label="Time" value={`${state.seconds}s`} />
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

  /* ------------------------------ Running ----------------------------- */

  const pair = state.pairs[state.current]

  async function handleResult(r: FillInBlankResult) {
    if (!stats || state.kind !== 'running') return

    // Materialise the deck row before scheduling. Transient pairs only
    // become real Word + SRSCard rows the moment the user actually
    // reviews them — that's our "I want to learn this" signal.
    const live = pair.transient ? await persistTransient(pair) : pair

    const nextCard = scheduleNext(live.card, r.quality)
    await db.cards.put(nextCard)

    const review: Review = {
      cardId: live.card.id!,
      wordId: live.word.id!,
      timestamp: Date.now(),
      quality: r.quality,
      responseTimeMs: r.responseTimeMs,
      exerciseType: 'fill-in-blank',
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

    const next = state.current + 1
    if (next >= state.pairs.length) {
      const totalSeconds = Math.round((Date.now() - startedAt) / 1000)
      setState({
        kind: 'done',
        total: state.pairs.length,
        correct: state.correct + (r.wasCorrect ? 1 : 0),
        xp: state.xp + xpGained,
        seconds: totalSeconds,
      })
    } else {
      setState({
        ...state,
        current: next,
        correct: state.correct + (r.wasCorrect ? 1 : 0),
        xp: state.xp + xpGained,
      })
    }
  }

  return (
    <AnimatePresence mode="wait">
      <FillInBlankExercise
        key={pair.key}
        word={pair.word}
        card={pair.card}
        onDone={handleResult}
        index={state.current + 1}
        total={state.pairs.length}
      />
    </AnimatePresence>
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
