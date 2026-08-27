/**
 * Recall exercise — produce the word from its meaning.
 *
 * Why this exists
 * ---------------
 * "Learn from anything" used to teach a word and then immediately show one
 * of the very example sentences you had just read, with the word blanked
 * out. That is not a test, it is a transcription task: the answer is on the
 * previous screen, in the same words, thirty seconds old. You pass it every
 * time and learn nothing from passing.
 *
 * This asks the opposite direction. You are given the *meaning* and have to
 * produce the *word* — the retrieval that actually builds a memory, and the
 * direction you need in real conversation. Nothing about the target is on
 * screen when you start.
 *
 * Hints are available, and they cost. Each one you open lowers the ceiling
 * on the grade, so the scheduler sees "recalled it with the sentence in
 * front of me" as the weaker performance it is:
 *
 *   no hint   → 4, or 5 if it came back fast
 *   1 hint    → 3   (shape of the word)
 *   2 hints   → 3   (and a sentence with a gap in it)
 *   typo      → 2
 *   wrong     → 1
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Volume2 } from 'lucide-react'
import { speak } from '@/audio/tts'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import { compareAnswer } from '@/utils/strings'
import { useAppStore } from '@/store/useAppStore'
import { maskLemma } from './fillInBlank'
import { Badge, Key, KeyHint, LevelBadge } from '@/components/ui'
import type { FillInBlankResult } from './FillInBlankExercise'
import type { Quality, Word } from '@/types'
import { noAutofill } from '@/utils/noAutofill'

/** Under this, a clean answer counts as instant recall rather than effort. */
const FAST_MS = 6_000

interface Props {
  word: Word
  onDone: (result: FillInBlankResult) => void
  /** 1-based position, for the progress line. */
  index: number
  total: number
  /**
   * Index of the example held back from the teaching screen, so the hint
   * shows a sentence the learner has not just read.
   */
  hiddenExampleIndex?: number
}

export function RecallExercise({
  word,
  onDone,
  index,
  total,
  hiddenExampleIndex,
}: Props) {
  const settings = useAppStore((s) => s.settings)
  const [value, setValue] = useState('')
  const [hints, setHints] = useState(0)
  const [submitted, setSubmitted] = useState<FillInBlankResult | null>(null)
  const startedAt = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  /* The sentence hint: the held-back example, with the target masked. */
  const sentenceHint = useMemo(() => {
    const examples = word.examples ?? []
    if (examples.length === 0) return null
    const pick =
      hiddenExampleIndex != null && examples[hiddenExampleIndex]
        ? examples[hiddenExampleIndex]
        : examples[examples.length - 1]
    return maskLemma(pick.en, word.lemma).masked
  }, [word, hiddenExampleIndex])

  /* Shape hint: first letter, then a dash per remaining letter. Spaces and
     hyphens are kept so multi-word expressions read as such. */
  const shapeHint = useMemo(() => {
    return word.lemma
      .split(' ')
      .map((token, wordIdx) =>
        token
          .split('')
          .map((ch, i) => (wordIdx === 0 && i === 0 ? ch : /[a-zA-Z]/.test(ch) ? '_' : ch))
          .join(''),
      )
      .join(' ')
  }, [word.lemma])

  useEffect(() => {
    inputRef.current?.focus()
    startedAt.current = Date.now()
    setValue('')
    setHints(0)
    setSubmitted(null)
  }, [word.lemma])

  useEffect(() => {
    if (submitted) nextBtnRef.current?.focus()
  }, [submitted])

  function submit() {
    if (submitted) return
    const responseTimeMs = Date.now() - startedAt.current
    const { isCorrect, isTypo } = compareAnswer(value, word.lemma)

    let quality: Quality
    if (isCorrect) {
      if (hints > 0) quality = 3
      else quality = responseTimeMs <= FAST_MS ? 5 : 4
    } else if (isTypo) {
      quality = 2
    } else {
      quality = 1
    }

    const result: FillInBlankResult = {
      quality,
      wasCorrect: isCorrect,
      responseTimeMs,
      userInput: value,
    }
    setSubmitted(result)

    if (settings?.soundEnabled) {
      if (isCorrect) playDing()
      else playBuzz()
    }
    if (settings?.vibrationsEnabled) vibrate(isCorrect ? 12 : [8, 40, 8])
  }

  function onKey(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (submitted) onDone(submitted)
    else submit()
  }

  return (
    <motion.div
      key={word.lemma}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-2xl"
      onKeyDown={onKey}
      tabIndex={-1}
    >
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
        <span>
          {index} of {total}
        </span>
        <span>Recall</span>
      </div>

      <div className="card space-y-6">
        {/* ---- The prompt: meaning only ---------------------------------- */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <LevelBadge level={word.level} />
            <Badge tone="neutral">{word.partOfSpeech}</Badge>
          </div>
          <p className="text-xl leading-snug text-text">{word.definitionEn}</p>
          <p className="mt-3 text-sm text-text-subtle">
            Which word or expression is this?
          </p>
        </div>

        {/* ---- Hints, in increasing order of generosity ------------------ */}
        {!submitted && (
          <div className="space-y-3">
            {hints >= 1 && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-lg tracking-[0.2em] text-text-muted"
              >
                {shapeHint}
              </motion.p>
            )}
            {hints >= 2 && sentenceHint && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border-hair border-border-subtle bg-bg-subtle px-4 py-3 text-base italic leading-relaxed text-text-muted"
              >
                “{sentenceHint}”
              </motion.p>
            )}

            {hints < (sentenceHint ? 2 : 1) && (
              <button
                type="button"
                onClick={() => setHints((n) => n + 1)}
                className="btn-quiet -ml-4"
              >
                <Eye size={16} />
                {hints === 0 ? 'Give me the shape' : 'Show it in a sentence'}
                <span className="text-text-subtle">· caps the grade</span>
              </button>
            )}
          </div>
        )}

        {/* ---- Answer ----------------------------------------------------- */}
        <div className="answer-row">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={!!submitted}
            placeholder="Type the word…"
            className={`input text-lg ${submitted ? 'opacity-70' : ''}`}
            {...noAutofill}
          />
          {!submitted ? (
            <button
              onClick={submit}
              disabled={!value.trim()}
              className="btn-primary disabled:opacity-40"
            >
              Check
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

        {/* ---- Result ----------------------------------------------------- */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`overflow-hidden rounded-xl border-hair px-4 py-3 ${
                submitted.wasCorrect
                  ? 'border-success/40 bg-success/8'
                  : submitted.quality === 2
                    ? 'border-warning/40 bg-warning/8'
                    : 'border-danger/40 bg-danger/8'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-text">
                  {submitted.wasCorrect
                    ? hints > 0
                      ? 'Right — with help.'
                      : 'Right.'
                    : submitted.quality === 2
                      ? 'Almost — small spelling slip.'
                      : 'Not this time.'}
                </span>
                <span className="font-display text-lg font-semibold text-text">
                  {word.lemma}
                </span>
                {word.ipa && (
                  <span className="font-mono text-sm text-text-subtle">{word.ipa}</span>
                )}
                <button
                  type="button"
                  onClick={() => void speak(word.lemma)}
                  aria-label={`Hear ${word.lemma} pronounced`}
                  className="press flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg-subtle hover:text-text"
                >
                  <Volume2 size={16} />
                </button>
              </div>

              {word.fr && (
                <p className="mt-1.5 text-sm text-text-muted">{word.fr}</p>
              )}
              {word.examples?.[0] && (
                <p className="mt-2 text-sm italic text-text-muted">
                  “{word.examples[0].en}”
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <KeyHint>
        Press <Key>Enter</Key> to{submitted ? ' continue' : ' check'}.
      </KeyHint>
    </motion.div>
  )
}
