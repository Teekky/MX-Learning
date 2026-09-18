/**
 * Aussie — "Real-life context" for one fixed part (Part 1, Part 2, …).
 *
 * Same idea as the app's Fill-in-the-blank exercise, but scoped to a
 * single Aussie domain part: the word's own example sentence is blanked
 * out and the learner types the missing word. Where the multiple-choice
 * quiz tests recognition ("which definition matches?"), this tests
 * production in context — closer to actually hearing the word on site.
 *
 * Entirely local: it reuses each word's hand-written example, no AI call.
 * Independent of "Learn the words" and "Take the quiz" — finishing a part
 * here adds its words to the main deck regardless of whether they were
 * seen elsewhere first.
 */

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAussieDomain } from '@/data/aussie/domains'
import { aussiePartCount, aussiePartWords } from '@/utils/aussieParts'
import { addManyToDeck } from '@/db/words'
import { recordAussiePartResult } from '@/utils/aussieProgress'
import { recordReview } from '@/utils/dailyLog'
import { shuffled } from '@/utils/shuffle'
import { compareAnswer } from '@/utils/strings'
import { maskLemma } from '@/modules/practice/fillInBlank'
import { speak } from '@/audio/tts'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import { useAppStore } from '@/store/useAppStore'
import { Key, KeyHint } from '@/components/ui'
import { noAutofill } from '@/utils/noAutofill'
import type { AussieDomain, AussieWordSeed } from '@/types'

const XP_CORRECT = 6
const XP_TYPO = 3
const XP_WRONG = 1

interface Drill {
  word: AussieWordSeed
  masked: string
  expected: string
}

function buildDrill(word: AussieWordSeed): Drill {
  const example = word.examples[0]?.en ?? `This uses "${word.lemma}".`
  const { masked, expected } = maskLemma(example, word.lemma)
  return { word, masked, expected }
}

export function AussieContextSession() {
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

  return <ContextBody domain={domain} partIndex={idx} />
}

type Phase =
  | {
      kind: 'running'
      drills: Drill[]
      index: number
      value: string
      submitted: null | { isCorrect: boolean; isTypo: boolean; startedAt: number }
      correctSoFar: number
      xpSoFar: number
    }
  | { kind: 'done'; total: number; correct: number; xp: number }

function buildInitialPhase(words: AussieWordSeed[]): Phase {
  return {
    kind: 'running',
    drills: shuffled(words).map(buildDrill),
    index: 0,
    value: '',
    submitted: null,
    correctSoFar: 0,
    xpSoFar: 0,
  }
}

function ContextBody({ domain, partIndex }: { domain: AussieDomain; partIndex: number }) {
  const navigate = useNavigate()
  const words = aussiePartWords(domain, partIndex)
  const partCount = aussiePartCount(domain)
  const [phase, setPhase] = useState<Phase>(() => buildInitialPhase(words))
  const startedAtRef = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)

  useEffect(() => {
    if (phase.kind !== 'running') return
    startedAtRef.current = Date.now()
    if (!phase.submitted) setTimeout(() => inputRef.current?.focus(), 0)
    else setTimeout(() => nextBtnRef.current?.focus(), 0)
  }, [phase])

  async function submit() {
    if (phase.kind !== 'running' || phase.submitted || !phase.value.trim()) return
    const drill = phase.drills[phase.index]
    const { isCorrect, isTypo } = compareAnswer(phase.value, drill.expected)
    const xp = isCorrect ? XP_CORRECT : isTypo ? XP_TYPO : XP_WRONG

    if (isCorrect) registerCorrect()
    else registerWrong()
    if (settings?.soundEnabled) (isCorrect ? playDing : playBuzz)()
    if (settings?.vibrationsEnabled) vibrate(isCorrect ? 12 : [8, 40, 8])

    await addXp(xp)
    incrementReviews()
    if (stats) {
      const dailyLog = await recordReview({
        xp,
        wasCorrect: isCorrect,
        timeSpentSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        dailyGoalXp: stats.dailyGoalXp,
      })
      await notifyDailyLog(dailyLog)
    }

    setPhase({
      ...phase,
      submitted: { isCorrect, isTypo, startedAt: startedAtRef.current },
      correctSoFar: phase.correctSoFar + (isCorrect ? 1 : 0),
      xpSoFar: phase.xpSoFar + xp,
    })
  }

  async function finish() {
    if (phase.kind !== 'running') return
    await addManyToDeck(
      words.map(({ icon: _icon, ...rest }) => ({ ...rest, source: 'user' as const })),
    )
    await recordAussiePartResult(domain.id, 'context', partIndex, phase.correctSoFar)
    setPhase({ kind: 'done', total: phase.drills.length, correct: phase.correctSoFar, xp: phase.xpSoFar })
  }

  function next() {
    if (phase.kind !== 'running' || !phase.submitted) return
    if (phase.index === phase.drills.length - 1) {
      void finish()
      return
    }
    setPhase({ ...phase, index: phase.index + 1, value: '', submitted: null })
  }

  function onKey(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (phase.kind !== 'running') return
    if (phase.submitted) next()
    else void submit()
  }

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
            Part {partIndex + 1} context round done: its words are in your deck for regular review.
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
          <button onClick={() => setPhase(buildInitialPhase(words))} className="btn-ghost">
            Retry this part
          </button>
          {hasNext && (
            <button
              onClick={() => navigate(`/aussie/${domain.id}/context/${partIndex + 1}`)}
              className="btn-primary"
            >
              Part {partIndex + 2} →
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  /* ----------------------------- Running ----------------------------- */
  const drill = phase.drills[phase.index]
  const total = phase.drills.length
  const progressPct = ((phase.index + 1) / total) * 100
  const submitted = phase.submitted

  const playSentence = () =>
    speak(drill.masked.replace(/_+/g, drill.word.lemma), {
      voiceURI: settings?.voiceURI,
      preferAustralian: settings?.aussieAccent ?? true,
      rate: settings?.voiceRate ?? 1,
      pitch: settings?.voicePitch ?? 1,
    })

  return (
    <div className="mx-auto max-w-2xl space-y-6" onKeyDown={onKey} tabIndex={-1}>
      <Link
        to={`/aussie/${domain.id}`}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        ← Back to domain
      </Link>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
          <span>
            {domain.name} · Context · Part {partIndex + 1} · {phase.index + 1} / {total}
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

      <div className="card space-y-6">
        <div className="flex items-start justify-between gap-4">
          <p className="font-display text-xl leading-relaxed text-text">{drill.masked}</p>
          <button
            onClick={playSentence}
            aria-label="Play sentence"
            title="Play sentence"
            className="shrink-0 rounded-full border border-border bg-bg-subtle px-3 py-2 text-text-muted transition-all hover:border-accent/50 hover:text-text"
          >
            ▶
          </button>
        </div>

        <div className="answer-row">
          <input
            ref={inputRef}
            value={phase.value}
            onChange={(e) => setPhase({ ...phase, value: e.target.value })}
            readOnly={!!submitted}
            placeholder="Type the missing word…"
            className={`input text-lg ${submitted ? 'opacity-70' : ''}`}
            {...noAutofill}
          />
          {!submitted ? (
            <button
              onClick={submit}
              disabled={!phase.value.trim()}
              className="btn-primary disabled:opacity-40"
            >
              Submit
            </button>
          ) : (
            <button ref={nextBtnRef} onClick={next} className="btn-primary">
              {phase.index === total - 1 ? 'See part results →' : 'Next →'}
            </button>
          )}
        </div>

        {submitted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`overflow-hidden rounded-xl border px-4 py-3 text-sm ${
              submitted.isCorrect
                ? 'border-success/30 bg-success/5 text-text'
                : submitted.isTypo
                  ? 'border-warning/30 bg-warning/5 text-text'
                  : 'border-danger/30 bg-danger/5 text-text'
            }`}
          >
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <span
                className={
                  submitted.isCorrect
                    ? 'text-success'
                    : submitted.isTypo
                      ? 'text-warning'
                      : 'text-danger'
                }
              >
                {submitted.isCorrect ? '✓' : submitted.isTypo ? '~' : '✗'}
              </span>
              <span>
                {submitted.isCorrect
                  ? 'Correct.'
                  : submitted.isTypo
                    ? 'Almost, tiny typo.'
                    : 'Not quite.'}
              </span>
            </div>
            {!submitted.isCorrect && (
              <p className="text-text-muted">
                Expected: <strong className="text-text">{drill.expected}</strong>
                {drill.word.fr && (
                  <>
                    {' '}
                    · <span className="italic">« {drill.word.fr} »</span>
                  </>
                )}
              </p>
            )}
            <p className="mt-1 text-text-muted">
              <span className="text-text-subtle">Meaning:</span> {drill.word.definitionEn}
            </p>
          </motion.div>
        )}
      </div>

      <KeyHint>
        Press <Key>Enter</Key> to{submitted ? ' continue' : ' submit'}.
      </KeyHint>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-subtle">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-text">{value}</div>
    </div>
  )
}
