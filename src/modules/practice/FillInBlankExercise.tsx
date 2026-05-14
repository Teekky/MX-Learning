/**
 * Fill-in-the-blank exercise — the core of Phase 1B.
 *
 * Flow:
 *   1. Receive a Word + SRSCard from the parent session.
 *   2. Pick a random example sentence and blank the lemma.
 *   3. User types; Enter / Submit validates.
 *   4. Emit result upwards: quality, wasCorrect, responseTimeMs, userInput.
 *   5. Show feedback until user presses Next.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { speak } from '@/audio/tts'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import { compareAnswer } from '@/utils/strings'
import { useAppStore } from '@/store/useAppStore'
import { maskLemma, pickExample, qualityFromAnswer } from './fillInBlank'
import type { Quality, SRSCard, Word } from '@/types'

export interface FillInBlankResult {
  quality: Quality
  wasCorrect: boolean
  responseTimeMs: number
  userInput: string
}

interface Props {
  word: Word
  card: SRSCard
  onDone: (result: FillInBlankResult) => void
  /** Index for progress display (1-based). */
  index: number
  total: number
}

export function FillInBlankExercise({ word, card: _card, onDone, index, total }: Props) {
  const settings = useAppStore((s) => s.settings)
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState<FillInBlankResult | null>(null)
  const startedAt = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  // Pick a stable example + mask once per mount.
  const { masked, expected, exampleFr } = useMemo(() => {
    const ex = pickExample(word)
    const { masked, expected } = maskLemma(ex.en, word.lemma)
    return { masked, expected, exampleFr: ex.fr, original: ex.en }
  }, [word])

  useEffect(() => {
    inputRef.current?.focus()
    startedAt.current = Date.now()
  }, [word.id])

  // Auto-focus the Next button after submission so Enter keeps working
  // even if the user clicks elsewhere first.
  useEffect(() => {
    if (submitted) nextBtnRef.current?.focus()
  }, [submitted])

  function submit() {
    if (submitted) return
    const responseTimeMs = Date.now() - startedAt.current
    const { isCorrect, isTypo } = compareAnswer(value, expected)
    const quality = qualityFromAnswer(isCorrect, isTypo, responseTimeMs)
    const result: FillInBlankResult = {
      quality,
      wasCorrect: isCorrect,
      responseTimeMs,
      userInput: value,
    }
    setSubmitted(result)

    // Immediate sensory feedback — fires on validation, not on Next.
    if (settings?.soundEnabled) {
      isCorrect ? playDing() : playBuzz()
    }
    if (settings?.vibrationsEnabled) {
      vibrate(isCorrect ? 12 : [8, 40, 8])
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (submitted) {
        onDone(submitted)
      } else {
        submit()
      }
    }
  }

  const playSentence = () =>
    speak(masked.replace(/_+/g, word.lemma), {
      voiceURI: settings?.voiceURI,
      rate: settings?.voiceRate ?? 1,
      pitch: settings?.voicePitch ?? 1,
    })

  return (
    <motion.div
      key={word.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-3xl"
      onKeyDown={onKey}
      tabIndex={-1}
    >
      {/* Progress */}
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
        <span>
          Card {index} of {total}
        </span>
        <span>
          {word.level} · {word.tags.slice(0, 2).join(' · ')}
        </span>
      </div>

      {/* Sentence card */}
      <div className="card space-y-6">
        <div className="flex items-start justify-between gap-4">
          <p className="font-display text-2xl leading-relaxed text-text">
            {masked}
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

        {/* Input */}
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={!!submitted}
            placeholder="Type the missing word…"
            className={`input flex-1 text-lg ${
              submitted ? 'opacity-70' : ''
            }`}
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
            <button
              ref={nextBtnRef}
              onClick={() => onDone(submitted)}
              className="btn-primary"
            >
              Next →
            </button>
          )}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {submitted && (
            <Feedback
              result={submitted}
              word={word}
              expected={expected}
              exampleFr={exampleFr}
            />
          )}
        </AnimatePresence>
      </div>

      <p className="mt-4 text-center text-xs text-text-subtle">
        Press <kbd className="rounded bg-bg-subtle px-1.5 py-0.5">Enter</kbd> to
        {submitted ? ' continue' : ' submit'}.
      </p>
    </motion.div>
  )
}

/* ------------------------------ Feedback ------------------------------- */

function Feedback({
  result,
  word,
  expected,
  exampleFr,
}: {
  result: FillInBlankResult
  word: Word
  expected: string
  exampleFr?: string
}) {
  const tone =
    result.wasCorrect
      ? 'success'
      : result.quality === 2
        ? 'warning'
        : 'danger'

  const title =
    result.wasCorrect
      ? result.quality === 5
        ? 'Perfect.'
        : result.quality === 4
          ? 'Correct.'
          : 'Got it — a bit slow.'
      : result.quality === 2
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

      {!result.wasCorrect && (
        <p className="text-text-muted">
          Expected: <strong className="text-text">{expected}</strong>
          {word.fr && (
            <>
              {' '}
              · <span className="italic">« {word.fr} »</span>
            </>
          )}
        </p>
      )}

      {word.definitionEn && (
        <p className="mt-1 text-text-muted">
          <span className="text-text-subtle">Meaning:</span> {word.definitionEn}
        </p>
      )}

      {!result.wasCorrect && exampleFr && (
        <p className="mt-2 text-xs text-text-subtle">
          Traduction : {exampleFr}
        </p>
      )}
    </motion.div>
  )
}
