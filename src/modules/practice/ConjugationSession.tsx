/**
 * Conjugation — irregular verb drills.
 *
 * Different from Grammar / Tenses: the unit of learning is the VERB.
 * The user picks an irregular verb, sees its 5 forms in a clean table
 * with example sentences, then drills 10 fill-in-the-blank exercises
 * that exercise all 5 forms in context.
 *
 * Bilingual content: English is always shown; when a French translation
 * is provided (note, example sentence, prompt, explanation), it appears
 * in accent colour right under the English version. No toggle.
 */

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recordReview } from '@/utils/dailyLog'
import { useAppStore } from '@/store/useAppStore'
import {
  FORM_LABELS,
  IRREGULAR_VERBS,
  type ConjugationDrill,
  type ExampleForForm,
  type IrregularVerb,
} from '@/data/irregularVerbs'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { shuffled } from '@/utils/shuffle'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import type { Level } from '@/types'

const LS_BEST_PREFIX = 'mx:conjugation-best:'

const LEVEL_ORDER: Record<Level, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
}

type Phase =
  | { kind: 'pick' }
  | { kind: 'read'; verb: IrregularVerb }
  | {
      kind: 'drill'
      verb: IrregularVerb
      /** Drills shuffled per-attempt to vary the order across retries. */
      drills: ConjugationDrill[]
      index: number
      revealed: boolean
      typed: string
      correctSoFar: number
      xpSoFar: number
      startedAt: number
    }
  | {
      kind: 'done'
      verb: IrregularVerb
      total: number
      correct: number
      xp: number
      seconds: number
    }

export function ConjugationSession() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })
  const [bestByVerb, setBestByVerb] = useState<Record<string, number>>(() =>
    readBestScores(),
  )

  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)

  function pickVerb(verb: IrregularVerb) {
    setPhase({ kind: 'read', verb })
  }

  function startDrills(verb: IrregularVerb) {
    setPhase({
      kind: 'drill',
      verb,
      drills: shuffled(verb.drills),
      index: 0,
      revealed: false,
      typed: '',
      correctSoFar: 0,
      xpSoFar: 0,
      startedAt: Date.now(),
    })
  }

  async function submit(value: string) {
    if (phase.kind !== 'drill' || phase.revealed) return
    const drill = phase.drills[phase.index]
    const correct = matchesAnswer(value, drill.answer, drill.acceptedAnswers)
    const xp = correct ? 8 + LEVEL_ORDER[phase.verb.level] : 1

    if (correct) registerCorrect()
    else registerWrong()

    if (settings?.soundEnabled) {
      if (correct) playDing()
      else playBuzz()
    }
    if (settings?.vibrationsEnabled && !correct) vibrate(40)

    await addXp(xp)
    incrementReviews()
    if (stats) {
      const dailyLog = await recordReview({
        xp,
        wasCorrect: correct,
        timeSpentSeconds: 8,
        dailyGoalXp: stats.dailyGoalXp,
      })
      await notifyDailyLog(dailyLog)
    }

    setPhase({
      ...phase,
      revealed: true,
      typed: value,
      correctSoFar: phase.correctSoFar + (correct ? 1 : 0),
      xpSoFar: phase.xpSoFar + xp,
    })
  }

  function next() {
    if (phase.kind !== 'drill') return
    if (!phase.revealed) return
    const isLast = phase.index === phase.drills.length - 1
    if (isLast) {
      const seconds = Math.round((Date.now() - phase.startedAt) / 1000)
      const prevBest = bestByVerb[phase.verb.id] ?? 0
      const score = phase.correctSoFar
      if (score > prevBest) {
        const updated = { ...bestByVerb, [phase.verb.id]: score }
        setBestByVerb(updated)
        try {
          localStorage.setItem(LS_BEST_PREFIX + phase.verb.id, String(score))
        } catch {
          /* ignore */
        }
      }
      setPhase({
        kind: 'done',
        verb: phase.verb,
        total: phase.drills.length,
        correct: phase.correctSoFar,
        xp: phase.xpSoFar,
        seconds,
      })
      return
    }
    setPhase({ ...phase, index: phase.index + 1, revealed: false, typed: '' })
  }

  /**
   * Press Enter to advance once an answer has been revealed. The
   * fill-blank input is `disabled` post-reveal, so its own Enter handler
   * cannot fire and conflict with this global listener.
   */
  useEffect(() => {
    if (phase.kind !== 'drill' || !phase.revealed) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' &&
            (target as HTMLInputElement).disabled === false))
      ) {
        return
      }
      e.preventDefault()
      next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind === 'drill' && phase.revealed, phase.kind === 'drill' ? phase.index : -1])

  /* ============================== Render ============================== */

  if (phase.kind === 'pick') {
    return (
      <PickPanel
        userLevel={stats?.cefrLevel}
        bestByVerb={bestByVerb}
        onPick={pickVerb}
      />
    )
  }

  if (phase.kind === 'read') {
    return (
      <ReadPanel
        verb={phase.verb}
        onStart={() => startDrills(phase.verb)}
        onBack={() => setPhase({ kind: 'pick' })}
      />
    )
  }

  if (phase.kind === 'done') {
    return (
      <DonePanel
        verb={phase.verb}
        total={phase.total}
        correct={phase.correct}
        xp={phase.xp}
        seconds={phase.seconds}
        onAnother={() => setPhase({ kind: 'pick' })}
        onRetry={() => startDrills(phase.verb)}
        onBackToPractice={() => navigate('/practice')}
      />
    )
  }

  /* ----------------------------- Drilling ----------------------------- */
  const drill = phase.drills[phase.index]
  const total = phase.drills.length
  const progress = ((phase.index + 1) / total) * 100

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
          <span>
            {phase.verb.base.toUpperCase()} · {phase.index + 1} / {total}
          </span>
          <span>+{phase.xpSoFar} XP</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      <DrillCard
        drill={drill}
        revealed={phase.revealed}
        currentTyped={phase.typed}
        verbBase={phase.verb.base}
        onSubmit={(v) => void submit(v)}
      />

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!phase.revealed}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase.index === total - 1 ? 'See my score →' : 'Next sentence →'}
        </button>
      </div>
    </div>
  )
}

/* =========================== Pick panel ============================ */

function PickPanel({
  userLevel,
  bestByVerb,
  onPick,
}: {
  userLevel?: Level
  bestByVerb: Record<string, number>
  onPick: (verb: IrregularVerb) => void
}) {
  const allowed = userLevel ? new Set(allowedLevelsFor(userLevel)) : null
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  const filtered = IRREGULAR_VERBS.filter((v) => {
    if (!q) return true
    return (
      v.base.toLowerCase().includes(q) ||
      v.past.toLowerCase().includes(q) ||
      v.pastParticiple.toLowerCase().includes(q) ||
      v.meaningFr.toLowerCase().includes(q) ||
      v.level.toLowerCase() === q
    )
  })

  // Mastered verbs (10/10) drop to the bottom; everything else stays alpha by base.
  const sorted = filtered.slice().sort((a, b) => {
    const aMastered = (bestByVerb[a.id] ?? 0) >= a.drills.length
    const bMastered = (bestByVerb[b.id] ?? 0) >= b.drills.length
    if (aMastered !== bMastered) return aMastered ? 1 : -1
    return a.base.localeCompare(b.base)
  })

  // Catalogue progression metrics (full list, not search-filtered).
  const totalVerbs = IRREGULAR_VERBS.length
  const triedVerbs = IRREGULAR_VERBS.filter(
    (v) => bestByVerb[v.id] != null,
  ).length
  const masteredVerbs = IRREGULAR_VERBS.filter(
    (v) => (bestByVerb[v.id] ?? 0) >= v.drills.length,
  ).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
            Conjugation
          </h1>
          <p className="text-text-muted">
            Pick an irregular verb. We'll show its 5 forms first, then drill 10
            sentences where you have to put the right form in the blank.
          </p>
        </div>

        {/* Catalogue progression */}
        <div className="card flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-text-subtle">Tried </span>
              <strong className="text-text">{triedVerbs}</strong>
              <span className="text-text-subtle"> / {totalVerbs}</span>
            </div>
            <div>
              <span className="text-text-subtle">Mastered </span>
              <strong className="text-success">{masteredVerbs}</strong>
              <span className="text-text-subtle"> / {totalVerbs}</span>
            </div>
          </div>
          <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-bg-subtle">
            <motion.div
              className="h-full rounded-full bg-success"
              initial={false}
              animate={{
                width: `${(masteredVerbs / Math.max(1, totalVerbs)) * 100}%`,
              }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${IRREGULAR_VERBS.length} verbs by base, past, French meaning, or level…`}
          className="input w-full"
          autoComplete="off"
          spellCheck={false}
        />
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-subtle/40 p-8 text-center text-sm text-text-muted">
          No verb matches "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {sorted.map((v) => {
            const inRange = !allowed || allowed.has(v.level)
            const best = bestByVerb[v.id]
            const mastered = best != null && best >= v.drills.length
            return (
              <motion.button
                key={v.id}
                type="button"
                onClick={() => onPick(v)}
                whileHover={{ y: -2 }}
                className={
                  'card text-left transition-all ' +
                  (mastered ? 'border-success/40 bg-success/5 ' : '') +
                  (inRange ? '' : 'opacity-60')
                }
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-text">
                    {v.base}
                    {mastered && (
                      <span className="ml-2 text-success" aria-label="Mastered">
                        ✓
                      </span>
                    )}
                  </h3>
                  <LevelBadge level={v.level} />
                </div>
                <p className="mt-1 text-sm text-accent">{v.meaningFr}</p>
                <p className="mt-2 font-mono text-[11px] text-text-subtle">
                  {v.past} · {v.pastParticiple}
                </p>
                {best != null && (
                  <div className="mt-2 text-xs font-medium text-success">
                    {mastered ? 'Mastered ' : 'Best: '}
                    {best}/{v.drills.length}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* =========================== Read panel ============================ */

function ReadPanel({
  verb,
  onStart,
  onBack,
}: {
  verb: IrregularVerb
  onStart: () => void
  onBack: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        ← All verbs
      </button>

      <header className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {verb.base}
          </h1>
          <LevelBadge level={verb.level} />
        </div>
        <p className="text-text-muted">
          In French: <span className="text-accent">{verb.meaningFr}</span>
        </p>
      </header>

      {/* The 5 forms — the explanation phase */}
      <section className="card space-y-3">
        <div className="text-xs uppercase tracking-wider text-text-subtle">
          The 5 forms
        </div>
        <div className="space-y-1.5">
          <FormRow label={FORM_LABELS.base.en} value={verb.base} />
          <FormRow label={FORM_LABELS.past.en} value={verb.past} />
          <FormRow
            label={FORM_LABELS.pastParticiple.en}
            value={verb.pastParticiple}
          />
          <FormRow label={FORM_LABELS.gerund.en} value={verb.gerund} />
          <FormRow
            label={FORM_LABELS.thirdPerson.en}
            value={verb.thirdPerson}
          />
        </div>
        {verb.note && (
          <div className="space-y-1 rounded-lg bg-bg-subtle px-3 py-2 text-xs">
            <p className="text-text-muted">{verb.note}</p>
            {verb.noteFr && <p className="text-accent">{verb.noteFr}</p>}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-text-subtle">
          One sentence per form
        </div>
        <div className="space-y-2">
          {verb.examples.map((ex, i) => (
            <ExampleRow key={i} example={ex} />
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={onStart} className="btn-primary">
          Start the 10 drills →
        </button>
      </div>
    </div>
  )
}

function FormRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-1.5 last:border-0">
      <span className="text-xs uppercase tracking-wider text-text-subtle">
        {label}
      </span>
      <span className="font-mono text-base font-semibold text-text">
        {value}
      </span>
    </div>
  )
}

function ExampleRow({ example }: { example: ExampleForForm }) {
  return (
    <div className="card space-y-1 py-3">
      <div className="text-[10px] uppercase tracking-wider text-text-subtle">
        {FORM_LABELS[example.form].en}
      </div>
      <p className="font-display text-base text-text">{example.sentence}</p>
      {example.sentenceFr && (
        <p className="text-sm text-accent">{example.sentenceFr}</p>
      )}
    </div>
  )
}

/* =========================== Drill card ============================ */

function DrillCard({
  drill,
  revealed,
  currentTyped,
  verbBase,
  onSubmit,
}: {
  drill: ConjugationDrill
  revealed: boolean
  currentTyped: string
  verbBase: string
  onSubmit: (value: string) => void
}) {
  const [draft, setDraft] = useState(currentTyped)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(currentTyped)
    inputRef.current?.focus()
  }, [drill.prompt, currentTyped])

  const [before, after] = splitOnBlank(drill.prompt)
  const matchesAnswer_ =
    revealed && matchesAnswer(draft, drill.answer, drill.acceptedAnswers)

  function commit() {
    if (revealed) return
    const value = draft.trim()
    if (!value) return
    onSubmit(value)
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-text-subtle">
        <span>Fill the blank</span>
        <span className="font-mono text-text-muted">
          verb: <span className="text-accent">{verbBase}</span>
        </span>
      </div>
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
            autoComplete="off"
            spellCheck={false}
            className={
              'min-w-[110px] rounded-md border px-2 py-1 text-base font-display tracking-tight transition-colors ' +
              (revealed
                ? matchesAnswer_
                  ? 'border-success bg-success/10 text-text'
                  : 'border-error bg-error/10 text-text'
                : 'border-border bg-bg-subtle text-text focus:border-accent focus:outline-none')
            }
            style={{ width: `${Math.max(draft.length + 2, 8)}ch` }}
          />
        </span>
        {after}
      </p>
      {drill.promptFr && (
        <p className="font-display text-base text-accent">{drill.promptFr}</p>
      )}
      {!revealed && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-subtle">
            Press Enter or click Submit.
          </p>
          <button
            type="button"
            onClick={commit}
            disabled={draft.trim().length === 0}
            className="btn-ghost text-sm disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      )}
      {revealed && !matchesAnswer_ && (
        <div className="text-xs text-text-muted">
          Expected:{' '}
          <span className="font-semibold text-success">{drill.answer}</span>
          {drill.acceptedAnswers && drill.acceptedAnswers.length > 0 && (
            <span className="text-text-subtle">
              {' '}
              · also accepted: {drill.acceptedAnswers.join(', ')}
            </span>
          )}
        </div>
      )}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-1.5 rounded-lg bg-bg-subtle px-3 py-2 text-xs"
        >
          <p className="text-text-muted">{drill.explanation}</p>
          {drill.explanationFr && (
            <p className="text-accent">{drill.explanationFr}</p>
          )}
        </motion.div>
      )}
    </div>
  )
}

/* =========================== Done panel ============================ */

function DonePanel({
  verb,
  total,
  correct,
  xp,
  seconds,
  onAnother,
  onRetry,
  onBackToPractice,
}: {
  verb: IrregularVerb
  total: number
  correct: number
  xp: number
  seconds: number
  onAnother: () => void
  onRetry: () => void
  onBackToPractice: () => void
}) {
  const pct = Math.round((correct / Math.max(1, total)) * 100)
  const verdict =
    pct >= 90
      ? 'Mastered'
      : pct >= 70
        ? 'Solid'
        : pct >= 50
          ? 'Half-way there'
          : 'Worth another pass'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl space-y-6 text-center"
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-2xl shadow-accent/40">
        <span className="font-display text-4xl">✓</span>
      </div>
      <div>
        <h1 className="font-display text-3xl font-semibold">{verdict}</h1>
        <p className="mt-1 text-text-muted">
          {verb.base} · {verb.meaningFr}
        </p>
      </div>
      <div className="card grid grid-cols-3 gap-6">
        <SummaryStat label="Correct" value={`${correct} / ${total}`} />
        <SummaryStat label="XP earned" value={`+${xp}`} />
        <SummaryStat
          label="Time"
          value={
            seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds}s`
          }
        />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={onBackToPractice} className="btn-ghost">
          ← Practice menu
        </button>
        <button onClick={onAnother} className="btn-ghost">
          Try another verb
        </button>
        <button onClick={onRetry} className="btn-primary">
          Retry this verb
        </button>
      </div>
    </motion.div>
  )
}

/* ============================ helpers ============================== */

function readBestScores(): Record<string, number> {
  const out: Record<string, number> = {}
  if (typeof localStorage === 'undefined') return out
  for (const v of IRREGULAR_VERBS) {
    try {
      const raw = localStorage.getItem(LS_BEST_PREFIX + v.id)
      if (raw != null) {
        const n = Number(raw)
        if (Number.isFinite(n)) out[v.id] = n
      }
    } catch {
      /* ignore */
    }
  }
  return out
}

function matchesAnswer(
  draft: string,
  answer: string,
  accepted?: string[],
): boolean {
  const candidate = draft.trim().toLowerCase()
  if (!candidate) return false
  const list = [answer, ...(accepted ?? [])]
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(candidate)
}

function splitOnBlank(prompt: string): [string, string] {
  const idx = prompt.indexOf('___')
  if (idx === -1) return [prompt, '']
  return [prompt.slice(0, idx), prompt.slice(idx + 3)]
}

function LevelBadge({ level }: { level: Level }) {
  const color: Record<Level, string> = {
    A1: 'bg-success/10 text-success border-success/30',
    A2: 'bg-success/10 text-success border-success/30',
    B1: 'bg-accent/10 text-accent border-accent/30',
    B2: 'bg-accent/10 text-accent border-accent/30',
    C1: 'bg-warning/10 text-warning border-warning/30',
    C2: 'bg-warning/10 text-warning border-warning/30',
  }
  return (
    <span
      className={
        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' +
        color[level]
      }
    >
      {level}
    </span>
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
