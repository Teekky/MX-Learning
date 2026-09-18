/**
 * Retake the CEFR placement test to see whether the level has moved.
 *
 * Reuses the same question bank and flow as first-run onboarding
 * (`LevelQuiz`), but is reachable any time from the profile, doesn't touch
 * `settings.onboardingComplete`, and shows a comparison against the
 * previous attempt instead of a first-time welcome message.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LevelQuiz } from './LevelQuiz'
import { levelRank, messageFor, questionCount } from './questions'
import { getLevelCheckHistory, recordLevelCheck } from '@/utils/levelCheck'
import type { Level, LevelCheck } from '@/types'

type Phase =
  | { kind: 'intro' }
  | { kind: 'testing' }
  | { kind: 'done'; score: number; max: number; level: Level; previous?: LevelCheck }

export function LevelCheckPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })
  const [lastCheck, setLastCheck] = useState<LevelCheck | null>(null)

  useEffect(() => {
    getLevelCheckHistory().then((history) => setLastCheck(history[0] ?? null))
  }, [])

  async function finish(level: Level, score: number, max: number) {
    const previous = lastCheck ?? undefined
    await recordLevelCheck(level, score, max)
    setPhase({ kind: 'done', score, max, level, previous })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-10">
      <AnimatePresence mode="wait">
        {phase.kind === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-2xl text-accent">
                ◈
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Retest your level.
              </h1>
              <p className="mt-2 text-text-muted">
                A fresh {questionCount()}-question draw from the same bank as
                your placement test.
                {lastCheck && (
                  <>
                    {' '}
                    You were last placed at{' '}
                    <span className="font-semibold text-text">
                      {lastCheck.cefrLevel}
                    </span>{' '}
                    on {new Date(lastCheck.date).toLocaleDateString()}.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPhase({ kind: 'testing' })}
                className="btn-primary"
              >
                Start →
              </button>
              <button onClick={() => navigate('/profile')} className="btn-ghost">
                Not now
              </button>
            </div>
          </motion.div>
        )}

        {phase.kind === 'testing' && (
          <LevelQuiz
            key="testing"
            onDone={(level, score, max) => void finish(level, score, max)}
          />
        )}

        {phase.kind === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="space-y-6 text-center"
          >
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-subtle text-4xl text-accent">
              ◉
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                You're at <span className="text-accent">{phase.level}</span>.
              </h1>
              <p className="mt-2 text-text-muted">{messageFor(phase.level)}</p>
              <ProgressLine level={phase.level} previous={phase.previous} />
              <p className="mt-4 text-sm text-text-subtle">
                Score: {phase.score} / {phase.max} points
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="btn-primary"
            >
              Back to profile →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** One line comparing this attempt's level to the previous check, if any. */
function ProgressLine({
  level,
  previous,
}: {
  level: Level
  previous?: LevelCheck
}) {
  if (!previous) return null
  const diff = levelRank(level) - levelRank(previous.cefrLevel)
  if (diff > 0) {
    return (
      <p className="mt-3 font-semibold text-success">
        Up from {previous.cefrLevel} — real progress since your last check.
      </p>
    )
  }
  if (diff < 0) {
    return (
      <p className="mt-3 text-text-muted">
        You were at {previous.cefrLevel} last time — this draw landed lower;
        that happens, keep practicing.
      </p>
    )
  }
  return (
    <p className="mt-3 text-text-muted">
      Still {level}, same as your last check — steady.
    </p>
  )
}
