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
 * Questions come in four flavours (multiple-choice, fill-blank,
 * spot-error, idiom) so the test samples more dimensions of skill than
 * passive recognition. Each question type has its own card layout, but
 * they all share the same submit → reveal explanation → next-question
 * rhythm so the test feels like one continuous flow.
 *
 * Once finished, the user's CEFR level is saved to `userStats.cefrLevel`
 * and `settings.onboardingComplete` is flipped to true.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { db } from '@/db/database'
import { PageLoader } from '@/components/PageLoader'
import {
  levelFromScore,
  maxScore,
  pickQuestions,
  questionCount,
  scoreAnswer,
  type FillBlankQuestion,
  type IdiomQuestion,
  type MultipleChoiceQuestion,
  type OnboardingQuestion,
  type SpotErrorQuestion,
} from './questions'
import type { Level } from '@/types'
import { Key, KeyHint } from '@/components/ui'
import { noAutofill } from '@/utils/noAutofill'

/** A learner's answer: option index for choice-style, typed string for fill-blank. */
type Answer = number | string | null

type Phase =
  | { kind: 'intro' }
  | {
      kind: 'testing'
      /** Fresh set of questions drawn when this attempt started. */
      questions: OnboardingQuestion[]
      index: number
      answers: Answer[]
      /** True once the user has submitted the current question. */
      revealed: boolean
    }
  | { kind: 'done'; score: number; level: Level }

export function OnboardingPage() {
  const navigate = useNavigate()
  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })

  if (!stats || !settings) return <PageLoader />


  async function finishWith(level: Level, score: number) {
    await db.userStats.put({ ...stats!, cefrLevel: level })
    await updateSettings({ onboardingComplete: true })
    await useAppStore.getState().hydrate()
    setPhase({ kind: 'done', score, level })
  }

  async function skip() {
    // Defaults to the existing cefrLevel (B2 on fresh install).
    await updateSettings({ onboardingComplete: true })
    navigate('/', { replace: true })
  }

  function begin() {
    const questions = pickQuestions()
    setPhase({
      kind: 'testing',
      questions,
      index: 0,
      answers: Array(questions.length).fill(null),
      revealed: false,
    })
  }

  /**
   * Submit the current answer. For choice-style questions we receive the
   * picked option index; for fill-blank we receive the trimmed string.
   * Records the answer and reveals the explanation in one shot.
   */
  function submitAnswer(value: number | string) {
    if (phase.kind !== 'testing' || phase.revealed) return
    if (typeof value === 'string' && value.trim().length === 0) return
    const next = [...phase.answers]
    next[phase.index] = value
    setPhase({ ...phase, answers: next, revealed: true })
  }

  function goNext() {
    if (phase.kind !== 'testing') return
    const isLast = phase.index === phase.questions.length - 1
    if (isLast) {
      const total = phase.questions.reduce((sum, q, idx) => {
        const ans = phase.answers[idx]
        return sum + (ans === null ? 0 : scoreAnswer(q, ans))
      }, 0)
      const level = levelFromScore(total)
      void finishWith(level, total)
      return
    }
    setPhase({ ...phase, index: phase.index + 1, revealed: false })
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
          <motion.div
            key={`q-${phase.index}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Progress
              current={phase.index + 1}
              total={phase.questions.length}
            />
            <QuestionCard
              q={phase.questions[phase.index]}
              answer={phase.answers[phase.index]}
              revealed={phase.revealed}
              onSubmit={submitAnswer}
            />
            <div className="flex justify-end">
              <button
                onClick={goNext}
                disabled={!phase.revealed}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {phase.index === phase.questions.length - 1
                  ? 'See my level →'
                  : 'Next question →'}
              </button>
            </div>
          </motion.div>
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
                Score: {phase.score} / {maxScore()} points · You can change your
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

function Progress({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
        <span>
          Question {current} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>
    </div>
  )
}

/** Dispatch on question type — keeps each card's UI focused. */
function QuestionCard({
  q,
  answer,
  revealed,
  onSubmit,
}: {
  q: OnboardingQuestion
  answer: Answer
  revealed: boolean
  onSubmit: (value: number | string) => void
}) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
        <span>{q.level} level</span>
        <span>{typeLabel(q.type)}</span>
      </div>

      {q.type === 'multiple-choice' && (
        <ChoiceCard
          q={q}
          chosen={typeof answer === 'number' ? answer : null}
          revealed={revealed}
          onPick={onSubmit}
        />
      )}

      {q.type === 'spot-error' && (
        <ChoiceCard
          q={q}
          chosen={typeof answer === 'number' ? answer : null}
          revealed={revealed}
          onPick={onSubmit}
        />
      )}

      {q.type === 'idiom' && (
        <IdiomCard
          q={q}
          chosen={typeof answer === 'number' ? answer : null}
          revealed={revealed}
          onPick={onSubmit}
        />
      )}

      {q.type === 'fill-blank' && (
        <FillBlankCard
          q={q}
          typed={typeof answer === 'string' ? answer : ''}
          revealed={revealed}
          onSubmit={onSubmit}
        />
      )}

      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-text-muted"
        >
          {q.explanation}
        </motion.div>
      )}
    </div>
  )
}

function typeLabel(t: OnboardingQuestion['type']): string {
  switch (t) {
    case 'multiple-choice':
      return 'Pick one'
    case 'fill-blank':
      return 'Fill the blank'
    case 'spot-error':
      return 'Spot the error'
    case 'idiom':
      return 'Idiom meaning'
  }
}

/* ------------------------------ Cards ---------------------------------- */

/** Shared multi-choice layout used by 'multiple-choice' and 'spot-error'. */
function ChoiceCard({
  q,
  chosen,
  revealed,
  onPick,
}: {
  q: MultipleChoiceQuestion | SpotErrorQuestion
  chosen: number | null
  revealed: boolean
  onPick: (i: number) => void
}) {
  return (
    <div className="space-y-4">
      <p className="font-display text-lg text-text">{q.prompt}</p>
      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isChosen = chosen === i
          const isCorrect = revealed && i === q.answer
          const isWrong = revealed && isChosen && i !== q.answer
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              disabled={revealed}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                isCorrect
                  ? 'border-success bg-success/10 text-text'
                  : isWrong
                    ? 'border-error bg-error/10 text-text'
                    : isChosen
                      ? 'border-accent bg-accent-subtle text-text'
                      : 'border-border bg-bg-subtle text-text hover:border-text-subtle'
              } ${revealed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Idiom card — the idiom is highlighted above the meaning options. */
function IdiomCard({
  q,
  chosen,
  revealed,
  onPick,
}: {
  q: IdiomQuestion
  chosen: number | null
  revealed: boolean
  onPick: (i: number) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-text-muted">What does this idiom mean?</p>
        <p className="mt-1 font-display text-2xl font-semibold text-text">
          “{q.idiom}”
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isChosen = chosen === i
          const isCorrect = revealed && i === q.answer
          const isWrong = revealed && isChosen && i !== q.answer
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              disabled={revealed}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                isCorrect
                  ? 'border-success bg-success/10 text-text'
                  : isWrong
                    ? 'border-error bg-error/10 text-text'
                    : isChosen
                      ? 'border-accent bg-accent-subtle text-text'
                      : 'border-border bg-bg-subtle text-text hover:border-text-subtle'
              } ${revealed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Fill-blank card — the user types a single word. We split the prompt
 * around the literal placeholder `___` so the input sits inline with the
 * sentence, like a real cloze exercise. After submit we show the canonical
 * answer alongside the user's input so they can see exactly what was off.
 */
function FillBlankCard({
  q,
  typed,
  revealed,
  onSubmit,
}: {
  q: FillBlankQuestion
  typed: string
  revealed: boolean
  onSubmit: (value: string) => void
}) {
  const [draft, setDraft] = useState(typed)
  const inputRef = useRef<HTMLInputElement>(null)

  // Refocus when entering a new fill-blank question.
  useEffect(() => {
    inputRef.current?.focus()
    setDraft(typed)
  }, [q.id, typed])

  const [before, after] = splitOnBlank(q.prompt)
  const isCorrect = revealed && matches(draft, q)

  function commit() {
    if (revealed) return
    const value = draft.trim()
    if (!value) return
    onSubmit(value)
  }

  return (
    <div className="space-y-4">
      <p className="font-display text-lg leading-snug text-text">
        {before}
        <span className="mx-1 inline-flex items-center align-middle">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
            }}
            disabled={revealed}
            placeholder="…"
            {...noAutofill}
            className={
              'min-w-[110px] rounded-md border px-2 py-1 text-base font-display tracking-tight transition-colors ' +
              (revealed
                ? isCorrect
                  ? 'border-success bg-success/10 text-text'
                  : 'border-error bg-error/10 text-text'
                : 'border-border bg-bg-subtle text-text focus:border-accent focus:outline-none')
            }
            style={{ width: `${Math.max(draft.length + 2, 8)}ch` }}
          />
        </span>
        {after}
      </p>
      {!revealed && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <KeyHint className="mt-0 text-left">
            Press <Key>Enter</Key> or click Submit.
          </KeyHint>
          <button
            type="button"
            onClick={commit}
            disabled={draft.trim().length === 0}
            className="btn-ghost w-full disabled:opacity-40 sm:w-auto"
          >
            Submit
          </button>
        </div>
      )}
      {revealed && !isCorrect && (
        <div className="text-xs text-text-muted">
          Correct answer:{' '}
          <span className="font-semibold text-success">{q.answer}</span>
        </div>
      )}
    </div>
  )
}

function splitOnBlank(prompt: string): [string, string] {
  const idx = prompt.indexOf('___')
  if (idx === -1) return [prompt, '']
  return [prompt.slice(0, idx), prompt.slice(idx + 3)]
}

function matches(draft: string, q: FillBlankQuestion): boolean {
  const candidate = draft.trim().toLowerCase()
  if (!candidate) return false
  const accepted = [q.answer, ...(q.acceptedAnswers ?? [])].map((a) =>
    a.trim().toLowerCase(),
  )
  return accepted.includes(candidate)
}

function messageFor(level: Level): string {
  switch (level) {
    case 'A1':
    case 'A2':
      return "We'll start gently. Expect everyday vocabulary and short, supportive sessions."
    case 'B1':
      return 'Solid foundation. Practice will lean into fluency and natural phrasing.'
    case 'B2':
      return "You're comfortable in most situations. We'll sharpen precision and idiom."
    case 'C1':
      return 'Strong command. Expect nuance, register, and professional-grade phrasing.'
    case 'C2':
      return "Near-native. We'll push toward literary nuance and rare idioms."
  }
}
