/**
 * Learn from anything — turn any English content into an active lesson.
 *
 * Two entry modes (the user picks):
 *
 *   1. ONE WORD  — type a single word you don't fully understand. Mistral
 *      teaches it (definition, IPA, French translation, three calibrated
 *      example sentences, usage note), then drops you straight into a
 *      fill-in-the-blank exercise on that word.
 *
 *   2. PASTE TEXT — paste an article / email / Slack thread. Mistral
 *      extracts the words worth learning (with the original quoted
 *      sentence as context). You then practice them one by one, in the
 *      original context.
 *
 * Either way the flow is: CHOOSE → ANALYZING → TEACH → RUNNING → DONE.
 *
 * Persistence (the "deck as journal" model):
 *   Words start as TRANSIENT pairs (in-memory only). They become real
 *   deck rows the first time the user actually reviews them — mirroring
 *   the practiceProvider pattern used by the SRS modules. Bail mid-
 *   session and only the words you reached land in the deck. That's the
 *   point — the deck reflects engagement, not intent.
 *
 * Why teach BEFORE practicing:
 *   The previous version of this module just bulk-imported words into
 *   the deck with no learning step. That's not "learning from anything",
 *   it's "filling a list". The teach screen is where the actual lesson
 *   happens; the exercise is the discrimination test.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hasMistralKey } from '@/ai/mistral'
import { extractVocabulary, type ExtractedWord } from '@/ai/extractVocab'
import { teachWord, type TaughtWord } from '@/ai/teachWord'
import { db } from '@/db/database'
import {
  persistTransient,
  type PracticePair,
} from '@/db/practiceProvider'
import { newCard, scheduleNext } from '@/utils/fsrs'
import { xpForReview } from '@/utils/levels'
import { recordReview } from '@/utils/dailyLog'
import { useAppStore } from '@/store/useAppStore'
import { speak } from '@/audio/tts'
import type { FillInBlankResult } from './FillInBlankExercise'
import { RecallExercise } from './RecallExercise'
import { shuffled } from '@/utils/shuffle'
import type { Level, Review, Word } from '@/types'

const MAX_TEXT_CHARS = 6000

/**
 * Index of the example sentence withheld from the teaching card and saved
 * for the drill's second hint. `teachWord` returns three; showing two and
 * keeping one back means the hint is a sentence you have not already read.
 */
const HELD_BACK_EXAMPLE_INDEX = 2

type Mode = 'word' | 'text'

type State =
  | { kind: 'no-key' }
  | {
      kind: 'choose'
      mode: Mode
      wordInput: string
      textInput: string
      error: string | null
    }
  | { kind: 'analyzing'; mode: Mode }
  | {
      /** Mistral has produced content, the user previews before drilling. */
      kind: 'teach'
      mode: Mode
      pairs: PracticePair[]
      taught?: TaughtWord // word mode only — the rich teaching card
    }
  | {
      kind: 'running'
      mode: Mode
      pairs: PracticePair[]
      current: number
      correct: number
      xp: number
    }
  | {
      kind: 'done'
      mode: Mode
      total: number
      correct: number
      xp: number
      seconds: number
    }

export function ImportTextSession() {
  const navigate = useNavigate()
  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const addXp = useAppStore((s) => s.addXp)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)

  const [state, setState] = useState<State>(() =>
    hasMistralKey()
      ? {
          kind: 'choose',
          mode: 'word',
          wordInput: '',
          textInput: '',
          error: null,
        }
      : { kind: 'no-key' },
  )
  const [startedAt, setStartedAt] = useState(Date.now())

  /* ---------------------------- Analyze ---------------------------- */

  async function analyze() {
    if (state.kind !== 'choose') return
    const userLevel = stats?.cefrLevel ?? 'B1'

    if (state.mode === 'word') {
      const input = state.wordInput.trim()
      if (!input) {
        setState({ ...state, error: 'Type a word first.' })
        return
      }
      setState({ kind: 'analyzing', mode: 'word' })
      try {
        const taught = await teachWord(input, { userLevel })
        const pair = transientFromTaught(taught)
        setState({ kind: 'teach', mode: 'word', pairs: [pair], taught })
      } catch (err) {
        setState({ ...state, error: errMessage(err) })
      }
      return
    }

    // text mode
    const passage = state.textInput.trim()
    if (!passage) {
      setState({ ...state, error: 'Paste some English text first.' })
      return
    }
    setState({ kind: 'analyzing', mode: 'text' })
    try {
      const extracted = await extractVocabulary(passage, { userLevel })
      if (extracted.length === 0) {
        setState({
          ...state,
          error:
            "Couldn't find any words worth learning in that text. Try a richer or longer passage.",
        })
        return
      }
      const pairs = extracted.map(transientFromExtracted)
      setState({ kind: 'teach', mode: 'text', pairs })
    } catch (err) {
      setState({ ...state, error: errMessage(err) })
    }
  }

  function startPractice() {
    if (state.kind !== 'teach') return
    setStartedAt(Date.now())
    setState({
      kind: 'running',
      mode: state.mode,
      // Drilled in a different order than they were taught. Reading order
      // gives away the answer through position alone — the fourth word on
      // the teaching card is the fourth word you are asked about.
      pairs: state.pairs.length > 1 ? shuffled(state.pairs) : state.pairs,
      current: 0,
      correct: 0,
      xp: 0,
    })
  }

  /* ---------------------------- Review ----------------------------- */

  async function handleResult(r: FillInBlankResult) {
    if (state.kind !== 'running' || !stats) return
    const pair = state.pairs[state.current]

    // Materialise the deck row before scheduling — same pattern as the
    // SRS sessions. Transient pairs only become real Word + SRSCard
    // rows the moment the user actually reviews them.
    const live = pair.transient ? await persistTransient(pair) : pair

    const nextCard = scheduleNext(live.card, r.quality)
    await db.cards.put(nextCard)

    const review: Review = {
      cardId: live.card.id!,
      wordId: live.word.id!,
      timestamp: Date.now(),
      quality: r.quality,
      responseTimeMs: r.responseTimeMs,
      exerciseType: 'learn-from-text',
      wasCorrect: r.wasCorrect,
      userInput: r.userInput,
    }
    await db.reviews.add(review)

    const xpGained = xpForReview(r.quality, live.card.difficultyScore)
    await addXp(xpGained)
    incrementReviews()
    if (r.wasCorrect) registerCorrect()
    else registerWrong()

    const dailyLog = await recordReview({
      xp: xpGained,
      wasCorrect: r.wasCorrect,
      timeSpentSeconds: Math.round(r.responseTimeMs / 1000),
      dailyGoalXp: stats.dailyGoalXp,
    })
    await notifyDailyLog(dailyLog)

    const next = state.current + 1
    if (next >= state.pairs.length) {
      setState({
        kind: 'done',
        mode: state.mode,
        total: state.pairs.length,
        correct: state.correct + (r.wasCorrect ? 1 : 0),
        xp: state.xp + xpGained,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      })
    } else {
      setState({
        ...state,
        current: next,
        correct: state.correct + (r.wasCorrect ? 1 : 0),
        xp: state.xp + xpGained,
      })
    }
  }

  /* ----------------------------- Render ---------------------------- */

  if (state.kind === 'no-key') {
    return (
      <Notice
        title="Mistral API key missing."
        body="Add VITE_MISTRAL_API_KEY to .env.local to use Learn from anything."
      />
    )
  }

  if (state.kind === 'choose') {
    return (
      <ChoosePanel
        mode={state.mode}
        wordInput={state.wordInput}
        textInput={state.textInput}
        error={state.error}
        onModeChange={(mode) =>
          setState({ ...state, mode, error: null })
        }
        onWordChange={(v) =>
          setState({ ...state, wordInput: v, error: null })
        }
        onTextChange={(v) =>
          setState({
            ...state,
            textInput: v.slice(0, MAX_TEXT_CHARS),
            error: null,
          })
        }
        onAnalyze={analyze}
      />
    )
  }

  if (state.kind === 'analyzing') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-xl space-y-5 py-16 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle">
          <span className="text-2xl text-accent">◐</span>
        </div>
        <h1 className="font-display text-2xl font-semibold">
          {state.mode === 'word'
            ? 'Looking up that word…'
            : 'Reading your passage…'}
        </h1>
        <p className="text-text-muted">
          {state.mode === 'word'
            ? 'Mistral is preparing your teaching card. One moment.'
            : "Mistral is picking out the words worth learning. One moment."}
        </p>
      </motion.div>
    )
  }

  if (state.kind === 'teach') {
    return (
      <TeachPanel
        mode={state.mode}
        pairs={state.pairs}
        taught={state.taught}
        speakRate={settings?.voiceRate ?? 1}
        speakPitch={settings?.voicePitch ?? 1}
        voiceURI={settings?.voiceURI}
        onStart={startPractice}
        onBack={() =>
          setState({
            kind: 'choose',
            mode: state.mode,
            wordInput: state.taught?.lemma ?? '',
            textInput: '',
            error: null,
          })
        }
      />
    )
  }

  if (state.kind === 'done') {
    return (
      <DonePanel
        state={state}
        onAnother={() =>
          setState({
            kind: 'choose',
            mode: state.mode,
            wordInput: '',
            textInput: '',
            error: null,
          })
        }
        onBack={() => navigate('/practice')}
      />
    )
  }

  /* state.kind === 'running' */
  const pair = state.pairs[state.current]
  return (
    <AnimatePresence mode="wait">
      {/* Recall, not fill-in-the-blank. The teaching card is thirty seconds
          old; blanking a sentence the learner has just read tests copying,
          not memory. Here the meaning is the prompt and the word is the
          answer — and the sentence is only available as a costed hint. */}
      <RecallExercise
        key={pair.key}
        word={pair.word}
        onDone={handleResult}
        index={state.current + 1}
        total={state.pairs.length}
        hiddenExampleIndex={HELD_BACK_EXAMPLE_INDEX}
      />
    </AnimatePresence>
  )
}

/* ============================ Choose panel ============================ */

function ChoosePanel({
  mode,
  wordInput,
  textInput,
  error,
  onModeChange,
  onWordChange,
  onTextChange,
  onAnalyze,
}: {
  mode: Mode
  wordInput: string
  textInput: string
  error: string | null
  onModeChange: (m: Mode) => void
  onWordChange: (v: string) => void
  onTextChange: (v: string) => void
  onAnalyze: () => void
}) {
  const canSubmit =
    mode === 'word' ? wordInput.trim().length > 0 : textInput.trim().length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <div>
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
          Learn from anything
        </h1>
        <p className="text-text-muted">
          Hand it a word you don't fully grasp, or a chunk of English you
          want to make your own. We'll teach it, then drill it.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-bg p-1">
        <ModeTab
          active={mode === 'word'}
          icon="◇"
          title="A single word"
          subtitle="Type a word you've seen but can't quite use yet."
          onClick={() => onModeChange('word')}
        />
        <ModeTab
          active={mode === 'text'}
          icon="◈"
          title="A piece of text"
          subtitle="Paste an article, an email, anything you want to digest."
          onClick={() => onModeChange('text')}
        />
      </div>

      {/* Input area */}
      {mode === 'word' ? (
        <div className="space-y-2">
          <input
            value={wordInput}
            onChange={(e) => onWordChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && wordInput.trim()) {
                e.preventDefault()
                onAnalyze()
              }
            }}
            placeholder="e.g. leverage, on the fly, accountability…"
            className="input w-full text-lg"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
          />
          <p className="text-xs text-text-subtle">
            Inflected forms are fine — "leveraged", "stakeholders" both work.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={textInput}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste English text here. The richer and more professional, the better — design articles, product docs, founder essays all work great."
            className="input min-h-[260px] w-full resize-y text-base leading-relaxed"
            autoFocus
          />
          <div className="flex items-center justify-between text-xs text-text-subtle">
            <span>
              {textInput.length.toLocaleString()} /{' '}
              {MAX_TEXT_CHARS.toLocaleString()} characters
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Link to="/practice" className="btn-ghost">
          ← Cancel
        </Link>
        <button
          onClick={onAnalyze}
          disabled={!canSubmit}
          className="btn-primary disabled:opacity-40"
        >
          {mode === 'word' ? 'Teach me' : 'Extract & drill'}
        </button>
      </div>
    </motion.div>
  )
}

function ModeTab({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean
  icon: string
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex flex-col items-start gap-1 rounded-xl px-4 py-3 text-left transition ' +
        (active
          ? 'bg-accent-subtle text-text shadow-sm'
          : 'text-text-muted hover:bg-bg-subtle hover:text-text')
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-base text-accent">{icon}</span>
        <span className="font-display text-base font-semibold">{title}</span>
      </div>
      <span className="text-xs text-text-subtle">{subtitle}</span>
    </button>
  )
}

/* ============================= Teach panel ============================= */

function TeachPanel({
  mode,
  pairs,
  taught,
  speakRate,
  speakPitch,
  voiceURI,
  onStart,
  onBack,
}: {
  mode: Mode
  pairs: PracticePair[]
  taught?: TaughtWord
  speakRate: number
  speakPitch: number
  voiceURI?: string
  onStart: () => void
  onBack: () => void
}) {
  // Capture-Enter to start practice for keyboard-only flow.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onStart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  if (mode === 'word' && taught) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl space-y-6"
      >
        <div className="card space-y-5">
          {/* Header: lemma + IPA + level */}
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-text">
              {taught.lemma}
            </h1>
            {taught.ipa && (
              <span className="text-sm text-text-subtle">{taught.ipa}</span>
            )}
            <button
              type="button"
              onClick={() =>
                speak(taught.lemma, {
                  voiceURI,
                  rate: speakRate,
                  pitch: speakPitch,
                })
              }
              aria-label="Pronounce"
              title="Pronounce"
              className="rounded-full border border-border bg-bg-subtle px-3 py-1 text-text-muted transition hover:border-accent/50 hover:text-text"
            >
              ▶
            </button>
            <span className="ml-auto flex items-center gap-2">
              <LevelBadge level={taught.level} />
              <span className="text-xs uppercase tracking-wider text-text-subtle">
                {taught.partOfSpeech}
              </span>
            </span>
          </div>

          {/* FR + definition */}
          <div className="space-y-1">
            <div className="text-lg text-accent">{taught.fr}</div>
            <div className="text-text-muted">{taught.definitionEn}</div>
          </div>

          {/* Examples */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-text-subtle">
              In context
            </div>
            {/* One example is deliberately withheld and kept for the drill's
                sentence hint — otherwise every hint is something you read a
                minute ago. */}
            {taught.examples.slice(0, HELD_BACK_EXAMPLE_INDEX).map((ex, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-bg-subtle/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    speak(ex.en, {
                      voiceURI,
                      rate: speakRate,
                      pitch: speakPitch,
                    })
                  }
                  aria-label="Play sentence"
                  className="mt-0.5 shrink-0 rounded-full border border-border bg-bg px-2 py-0.5 text-xs text-text-muted transition hover:border-accent/50 hover:text-text"
                >
                  ▶
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-text">{ex.en}</div>
                  {ex.fr && (
                    <div className="mt-0.5 text-xs italic text-text-subtle">
                      {ex.fr}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {taught.usageNote && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-text">
              <span className="text-xs uppercase tracking-wider text-accent">
                Usage
              </span>
              <div className="mt-0.5">{taught.usageNote}</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="btn-ghost">
            ← Look up another
          </button>
          <button onClick={onStart} className="btn-primary">
            Practice it →
          </button>
        </div>
        <p className="text-center text-xs text-text-subtle">
          Press <kbd className="rounded bg-bg-subtle px-1.5 py-0.5">Enter</kbd>{' '}
          to start.
        </p>
      </motion.div>
    )
  }

  // mode === 'text'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <div>
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
          {pairs.length} word{pairs.length === 1 ? '' : 's'} to drill
        </h1>
        <p className="text-text-muted">
          Each one comes from your text. Quick read-through, then we
          practice them one by one.
        </p>
      </div>

      <div className="space-y-2">
        {pairs.map((p) => (
          <div
            key={p.key}
            className="flex items-start gap-3 rounded-2xl border border-border bg-bg-subtle/40 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display text-base font-semibold text-text">
                  {p.word.lemma}
                </span>
                <LevelBadge level={p.word.level} />
                <span className="text-xs text-text-subtle">
                  {p.word.partOfSpeech}
                </span>
              </div>
              <div className="mt-0.5 text-sm text-text">
                {p.word.fr && <span className="text-accent">{p.word.fr}</span>}
                {p.word.fr && p.word.definitionEn && (
                  <span className="text-text-muted"> · </span>
                )}
                {p.word.definitionEn && (
                  <span className="text-text-muted">{p.word.definitionEn}</span>
                )}
              </div>
              {p.word.examples[0] && (
                <div className="mt-1 text-xs italic text-text-subtle">
                  "{p.word.examples[0].en}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="btn-ghost">
          ← Edit text
        </button>
        <button onClick={onStart} className="btn-primary">
          Start drilling →
        </button>
      </div>
      <p className="text-center text-xs text-text-subtle">
        Press <kbd className="rounded bg-bg-subtle px-1.5 py-0.5">Enter</kbd> to
        start.
      </p>
    </motion.div>
  )
}

/* ============================== Done panel ============================== */

function DonePanel({
  state,
  onAnother,
  onBack,
}: {
  state: Extract<State, { kind: 'done' }>
  onAnother: () => void
  onBack: () => void
}) {
  const allCorrect = state.correct === state.total
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl space-y-6 text-center"
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-2xl shadow-accent/40">
        <span className="font-display text-4xl">{allCorrect ? '◆' : '◓'}</span>
      </div>
      <h1 className="font-display text-3xl font-semibold">
        {state.mode === 'word' ? 'Lesson done.' : 'Drilled the lot.'}
      </h1>
      <p className="text-text-muted">
        {state.correct === state.total
          ? 'Nailed every one. They\'re saved in your deck for spaced review.'
          : `Saved in your deck — they'll come back via the SRS so the slips stick this time.`}
      </p>
      <div className="card grid grid-cols-3 gap-6">
        <Stat label="Correct" value={`${state.correct} / ${state.total}`} />
        <Stat label="XP earned" value={`+${state.xp}`} />
        <Stat label="Time" value={`${state.seconds}s`} />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={onBack} className="btn-ghost">
          Back to practice
        </button>
        <Link to="/deck" className="btn-ghost">
          View deck
        </Link>
        <button onClick={onAnother} className="btn-primary">
          {state.mode === 'word' ? 'Another word' : 'Another text'}
        </button>
      </div>
    </motion.div>
  )
}

/* ============================== Helpers ============================== */

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="mb-2 font-display text-2xl font-semibold">{title}</h1>
      <p className="mb-6 text-text-muted">{body}</p>
      <Link to="/practice" className="btn-ghost inline-flex">
        ← Back to practice menu
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
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

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

/* ----------- Build transient PracticePairs from AI output ----------- */

function transientFromTaught(t: TaughtWord): PracticePair {
  const now = Date.now()
  const word: Word = {
    lemma: t.lemma,
    partOfSpeech: t.partOfSpeech,
    level: t.level,
    ipa: t.ipa,
    fr: t.fr,
    definitionEn: t.definitionEn,
    tags: ['imported'],
    examples: t.examples,
    addedAt: now,
    source: 'user',
  }
  return {
    word,
    card: newCard(0, now),
    transient: true,
    key: `lfa:word:${t.lemma.toLowerCase()}`,
  }
}

function transientFromExtracted(e: ExtractedWord): PracticePair {
  const now = Date.now()
  const word: Word = {
    lemma: e.lemma,
    partOfSpeech: e.partOfSpeech,
    level: e.level,
    fr: e.fr,
    definitionEn: e.definitionEn,
    tags: ['imported'],
    examples: [{ en: e.exampleEn }],
    addedAt: now,
    source: 'user',
  }
  return {
    word,
    card: newCard(0, now),
    transient: true,
    key: `lfa:text:${e.lemma.toLowerCase()}`,
  }
}
