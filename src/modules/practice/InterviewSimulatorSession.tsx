/**
 * Interview Simulator — English interview practice for ANY role the user wants.
 *
 * Flow:
 *   1. SETUP   — user picks role (free text), optional company, round type.
 *                Presets are offered as chips for one-click starts.
 *   2. CHAT    — multi-turn interview. User types answers; "I need a moment"
 *                / clarifying questions are handled naturally by the AI.
 *   3. DONE    — Mistral coach returns overall impression, strengths,
 *                improvements, rating/10, and a next-focus hint.
 *
 * No FSRS — this is a free immersion mode. XP awarded per substantive answer
 * and a bonus on completion.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ChatMessage } from '@/ai/chat'
import { hasMistralKey } from '@/ai/mistral'
import {
  type CoachFeedback,
  type InterviewRound,
  type InterviewSetup,
  interviewCoach,
  interviewerOpener,
  interviewerReply,
  looksLikeInterruption,
} from '@/ai/interviewer'
import { recordReview } from '@/utils/dailyLog'
import { useAppStore } from '@/store/useAppStore'
import { isSTTSupported, startRecognition, type STTHandle } from '@/audio/stt'
import { KeyHint } from '@/components/ui'

const XP_PER_ANSWER = 4
const XP_COMPLETION_BONUS = 15 // on wrap-up

type Turn = {
  id: string
  role: 'interviewer' | 'candidate'
  text: string
  /** Candidate-only: flagged as a probable clarifying interruption. */
  wasInterruption?: boolean
}

type State =
  | { kind: 'no-key' }
  | { kind: 'setup' }
  | {
      kind: 'chatting'
      setup: InterviewSetup
      turns: Turn[]
      sending: boolean
      xp: number
      answerCount: number
      /** Set when the AI flags the most recent question as the last one. */
      atEndOfRound: boolean
      /** Error toast for the composer, if the last call failed. */
      error: string | null
      /** Mic state — mirror of AudioChatSession. */
      mic: 'idle' | 'listening'
      /** Editable composer content — filled by STT, corrected by the user. */
      draft: string
      /** True after a 'not-allowed' STT error — surface a hint in helper text. */
      permissionDenied: boolean
    }
  | {
      kind: 'grading'
      setup: InterviewSetup
      turns: Turn[]
      xp: number
      answerCount: number
    }
  | {
      kind: 'done'
      setup: InterviewSetup
      xp: number
      answerCount: number
      seconds: number
      feedback: CoachFeedback
    }

const ROUND_OPTIONS: { value: InterviewRound; label: string; blurb: string }[] =
  [
    {
      value: 'behavioral',
      label: 'Behavioral',
      blurb: 'Past experience, STAR-style stories, leadership, conflict.',
    },
    {
      value: 'technical',
      label: 'Technical',
      blurb: 'Case studies, critiques, trade-offs — spoken, not live coding.',
    },
    {
      value: 'culture',
      label: 'Culture / values',
      blurb: 'Motivation, work style, why this company, handling ambiguity.',
    },
    {
      value: 'mixed',
      label: 'Mixed round',
      blurb: 'A realistic blend — warm intro, behavioral + technical probes.',
    },
  ]

/** Quick-pick role chips (user can always type something else). */
const ROLE_PRESETS = [
  'Senior Product Designer',
  'UX/UI Designer',
  'Product Manager',
  'Frontend Engineer',
  'Data Analyst',
  'Marketing Manager',
  'Customer Success Manager',
  'Project Manager',
]

export function InterviewSimulatorSession() {
  const navigate = useNavigate()
  const addXp = useAppStore((s) => s.addXp)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)
  const stats = useAppStore((s) => s.stats)

  const [state, setState] = useState<State>(() =>
    hasMistralKey() ? { kind: 'setup' } : { kind: 'no-key' },
  )
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const recRef = useRef<STTHandle | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const sttSupported = useMemo(() => isSTTSupported(), [])

  /* Keep scroll pinned to bottom. */
  useEffect(() => {
    if (state.kind !== 'chatting' && state.kind !== 'grading') return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state])

  /* Focus input when we enter chatting. */
  useEffect(() => {
    if (state.kind === 'chatting') draftRef.current?.focus()
  }, [state.kind])

  /* Stop mic on unmount or when we leave the chatting phase. */
  useEffect(() => {
    return () => {
      recRef.current?.abort()
      recRef.current = null
    }
  }, [])

  /* Space = toggle mic (unless focused in an editable field). */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      const t = e.target as HTMLElement | null
      const editable =
        !!t &&
        (t.tagName === 'TEXTAREA' ||
          t.tagName === 'INPUT' ||
          (t as HTMLElement).isContentEditable)
      if (editable) return
      const s = stateRef.current
      if (s.kind !== 'chatting' || s.sending) return
      e.preventDefault()
      toggleMic()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------------------------- Microphone (STT) ------------------------- */
  function startListening() {
    const s = stateRef.current
    if (s.kind !== 'chatting' || s.sending) return

    setState({ ...s, mic: 'listening', permissionDenied: false })

    const handle = startRecognition(
      {
        onInterim: (t) =>
          setState((prev) =>
            prev.kind === 'chatting' ? { ...prev, draft: t } : prev,
          ),
        onFinal: (finalText) =>
          setState((prev) =>
            prev.kind === 'chatting'
              ? { ...prev, draft: finalText.trim() }
              : prev,
          ),
        onError: (error) => {
          setState((prev) =>
            prev.kind === 'chatting'
              ? {
                  ...prev,
                  mic: 'idle',
                  permissionDenied: error === 'not-allowed',
                }
              : prev,
          )
        },
        onEnd: () => {
          setState((prev) =>
            prev.kind === 'chatting' && prev.mic === 'listening'
              ? { ...prev, mic: 'idle' }
              : prev,
          )
          setTimeout(() => draftRef.current?.focus(), 0)
        },
      },
      { lang: 'en-US', continuous: true },
    )
    recRef.current = handle
  }

  function stopListening() {
    recRef.current?.stop()
    recRef.current = null
  }

  function toggleMic() {
    const s = stateRef.current
    if (s.kind !== 'chatting') return
    if (s.mic === 'listening') stopListening()
    else startListening()
  }

  /* ---------------------- Start interview from setup ------------------- */
  function startInterview(setup: InterviewSetup) {
    const level = stats?.cefrLevel ?? 'B2'
    const openerText = interviewerOpener(setup, level)
    setStartedAt(Date.now())
    setState({
      kind: 'chatting',
      setup,
      turns: [{ id: uid(), role: 'interviewer', text: openerText }],
      sending: false,
      xp: 0,
      answerCount: 0,
      atEndOfRound: false,
      error: null,
      mic: 'idle',
      draft: '',
      permissionDenied: false,
    })
  }

  /* ----------------------------- Send turn ----------------------------- */
  async function send() {
    const s = stateRef.current
    if (s.kind !== 'chatting' || s.sending) return
    const text = s.draft.trim()
    if (!text) return

    // If mic is still on, stop it cleanly first.
    if (s.mic === 'listening') stopListening()

    const wasInterruption = looksLikeInterruption(text)
    const candidateTurn: Turn = {
      id: uid(),
      role: 'candidate',
      text,
      wasInterruption,
    }
    setState({
      ...s,
      turns: [...s.turns, candidateTurn],
      sending: true,
      error: null,
      mic: 'idle',
      draft: '',
    })

    const history: ChatMessage[] = [...s.turns, candidateTurn].map((t) => ({
      role: t.role === 'interviewer' ? 'assistant' : 'user',
      content: t.text,
    }))

    try {
      const res = await interviewerReply(
        history,
        s.setup,
        stats?.cefrLevel ?? 'B2',
      )

      // Count real answers (not clarifying interruptions) for XP + stats.
      const counts = !wasInterruption
      const xpGained = counts ? XP_PER_ANSWER : 0

      setState((prev) => {
        if (prev.kind !== 'chatting') return prev
        return {
          ...prev,
          turns: [
            ...prev.turns,
            { id: uid(), role: 'interviewer', text: res.reply },
          ],
          sending: false,
          xp: prev.xp + xpGained,
          answerCount: prev.answerCount + (counts ? 1 : 0),
          atEndOfRound: res.endOfRound,
          error: null,
        }
      })

      if (stats && counts) {
        await addXp(xpGained)
        incrementReviews()
        registerCorrect()
        const dailyLog = await recordReview({
          xp: xpGained,
          wasCorrect: true,
          timeSpentSeconds: 30,
          dailyGoalXp: stats.dailyGoalXp,
        })
        await notifyDailyLog(dailyLog)
      }
    } catch (err) {
      setState((prev) =>
        prev.kind === 'chatting'
          ? { ...prev, sending: false, error: errMessage(err) }
          : prev,
      )
    }
  }

  /* ---------------------- End the interview + grade -------------------- */
  async function endInterview() {
    const s = stateRef.current
    if (s.kind !== 'chatting') return
    // Stop any live mic recording.
    recRef.current?.abort()
    recRef.current = null
    setState({
      kind: 'grading',
      setup: s.setup,
      turns: s.turns,
      xp: s.xp,
      answerCount: s.answerCount,
    })

    const history: ChatMessage[] = s.turns.map((t) => ({
      role: t.role === 'interviewer' ? 'assistant' : 'user',
      content: t.text,
    }))

    try {
      const feedback = await interviewCoach(
        history,
        s.setup,
        stats?.cefrLevel ?? 'B2',
      )

      const finalXp = s.xp + XP_COMPLETION_BONUS
      const seconds = Math.round((Date.now() - (startedAt ?? Date.now())) / 1000)

      setState({
        kind: 'done',
        setup: s.setup,
        xp: finalXp,
        answerCount: s.answerCount,
        seconds,
        feedback,
      })

      if (stats) {
        await addXp(XP_COMPLETION_BONUS)
        const dailyLog = await recordReview({
          xp: XP_COMPLETION_BONUS,
          wasCorrect: true,
          timeSpentSeconds: seconds,
          dailyGoalXp: stats.dailyGoalXp,
        })
        await notifyDailyLog(dailyLog)
      }
    } catch (err) {
      // On grading failure, fall back to a local summary so the user isn't stuck.
      const seconds = Math.round((Date.now() - (startedAt ?? Date.now())) / 1000)
      setState({
        kind: 'done',
        setup: s.setup,
        xp: s.xp,
        answerCount: s.answerCount,
        seconds,
        feedback: {
          overall:
            "Couldn't generate coach feedback (" +
            errMessage(err) +
            '). Your answers were saved — try again later for AI feedback.',
          strengths: [],
          improvements: [],
          rating: 0,
          nextFocus: 'Retry the session when the connection is stable.',
        },
      })
    }
  }

  /* =============================== Render =============================== */

  if (state.kind === 'no-key') {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 font-display text-2xl font-semibold">
          Mistral API key missing.
        </h1>
        <p className="mb-6 text-text-muted">
          Add{' '}
          <code className="rounded bg-bg-subtle px-1.5">
            VITE_MISTRAL_API_KEY
          </code>{' '}
          to{' '}
          <code className="rounded bg-bg-subtle px-1.5">.env.local</code> to run
          the interview simulator.
        </p>
        <Link to="/practice" className="btn-ghost inline-flex">
          ← Back to practice menu
        </Link>
      </div>
    )
  }

  if (state.kind === 'setup') {
    return <SetupPanel onStart={startInterview} />
  }

  if (state.kind === 'grading') {
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
          Building your feedback…
        </h1>
        <p className="text-text-muted">
          The coach is reviewing your answers. One moment.
        </p>
      </motion.div>
    )
  }

  if (state.kind === 'done') {
    return <ResultPanel state={state} onRestart={() => navigate(0)} />
  }

  /* ---------------------------- Chatting view -------------------------- */
  const canSend = state.draft.trim().length > 0 && !state.sending

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      <InterviewHeader
        setup={state.setup}
        xp={state.xp}
        answers={state.answerCount}
        onEnd={endInterview}
        atEndOfRound={state.atEndOfRound}
      />

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-bg-subtle/40 p-4"
      >
        <AnimatePresence initial={false}>
          {state.turns.map((t) =>
            t.role === 'interviewer' ? (
              <InterviewerBubble key={t.id} text={t.text} />
            ) : (
              <CandidateBubble key={t.id} turn={t} />
            ),
          )}
        </AnimatePresence>
        {state.sending && <TypingDots />}
        {state.atEndOfRound && !state.sending && (
          <div className="mt-2 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-accent">
            Looks like the interviewer is wrapping up. Answer this one — then
            hit <strong>End interview</strong> for feedback.
          </div>
        )}
      </div>

      {/* Error strip */}
      {state.error && (
        <div className="mt-2 rounded-xl border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
          {state.error}
        </div>
      )}

      {/* Composer: mic + editable draft + send (mirrors AudioChatSession) */}
      {/* `flex-wrap` plus an explicit basis keeps the mic and the field on
          one line and drops Send onto its own full-width row on a phone. */}
      <div className="mt-4 flex flex-wrap items-start gap-3">
        {sttSupported && (
          <MicButton
            listening={state.mic === 'listening'}
            disabled={state.sending}
            onToggle={toggleMic}
          />
        )}
        <div
          className={
            sttSupported
              ? 'min-w-0 basis-[calc(100%-3.75rem)] sm:flex-1 sm:basis-auto'
              : 'min-w-0 flex-1'
          }
        >
          <textarea
            ref={draftRef}
            value={state.draft}
            onChange={(e) =>
              setState((prev) =>
                prev.kind === 'chatting'
                  ? { ...prev, draft: e.target.value }
                  : prev,
              )
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (canSend) void send()
              }
            }}
            placeholder={
              state.mic === 'listening'
                ? 'Listening… speak now.'
                : 'Your transcript appears here. Edit freely before sending.'
            }
            rows={2}
            disabled={state.sending}
            className="input w-full resize-none text-base"
          />
          {state.permissionDenied ? (
            <p className="mt-1 text-xs text-warning">
              Microphone access denied — enable it in browser settings.
            </p>
          ) : !sttSupported ? (
            <p className="mt-1 text-xs text-text-subtle">
              Speech input not supported here — type your answer instead.
            </p>
          ) : (
            <KeyHint className="mt-1 text-left">
              {state.mic === 'listening'
                ? 'Listening — press Space to stop, Enter to send.'
                : 'Press Space to toggle the mic · Enter to send.'}
            </KeyHint>
          )}
        </div>
        <button
          onClick={send}
          disabled={!canSend}
          className="btn-primary w-full self-start disabled:opacity-40 sm:w-auto"
        >
          Send
        </button>
      </div>
    </div>
  )
}

/* ------------------------------ MicButton ------------------------------ */

function MicButton({
  listening,
  disabled,
  onToggle,
}: {
  listening: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      disabled={disabled}
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl shadow-xl transition-colors ${
        listening
          ? 'bg-danger text-white shadow-danger/40'
          : 'bg-accent text-white shadow-accent/40 hover:brightness-110'
      } disabled:cursor-not-allowed disabled:opacity-40`}
      aria-label={listening ? 'Stop listening' : 'Start listening'}
      title={listening ? 'Stop listening' : 'Start listening'}
    >
      {listening && (
        <motion.span
          className="absolute inset-0 rounded-full bg-danger"
          animate={{ scale: [1, 1.35, 1], opacity: [0.45, 0, 0.45] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
      <span className="relative">{listening ? '■' : '🎙'}</span>
    </motion.button>
  )
}

/* =============================== Setup =============================== */

function SetupPanel({
  onStart,
}: {
  onStart: (setup: InterviewSetup) => void
}) {
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [round, setRound] = useState<InterviewRound>('mixed')

  const canStart = useMemo(() => role.trim().length > 1, [role])

  function begin() {
    if (!canStart) return
    onStart({
      role: role.trim(),
      company: company.trim() || undefined,
      round,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl space-y-8"
    >
      <div>
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
          Set up the interview
        </h1>
        <p className="text-text-muted">
          Pick any role you want to rehearse for. The interviewer will adapt.
        </p>
      </div>

      {/* Role */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-text">
          Role you're interviewing for
        </label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Senior Product Designer, Frontend Engineer, Data Analyst…"
          className="input w-full text-base"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {ROLE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setRole(preset)}
              className={
                'rounded-full border px-3 py-1 text-xs transition ' +
                (role === preset
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-muted hover:border-accent/40 hover:text-text')
              }
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      {/* Company */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-text">
          Company or context{' '}
          <span className="text-xs font-normal text-text-subtle">
            (optional)
          </span>
        </label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Airbnb, Figma, early-stage fintech, design agency…"
          className="input w-full text-base"
        />
      </section>

      {/* Round type */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-text">
          Type of interview round
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROUND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRound(opt.value)}
              className={
                'rounded-2xl border p-4 text-left transition ' +
                (round === opt.value
                  ? 'border-accent bg-accent/5 shadow-sm'
                  : 'border-border hover:border-accent/40')
              }
            >
              <div className="mb-1 font-display text-base font-semibold text-text">
                {opt.label}
              </div>
              <div className="text-xs text-text-muted">{opt.blurb}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between pt-2">
        <Link to="/practice" className="btn-ghost">
          ← Cancel
        </Link>
        <button
          onClick={begin}
          disabled={!canStart}
          className="btn-primary disabled:opacity-40"
        >
          Start interview
        </button>
      </div>
    </motion.div>
  )
}

/* =============================== Header =============================== */

function InterviewHeader({
  setup,
  xp,
  answers,
  atEndOfRound,
  onEnd,
}: {
  setup: InterviewSetup
  xp: number
  answers: number
  atEndOfRound: boolean
  onEnd: () => void
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-semibold">
          {setup.role}
          {setup.company && (
            <span className="text-text-muted"> · {setup.company}</span>
          )}
        </h1>
        <p className="text-xs text-text-subtle">
          {roundLabel(setup.round)} round · answers stay in English
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-subtle">
          +{xp} XP · {answers} answers
        </span>
        <button
          onClick={onEnd}
          className={
            atEndOfRound
              ? 'btn-primary text-sm'
              : 'btn-ghost text-sm'
          }
        >
          End interview
        </button>
      </div>
    </div>
  )
}

function roundLabel(r: InterviewRound): string {
  switch (r) {
    case 'behavioral':
      return 'Behavioral'
    case 'technical':
      return 'Technical'
    case 'culture':
      return 'Culture / values'
    case 'mixed':
      return 'Mixed'
  }
}

/* =============================== Bubbles ============================== */

function InterviewerBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
        I
      </div>
      <div className="w-fit max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-border bg-bg px-4 py-2.5 text-sm text-text">
        {text}
      </div>
    </motion.div>
  )
}

function CandidateBubble({ turn }: { turn: Turn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full flex-col items-end gap-1"
    >
      <div className="ml-auto w-fit max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-accent/20 px-4 py-2.5 text-sm text-text">
        {turn.text}
      </div>
      {turn.wasInterruption && (
        <div className="pr-1 text-[11px] text-text-subtle">
          (clarifying question)
        </div>
      )}
    </motion.div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
        I
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-bg px-4 py-3">
        <Dot delay={0} />
        <Dot delay={0.15} />
        <Dot delay={0.3} />
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  )
}

/* =============================== Result =============================== */

function ResultPanel({
  state,
  onRestart,
}: {
  state: Extract<State, { kind: 'done' }>
  onRestart: () => void
}) {
  const { feedback, setup } = state
  const fmtTime =
    state.seconds >= 60
      ? `${Math.floor(state.seconds / 60)}m ${state.seconds % 60}s`
      : `${state.seconds}s`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-2xl shadow-accent/40">
          <span className="font-display text-4xl">◆</span>
        </div>
        <h1 className="font-display text-3xl font-semibold">Interview done.</h1>
        <p className="mt-1 text-text-muted">
          {setup.role}
          {setup.company && ` · ${setup.company}`}
        </p>
      </div>

      <div className="card grid grid-cols-4 gap-4 text-center">
        <Stat label="Rating" value={`${feedback.rating}/10`} />
        <Stat label="Answers" value={`${state.answerCount}`} />
        <Stat label="Time" value={fmtTime} />
        <Stat label="XP" value={`+${state.xp}`} />
      </div>

      {/* Overall */}
      <section className="card space-y-2">
        <h2 className="font-display text-lg font-semibold">Overall</h2>
        <p className="text-sm leading-relaxed text-text">{feedback.overall}</p>
      </section>

      {/* Strengths + improvements */}
      {(feedback.strengths.length > 0 || feedback.improvements.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {feedback.strengths.length > 0 && (
            <section className="card space-y-2 border-success/30">
              <h3 className="font-display text-sm font-semibold text-success">
                Strengths
              </h3>
              <ul className="space-y-1.5 text-sm text-text">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {feedback.improvements.length > 0 && (
            <section className="card space-y-2 border-warning/30">
              <h3 className="font-display text-sm font-semibold text-warning">
                To improve
              </h3>
              <ul className="space-y-1.5 text-sm text-text">
                {feedback.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-warning">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Next focus */}
      {feedback.nextFocus && (
        <section className="card space-y-1 border-accent/30">
          <div className="text-xs uppercase tracking-wider text-text-subtle">
            Next time, focus on
          </div>
          <p className="text-sm text-text">{feedback.nextFocus}</p>
        </section>
      )}

      <div className="flex justify-center gap-3">
        <Link to="/practice" className="btn-ghost">
          Back to menu
        </Link>
        <button onClick={onRestart} className="btn-primary">
          New interview
        </button>
      </div>
    </motion.div>
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

/* =============================== utils ================================ */

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
