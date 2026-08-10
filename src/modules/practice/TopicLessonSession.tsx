/**
 * Generic topic-lesson session — the shared engine for both the Grammar
 * and Tenses modules.
 *
 * Both modules share the same shape: a curated list of topics, each with
 * a rule + examples + drills. The user picks a topic, reads the lesson,
 * runs through the drills, and sees a score recap.
 *
 * Bilingual content: English is always shown; when a French translation
 * is provided (rule, blurb, prompt, explanation, example note), it
 * appears in accent colour right under the English version. No toggle —
 * always parallel.
 */

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recordReview } from '@/utils/dailyLog'
import { useAppStore } from '@/store/useAppStore'
import type { GrammarDrill, GrammarTopic } from '@/data/grammar'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { shuffled } from '@/utils/shuffle'
import { playBuzz, playDing, vibrate } from '@/audio/sfx'
import type { Level } from '@/types'
import { Key, KeyHint } from '@/components/ui'

const LEVEL_ORDER: Record<Level, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
}

export interface LessonConfig {
  /** Page title shown on the picker (e.g. "Grammar", "Tenses"). */
  title: string
  /** One-line blurb under the title. */
  blurb: string
  /** Topic dataset to drive the picker + lessons. */
  topics: GrammarTopic[]
  /**
   * localStorage key namespace — different per surface so Grammar's best
   * scores don't collide with Tenses'. Used as `${ns}-best:<topicId>`.
   */
  storageNamespace: string
}

type Answer = string | number | null

type Phase =
  | { kind: 'pick' }
  | { kind: 'read'; topic: GrammarTopic }
  | {
      kind: 'drill'
      topic: GrammarTopic
      /**
       * Drills shuffled per-attempt so a returning user doesn't see the
       * same order. The original `topic.drills` is left untouched.
       */
      drills: GrammarDrill[]
      index: number
      answers: Answer[]
      revealed: boolean
      correctSoFar: number
      xpSoFar: number
      startedAt: number
    }
  | {
      kind: 'done'
      topic: GrammarTopic
      total: number
      correct: number
      xp: number
      seconds: number
    }

export function TopicLessonSession({ config }: { config: LessonConfig }) {
  const navigate = useNavigate()
  const lsBestPrefix = `${config.storageNamespace}-best:`

  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })
  const [bestByTopic, setBestByTopic] = useState<Record<string, number>>(() =>
    readBestScores(config.topics, lsBestPrefix),
  )

  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)

  function pickTopic(topic: GrammarTopic) {
    setPhase({ kind: 'read', topic })
  }

  function startDrills(topic: GrammarTopic) {
    const drills = shuffled(topic.drills)
    setPhase({
      kind: 'drill',
      topic,
      drills,
      index: 0,
      answers: Array(drills.length).fill(null),
      revealed: false,
      correctSoFar: 0,
      xpSoFar: 0,
      startedAt: Date.now(),
    })
  }

  async function submit(value: number | string) {
    if (phase.kind !== 'drill' || phase.revealed) return
    const drill = phase.drills[phase.index]
    const correct = isCorrect(drill, value)
    const xp = correct ? 8 + LEVEL_ORDER[phase.topic.level] : 1

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
        timeSpentSeconds: 6,
        dailyGoalXp: stats.dailyGoalXp,
      })
      await notifyDailyLog(dailyLog)
    }

    setPhase({
      ...phase,
      answers: phase.answers.map((a, i) => (i === phase.index ? value : a)),
      revealed: true,
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
      const prevBest = bestByTopic[phase.topic.id] ?? 0
      const score = phase.correctSoFar
      if (score > prevBest) {
        const updated = { ...bestByTopic, [phase.topic.id]: score }
        setBestByTopic(updated)
        try {
          localStorage.setItem(lsBestPrefix + phase.topic.id, String(score))
        } catch {
          /* ignore */
        }
      }
      setPhase({
        kind: 'done',
        topic: phase.topic,
        total: phase.drills.length,
        correct: phase.correctSoFar,
        xp: phase.xpSoFar,
        seconds,
      })
      return
    }
    setPhase({ ...phase, index: phase.index + 1, revealed: false })
  }

  /**
   * Press Enter to advance to the next drill once an answer has been
   * revealed. Skipped while typing in the fill-blank input (the input
   * is `disabled` after reveal, so its own Enter handler can't fire).
   */
  useEffect(() => {
    if (phase.kind !== 'drill' || !phase.revealed) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      // Don't trigger if the user is mid-typing in any other live input.
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
        title={config.title}
        blurb={config.blurb}
        topics={config.topics}
        userLevel={stats?.cefrLevel}
        bestByTopic={bestByTopic}
        onPick={pickTopic}
      />
    )
  }

  if (phase.kind === 'read') {
    return (
      <ReadPanel
        topic={phase.topic}
        onStart={() => startDrills(phase.topic)}
        onBack={() => setPhase({ kind: 'pick' })}
      />
    )
  }

  if (phase.kind === 'done') {
    return (
      <DonePanel
        topic={phase.topic}
        total={phase.total}
        correct={phase.correct}
        xp={phase.xp}
        seconds={phase.seconds}
        onAnother={() => setPhase({ kind: 'pick' })}
        onRetry={() => startDrills(phase.topic)}
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
            {phase.topic.name} · {phase.index + 1} / {total}
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
        currentAnswer={phase.answers[phase.index]}
        onSubmit={(v) => void submit(v)}
      />

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!phase.revealed}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase.index === total - 1 ? 'See my score →' : 'Next drill →'}
        </button>
      </div>
    </div>
  )
}

/* =========================== Pick panel ============================ */

function PickPanel({
  title,
  blurb,
  topics,
  userLevel,
  bestByTopic,
  onPick,
}: {
  title: string
  blurb: string
  topics: GrammarTopic[]
  userLevel?: Level
  bestByTopic: Record<string, number>
  onPick: (topic: GrammarTopic) => void
}) {
  const allowed = userLevel ? new Set(allowedLevelsFor(userLevel)) : null
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  const filtered = topics.filter((t) => {
    if (!q) return true
    return (
      t.name.toLowerCase().includes(q) ||
      (t.nameFr ?? '').toLowerCase().includes(q) ||
      t.blurb.toLowerCase().includes(q) ||
      (t.blurbFr ?? '').toLowerCase().includes(q) ||
      t.level.toLowerCase() === q
    )
  })

  // Mastered topics (10/10) drop to the bottom; everything else keeps level order.
  const sorted = filtered.slice().sort((a, b) => {
    const aMastered = (bestByTopic[a.id] ?? 0) >= a.drills.length
    const bMastered = (bestByTopic[b.id] ?? 0) >= b.drills.length
    if (aMastered !== bMastered) return aMastered ? 1 : -1
    return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
  })

  // Catalogue progression metrics (computed on full topics list, not search-filtered).
  const totalTopics = topics.length
  const triedTopics = topics.filter((t) => bestByTopic[t.id] != null).length
  const masteredTopics = topics.filter(
    (t) => (bestByTopic[t.id] ?? 0) >= t.drills.length,
  ).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-text-muted">{blurb}</p>
        </div>

        {/* Catalogue progression */}
        <div className="card flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-text-subtle">Tried </span>
              <strong className="text-text">{triedTopics}</strong>
              <span className="text-text-subtle"> / {totalTopics}</span>
            </div>
            <div>
              <span className="text-text-subtle">Mastered </span>
              <strong className="text-success">{masteredTopics}</strong>
              <span className="text-text-subtle"> / {totalTopics}</span>
            </div>
          </div>
          <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-bg-subtle">
            <motion.div
              className="h-full rounded-full bg-success"
              initial={false}
              animate={{
                width: `${(masteredTopics / Math.max(1, totalTopics)) * 100}%`,
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
          placeholder={`Search ${topics.length} topics by name, blurb, or level…`}
          className="input w-full"
          autoComplete="off"
          spellCheck={false}
        />
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-subtle/40 p-8 text-center text-sm text-text-muted">
          No topic matches "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sorted.map((t) => {
            const inRange = !allowed || allowed.has(t.level)
            const best = bestByTopic[t.id]
            const mastered = best != null && best >= t.drills.length
            return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              whileHover={{ y: -2 }}
              className={
                'card text-left transition-all ' +
                (mastered ? 'border-success/40 bg-success/5 ' : '') +
                (inRange ? '' : 'opacity-60')
              }
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-text">
                  {t.name}
                  {mastered && (
                    <span className="ml-2 text-success" aria-label="Mastered">
                      ✓
                    </span>
                  )}
                </h3>
                <LevelBadge level={t.level} />
              </div>
              <p className="mt-1.5 text-sm text-text-muted">{t.blurb}</p>
              {t.blurbFr && (
                <p className="mt-0.5 text-sm text-accent">{t.blurbFr}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-text-subtle">
                <span>{t.drills.length} drills</span>
                {best != null && (
                  <span className={'font-medium ' + (mastered ? 'text-success' : 'text-success')}>
                    {mastered ? 'Mastered ' : 'Best: '}
                    {best}/{t.drills.length}
                  </span>
                )}
              </div>
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
  topic,
  onStart,
  onBack,
}: {
  topic: GrammarTopic
  onStart: () => void
  onBack: () => void
}) {
  // Pair-by-paragraph alignment: split rule and ruleFr on `\n\n`. We
  // show each EN paragraph followed by its FR sibling in accent colour.
  // If the counts differ, we fall back to whichever side has content.
  const enParas = topic.rule.split(/\n\n+/)
  const frParas = topic.ruleFr ? topic.ruleFr.split(/\n\n+/) : []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        ← All topics
      </button>

      <header className="space-y-1">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {topic.name}
          </h1>
          <LevelBadge level={topic.level} />
        </div>
        <p className="text-text-muted">{topic.blurb}</p>
        {topic.blurbFr && (
          <p className="text-accent">{topic.blurbFr}</p>
        )}
      </header>

      <section className="card space-y-4">
        <div className="text-xs uppercase tracking-wider text-text-subtle">
          The rule
        </div>
        <div className="space-y-4 text-sm leading-relaxed">
          {enParas.map((para, i) => (
            <div key={i} className="space-y-1.5">
              <p
                className="text-text"
                dangerouslySetInnerHTML={{ __html: renderMarkdownLite(para) }}
              />
              {frParas[i] && (
                <p
                  className="text-accent"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownLite(frParas[i]),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-text-subtle">
          Examples
        </div>
        <div className="space-y-2">
          {topic.examples.map((ex, i) => (
            <div key={i} className="card space-y-1 py-3">
              <p className="text-base text-text">{ex.en}</p>
              {ex.fr && <p className="text-sm text-accent">{ex.fr}</p>}
              {ex.note && (
                <p className="text-xs italic text-text-subtle">{ex.note}</p>
              )}
              {ex.noteFr && (
                <p className="text-xs italic text-accent">{ex.noteFr}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={onStart} className="btn-primary">
          Start drilling →
        </button>
      </div>
    </div>
  )
}

/* =========================== Drill card ============================ */

function DrillCard({
  drill,
  revealed,
  currentAnswer,
  onSubmit,
}: {
  drill: GrammarDrill
  revealed: boolean
  currentAnswer: Answer
  onSubmit: (value: number | string) => void
}) {
  return (
    <div className="card space-y-4">
      <div className="text-xs uppercase tracking-wider text-text-subtle">
        {typeLabel(drill.type)}
      </div>

      {drill.type === 'mcq' && (
        <ChoiceCard
          prompt={drill.prompt}
          promptFr={drill.promptFr}
          options={drill.options}
          answerIndex={drill.answer}
          chosen={typeof currentAnswer === 'number' ? currentAnswer : null}
          revealed={revealed}
          onPick={onSubmit}
        />
      )}
      {drill.type === 'spot-error' && (
        <ChoiceCard
          prompt={drill.prompt}
          promptFr={drill.promptFr}
          options={drill.options}
          answerIndex={drill.answer}
          chosen={typeof currentAnswer === 'number' ? currentAnswer : null}
          revealed={revealed}
          onPick={onSubmit}
        />
      )}
      {drill.type === 'fill' && (
        <FillCard
          prompt={drill.prompt}
          promptFr={drill.promptFr}
          answer={drill.answer}
          accepted={drill.acceptedAnswers}
          revealed={revealed}
          typed={typeof currentAnswer === 'string' ? currentAnswer : ''}
          onSubmit={onSubmit}
        />
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

function typeLabel(t: GrammarDrill['type']): string {
  switch (t) {
    case 'mcq':
      return 'Pick one'
    case 'fill':
      return 'Fill the blank'
    case 'spot-error':
      return 'Spot the error'
  }
}

function ChoiceCard({
  prompt,
  promptFr,
  options,
  answerIndex,
  chosen,
  revealed,
  onPick,
}: {
  prompt: string
  promptFr?: string
  options: string[]
  answerIndex: number
  chosen: number | null
  revealed: boolean
  onPick: (i: number) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-lg text-text">{prompt}</p>
        {promptFr && (
          <p className="mt-1 text-base text-accent">{promptFr}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isChosen = chosen === i
          const isCorrect = revealed && i === answerIndex
          const isWrong = revealed && isChosen && i !== answerIndex
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

function FillCard({
  prompt,
  promptFr,
  answer,
  accepted,
  revealed,
  typed,
  onSubmit,
}: {
  prompt: string
  promptFr?: string
  answer: string
  accepted?: string[]
  revealed: boolean
  typed: string
  onSubmit: (s: string) => void
}) {
  const [draft, setDraft] = useState(typed)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(typed)
    inputRef.current?.focus()
  }, [prompt, typed])

  const [before, after] = splitOnBlank(prompt)
  const matchesAnswer_ = revealed && matchesFill(draft, answer, accepted)

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
      {promptFr && (
        <p className="text-base text-accent">{promptFr}</p>
      )}
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
      {revealed && !matchesAnswer_ && (
        <div className="text-xs text-text-muted">
          Expected:{' '}
          <span className="font-semibold text-success">{answer || '(empty)'}</span>
          {accepted && accepted.length > 0 && (
            <span className="text-text-subtle">
              {' '}
              · also accepted: {accepted.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* =========================== Done panel ============================ */

function DonePanel({
  topic,
  total,
  correct,
  xp,
  seconds,
  onAnother,
  onRetry,
  onBackToPractice,
}: {
  topic: GrammarTopic
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
        <p className="mt-1 text-text-muted">{topic.name}</p>
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
          Try another topic
        </button>
        <button onClick={onRetry} className="btn-primary">
          Retry this topic
        </button>
      </div>
    </motion.div>
  )
}

/* ============================ helpers ============================== */

function readBestScores(
  topics: GrammarTopic[],
  prefix: string,
): Record<string, number> {
  const out: Record<string, number> = {}
  if (typeof localStorage === 'undefined') return out
  for (const t of topics) {
    try {
      const raw = localStorage.getItem(prefix + t.id)
      if (raw != null) {
        const n = Number(raw)
        if (Number.isFinite(n)) out[t.id] = n
      }
    } catch {
      /* ignore */
    }
  }
  return out
}

function isCorrect(drill: GrammarDrill, value: number | string): boolean {
  if (drill.type === 'fill') {
    return matchesFill(
      typeof value === 'string' ? value : '',
      drill.answer,
      drill.acceptedAnswers,
    )
  }
  return typeof value === 'number' && value === drill.answer
}

function matchesFill(
  draft: string,
  answer: string,
  accepted?: string[],
): boolean {
  const candidate = draft.trim().toLowerCase()
  if (!candidate) {
    if (answer === '') return true
    return false
  }
  const list = [answer, ...(accepted ?? [])]
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
  if (answer === '' && (accepted ?? []).length === 0) {
    return false
  }
  return list.includes(candidate)
}

function splitOnBlank(prompt: string): [string, string] {
  const idx = prompt.indexOf('___')
  if (idx === -1) return [prompt, '']
  return [prompt.slice(0, idx), prompt.slice(idx + 3)]
}

/**
 * Tiny markdown-lite renderer: only **bold** and *italic*.
 */
function renderMarkdownLite(s: string): string {
  const escaped = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*(\W|$)/g, '$1<em>$2</em>$3')
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
