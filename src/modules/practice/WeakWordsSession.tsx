/**
 * Weak-words drill — a focused session on the user's most-lapsed cards.
 *
 * Structurally identical to FillInBlankSession, but the card source is
 * `getWeakPairs` (lapses-desc) rather than `getDuePairs` (due-now). The
 * idea: after a weekly review the user clicks "Drill only these" and
 * gets ONE shot at each of their worst cards, regardless of whether
 * the SRS thinks they're due.
 *
 * Why the Fill-in-the-Blank format:
 *   It's the most discriminating recall format we have — forces active
 *   production, not recognition. Good fit for the weakest cards where
 *   the user already knows the meaning passively.
 *
 * SRS impact: reviews still count. A correct recall here will push the
 * card's `lapses` count out of the top 10 over time, which is exactly
 * the feedback loop we want.
 */

import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@/db/database'
import { getWeakPairs } from '@/db/queries'
import { scheduleNext } from '@/utils/fsrs'
import { xpForReview } from '@/utils/levels'
import { recordReview } from '@/utils/dailyLog'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { useAppStore } from '@/store/useAppStore'
import {
  FillInBlankExercise,
  type FillInBlankResult,
} from './FillInBlankExercise'
import type { Review, SRSCard, Word } from '@/types'
import { SessionComplete } from './SessionComplete'

const MAX_CARDS_PER_SESSION = 10

type Pair = { card: SRSCard; word: Word }
type SessionState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | {
      kind: 'running'
      pairs: Pair[]
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

export function WeakWordsSession() {
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
    getWeakPairs(MAX_CARDS_PER_SESSION, levels).then((pairs) => {
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
    return <div className="text-center text-text-muted">Loading weak cards…</div>
  }

  if (state.kind === 'empty') {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 font-display text-2xl font-semibold">
          Nothing to drill — yet.
        </h1>
        <p className="mb-6 text-text-muted">
          Once you've lapsed on a few cards, they'll show up here for a
          focused drill. Run a regular practice session first.
        </p>
        <Link to="/" className="btn-ghost inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  if (state.kind === 'done') {
    return (
      <SessionComplete
        icon="◆"
        title="Weak-words drill complete."
        subtitle="Recall these enough times and they stop being your weakest."
        stats={[
          { label: 'Correct', value: `${state.correct} / ${state.total}` },
          { label: 'XP earned', value: `+${state.xp}` },
          { label: 'Time', value: `${state.seconds}s` },
        ]}
        onRepeat={() => navigate(0)}
        repeatLabel="Drill again"
        backTo="/review"
        backLabel="Back to review"
      />
    )
  }

  /* ------------------------------ Running ----------------------------- */

  const pair = state.pairs[state.current]

  async function handleResult(r: FillInBlankResult) {
    if (!stats || state.kind !== 'running') return

    const nextCard = scheduleNext(pair.card, r.quality)
    await db.cards.put(nextCard)

    const review: Review = {
      cardId: pair.card.id!,
      wordId: pair.word.id!,
      timestamp: Date.now(),
      quality: r.quality,
      responseTimeMs: r.responseTimeMs,
      exerciseType: 'fill-in-blank',
      wasCorrect: r.wasCorrect,
      userInput: r.userInput,
    }
    await db.reviews.add(review)

    const xpGained = xpForReview(r.quality, pair.card.difficultyScore)
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
        key={pair.card.id}
        word={pair.word}
        card={pair.card}
        onDone={handleResult}
        index={state.current + 1}
        total={state.pairs.length}
      />
    </AnimatePresence>
  )
}

