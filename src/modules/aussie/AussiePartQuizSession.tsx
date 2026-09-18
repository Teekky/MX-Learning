/**
 * Aussie — quiz for one fixed part (Part 1, Part 2, …).
 *
 * A short multiple-choice round ("What does X mean?") over exactly the
 * words that make up this part — never the whole domain, so a session is
 * always ten questions or fewer. Independent of "Learn the words":
 * finishing a part adds its words to the main deck regardless of whether
 * they were browsed first.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAussieDomain } from '@/data/aussie/domains'
import { aussiePartCount, aussiePartWords } from '@/utils/aussieParts'
import { addManyToDeck } from '@/db/words'
import { recordAussiePartResult } from '@/utils/aussieProgress'
import { recordReview } from '@/utils/dailyLog'
import { shuffled } from '@/utils/shuffle'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import { useAppStore } from '@/store/useAppStore'
import type { AussieDomain, AussieWordSeed } from '@/types'

const XP_PER_CORRECT = 6

interface Drill {
  word: AussieWordSeed
  options: string[]
  answerIndex: number
}

function buildDrill(word: AussieWordSeed, distractorPool: AussieWordSeed[]): Drill {
  const others = shuffled(distractorPool.filter((o) => o.lemma !== word.lemma)).slice(0, 3)
  const options = shuffled([word.definitionEn ?? '', ...others.map((o) => o.definitionEn ?? '')])
  return { word, options, answerIndex: options.indexOf(word.definitionEn ?? '') }
}

export function AussiePartQuizSession() {
  const { domainId, partIndex } = useParams<{ domainId: string; partIndex: string }>()
  const domain = domainId ? getAussieDomain(domainId) : undefined
  const idx = partIndex !== undefined ? Number(partIndex) : NaN

  if (!domain || !domain.ready || !Number.isInteger(idx) || idx < 0 || idx >= aussiePartCount(domain)) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-display text-2xl font-semibold">
          That part doesn't exist.
        </h1>
        <Link to={domain ? `/aussie/${domain.id}` : '/aussie'} className="btn-ghost inline-flex">
          ← Back
        </Link>
      </div>
    )
  }

  return <PartQuizBody domain={domain} partIndex={idx} />
}

type Phase =
  | {
      kind: 'quiz'
      drills: Drill[]
      index: number
      answers: (number | null)[]
      revealed: boolean
      correctSoFar: number
      xpSoFar: number
    }
  | { kind: 'done'; total: number; correct: number; xp: number }

function buildInitialPhase(words: AussieWordSeed[], pool: AussieWordSeed[]): Phase {
  const drills = shuffled(words).map((word) => buildDrill(word, pool))
  return {
    kind: 'quiz',
    drills,
    index: 0,
    answers: Array(drills.length).fill(null),
    revealed: false,
    correctSoFar: 0,
    xpSoFar: 0,
  }
}

function PartQuizBody({ domain, partIndex }: { domain: AussieDomain; partIndex: number }) {
  const navigate = useNavigate()
  const words = aussiePartWords(domain, partIndex)
  const partCount = aussiePartCount(domain)
  const [phase, setPhase] = useState<Phase>(() => buildInitialPhase(words, domain.words))

  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)

  async function submit(choice: number) {
    if (phase.kind !== 'quiz' || phase.revealed) return
    const drill = phase.drills[phase.index]
    const correct = choice === drill.answerIndex
    const xp = correct ? XP_PER_CORRECT : 1

    if (correct) registerCorrect()
    else registerWrong()
    if (settings?.soundEnabled) (correct ? playDing : playBuzz)()
    if (settings?.vibrationsEnabled && !correct) vibrate(40)

    await addXp(xp)
    incrementReviews()
    if (stats) {
      const dailyLog = await recordReview({
        xp,
        wasCorrect: correct,
        timeSpentSeconds: 6,
        dailyGoalXp: stats.dailyGoalXp,
      })
      await notifyDailyLog(dailyLog)
    }

    setPhase({
      ...phase,
      answers: phase.answers.map((a, i) => (i === phase.index ? choice : a)),
      revealed: true,
      correctSoFar: phase.correctSoFar + (correct ? 1 : 0),
      xpSoFar: phase.xpSoFar + xp,
    })
  }

  async function finish() {
    if (phase.kind !== 'quiz') return
    await addManyToDeck(
      words.map(({ icon: _icon, ...rest }) => ({ ...rest, source: 'user' as const })),
    )
    await recordAussiePartResult(domain.id, 'quiz', partIndex, phase.correctSoFar)
    setPhase({ kind: 'done', total: phase.drills.length, correct: phase.correctSoFar, xp: phase.xpSoFar })
  }

  function next() {
    if (phase.kind !== 'quiz' || !phase.revealed) return
    if (phase.index === phase.drills.length - 1) {
      void finish()
      return
    }
    setPhase({ ...phase, index: phase.index + 1, revealed: false })
  }

  // Enter / Space advances past a revealed answer.
  useEffect(() => {
    if (phase.kind !== 'quiz' || !phase.revealed) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      next()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind === 'quiz' && phase.revealed])

  if (phase.kind === 'done') {
    const pct = Math.round((phase.correct / Math.max(1, phase.total)) * 100)
    const hasNext = partIndex + 1 < partCount
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl space-y-6 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle text-accent">
          <domain.icon size={28} aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {pct >= 80 ? 'Nailed it' : pct >= 50 ? 'Solid' : 'Worth another go'}
          </h1>
          <p className="mt-1 text-text-muted">
            Part {partIndex + 1} done: its words are in your deck for regular review.
          </p>
        </div>
        <div className="card grid grid-cols-3 gap-6">
          <SummaryStat label="Correct" value={`${phase.correct} / ${phase.total}`} />
          <SummaryStat label="XP earned" value={`+${phase.xp}`} />
          <SummaryStat label="Score" value={`${pct}%`} />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate(`/aussie/${domain.id}`)} className="btn-ghost">
            ← Back to domain
          </button>
          <button onClick={() => setPhase(buildInitialPhase(words, domain.words))} className="btn-ghost">
            Retry this part
          </button>
          {hasNext && (
            <button
              onClick={() => navigate(`/aussie/${domain.id}/quiz/${partIndex + 1}`)}
              className="btn-primary"
            >
              Part {partIndex + 2} →
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  /* ----------------------------- Quiz ----------------------------- */
  const drill = phase.drills[phase.index]
  const total = phase.drills.length
  const progressPct = ((phase.index + 1) / total) * 100

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to={`/aussie/${domain.id}`}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        ← Back to domain
      </Link>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
          <span>
            {domain.name} · Part {partIndex + 1} · {phase.index + 1} / {total}
          </span>
          <span>+{phase.xpSoFar} XP</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      <div className="card space-y-4">
        <p className="font-display text-lg text-text">
          What does “{drill.word.lemma}” mean?
        </p>
        <div className="flex flex-col gap-2">
          {drill.options.map((opt, i) => {
            const isChosen = phase.answers[phase.index] === i
            const isCorrect = phase.revealed && i === drill.answerIndex
            const isWrong = phase.revealed && isChosen && i !== drill.answerIndex
            return (
              <button
                key={i}
                type="button"
                onClick={() => void submit(i)}
                disabled={phase.revealed}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                  isCorrect
                    ? 'border-success bg-success/10 text-text'
                    : isWrong
                      ? 'border-error bg-error/10 text-text'
                      : isChosen
                        ? 'border-accent bg-accent-subtle text-text'
                        : 'border-border bg-bg-subtle text-text hover:border-text-subtle'
                } ${phase.revealed ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {phase.revealed && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-text-muted"
          >
            {drill.word.lemma}
            {drill.word.fr ? ` · ${drill.word.fr}` : ''}
          </motion.p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!phase.revealed}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase.index === total - 1 ? 'See part results →' : 'Next question →'}
        </button>
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
