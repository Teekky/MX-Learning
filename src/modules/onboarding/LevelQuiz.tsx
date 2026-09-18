/**
 * The CEFR quiz-taking UI — shared between the first-run onboarding test
 * and later retakes (`LevelCheckPage`). Owns question flow, answer capture
 * and scoring; the caller only gets a callback once the run is scored, and
 * renders its own "done" screen so onboarding and retakes can each say
 * something different once finished.
 *
 * Once an answer is revealed, Enter or Space moves to the next question —
 * the mouse never has to leave the keyboard for a multi-minute quiz.
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  levelFromScore,
  maxScore,
  pickQuestions,
  scoreAnswer,
  type IdiomQuestion,
  type MultipleChoiceQuestion,
  type OnboardingQuestion,
  type SpotErrorQuestion,
} from './questions'
import type { Level } from '@/types'

interface TestingState {
  questions: OnboardingQuestion[]
  index: number
  answers: (number | null)[]
  revealed: boolean
}

export function LevelQuiz({
  onDone,
}: {
  onDone: (level: Level, score: number, max: number) => void
}) {
  const [state, setState] = useState<TestingState>(() => {
    const questions = pickQuestions()
    return {
      questions,
      index: 0,
      answers: Array(questions.length).fill(null),
      revealed: false,
    }
  })

  function submitAnswer(value: number) {
    if (state.revealed) return
    const next = [...state.answers]
    next[state.index] = value
    setState({ ...state, answers: next, revealed: true })
  }

  function goNext() {
    const isLast = state.index === state.questions.length - 1
    if (isLast) {
      const total = state.questions.reduce((sum, q, idx) => {
        const ans = state.answers[idx]
        return sum + (ans === null ? 0 : scoreAnswer(q, ans))
      }, 0)
      onDone(levelFromScore(total), total, maxScore())
      return
    }
    setState({ ...state, index: state.index + 1, revealed: false })
  }

  // Enter / Space advances once the answer is revealed, so a learner can
  // fly through the quiz from the keyboard alone.
  useEffect(() => {
    if (!state.revealed) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.revealed])

  return (
    <motion.div
      key={`q-${state.index}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Progress current={state.index + 1} total={state.questions.length} />
      <QuestionCard
        q={state.questions[state.index]}
        answer={state.answers[state.index]}
        revealed={state.revealed}
        onSubmit={submitAnswer}
      />
      <div className="flex justify-end">
        <button
          onClick={goNext}
          disabled={!state.revealed}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.index === state.questions.length - 1
            ? 'See my level →'
            : 'Next question →'}
        </button>
      </div>
    </motion.div>
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
  answer: number | null
  revealed: boolean
  onSubmit: (value: number) => void
}) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
        <span>{q.level} level</span>
        <span>{typeLabel(q.type)}</span>
      </div>

      {(q.type === 'multiple-choice' || q.type === 'spot-error') && (
        <ChoiceCard q={q} chosen={answer} revealed={revealed} onPick={onSubmit} />
      )}

      {q.type === 'idiom' && (
        <IdiomCard q={q} chosen={answer} revealed={revealed} onPick={onSubmit} />
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
