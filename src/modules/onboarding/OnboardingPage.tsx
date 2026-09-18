/**
 * First-launch CEFR placement test.
 *
 * Flow:
 *   intro → question 1..N → results → dashboard.
 *
 * The test is explicitly skippable (spec says "optional / passable") — we
 * default to B2 in that case and mark onboarding as complete so we never
 * interrupt the user again.
 *
 * The question-flow UI itself (`LevelQuiz`) is shared with `LevelCheckPage`,
 * which lets the learner retake the same test later to see how their level
 * has moved. Once finished here, the user's CEFR level is saved to
 * `userStats.cefrLevel`, a `levelChecks` row is recorded, and
 * `settings.onboardingComplete` is flipped to true.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { db } from '@/db/database'
import { PageLoader } from '@/components/PageLoader'
import { messageFor, questionCount } from './questions'
import { LevelQuiz } from './LevelQuiz'
import { recordLevelCheck } from '@/utils/levelCheck'
import type { Level } from '@/types'

type Phase =
  | { kind: 'intro' }
  | { kind: 'testing' }
  | { kind: 'done'; score: number; max: number; level: Level }

export function OnboardingPage() {
  const navigate = useNavigate()
  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })

  if (!stats || !settings) return <PageLoader />


  async function finishWith(level: Level, score: number, max: number) {
    await db.userStats.put({ ...stats!, cefrLevel: level })
    await updateSettings({ onboardingComplete: true })
    await recordLevelCheck(level, score, max)
    await useAppStore.getState().hydrate()
    setPhase({ kind: 'done', score, max, level })
  }

  async function skip() {
    // Defaults to the existing cefrLevel (B2 on fresh install).
    await updateSettings({ onboardingComplete: true })
    navigate('/', { replace: true })
  }

  function begin() {
    setPhase({ kind: 'testing' })
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
                ◆
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Welcome to MX Learning.
              </h1>
              <p className="mt-2 text-text-muted">
                A {questionCount()}-question placement test that mixes vocab,
                grammar, idioms and spot-the-error so we can place you
                accurately. Takes about three minutes. You can skip it — we'll
                default to B2 and you can adjust anytime in Settings. Each
                retake draws a fresh set of questions.
              </p>
            </div>

            <div className="card space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-accent">◔</span>
                <div>
                  <div className="font-semibold text-text">No pressure</div>
                  <div className="text-text-muted">
                    Pick the best answer or type your guess. Skip if unsure.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-accent">◐</span>
                <div>
                  <div className="font-semibold text-text">Calibrated scoring</div>
                  <div className="text-text-muted">
                    Harder questions count more. A rough placement is fine.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-accent">●</span>
                <div>
                  <div className="font-semibold text-text">Fully local</div>
                  <div className="text-text-muted">
                    No network call — your answers stay on this device.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={begin} className="btn-primary">
                Start the test →
              </button>
              <button onClick={skip} className="btn-ghost">
                Skip — I'll set it manually
              </button>
            </div>
          </motion.div>
        )}

        {phase.kind === 'testing' && (
          <LevelQuiz
            key="testing"
            onDone={(level, score, max) => void finishWith(level, score, max)}
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
                You're at{' '}
                <span className="text-accent">{phase.level}</span>.
              </h1>
              <p className="mt-2 text-text-muted">
                {messageFor(phase.level)}
              </p>
              <p className="mt-4 text-sm text-text-subtle">
                Score: {phase.score} / {phase.max} points · You can change your
                level anytime in Settings.
              </p>
            </div>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="btn-primary"
            >
              Open my dashboard →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
