/**
 * Writing Chat — free English conversation with the AI tutor.
 *
 * No FSRS: this is a free-form immersion mode. Each round awards a small
 * amount of XP (3 per user message, +2 if no correction needed = "clean"
 * native-level message). Streak bumps once per session via addXp().
 *
 * UX:
 *   - Chat transcript: tutor on the left, user on the right.
 *   - Corrections appear as a small inline note under the user's bubble.
 *   - Enter sends, Shift+Enter inserts a newline.
 *   - "End session" button finalizes and shows a summary.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hasMistralKey } from '@/ai/mistral'
import { tutorOpener, tutorReply } from '@/ai/tutor'
import type { ChatMessage } from '@/ai/chat'
import { recordReview } from '@/utils/dailyLog'
import { useAppStore } from '@/store/useAppStore'
import { useCoarsePointer } from '@/utils/usePointer'

const XP_PER_MESSAGE = 3
const XP_CLEAN_BONUS = 2 // +2 when the user message needed no correction

type Turn =
  | { id: string; role: 'tutor'; text: string }
  | {
      id: string
      role: 'user'
      text: string
      // Undefined = awaiting tutor reply. Non-null = correction available.
      correction?: string | null
      note?: string | null
      clean?: boolean
    }

type State =
  | { kind: 'no-key' }
  | { kind: 'chatting'; turns: Turn[]; sending: boolean; xp: number; cleanCount: number; messageCount: number }
  | { kind: 'done'; xp: number; cleanCount: number; messageCount: number; seconds: number }

export function WritingChatSession() {
  const navigate = useNavigate()
  const addXp = useAppStore((s) => s.addXp)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)
  const stats = useAppStore((s) => s.stats)
  const coarsePointer = useCoarsePointer()

  const [state, setState] = useState<State>(() =>
    hasMistralKey()
      ? {
          kind: 'chatting',
          turns: [{ id: uid(), role: 'tutor', text: tutorOpener() }],
          sending: false,
          xp: 0,
          cleanCount: 0,
          messageCount: 0,
        }
      : { kind: 'no-key' },
  )
  const [value, setValue] = useState('')
  const [startedAt] = useState(Date.now())
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  /* Keep scroll pinned to bottom when turns change. */
  useEffect(() => {
    if (state.kind !== 'chatting') return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state])

  /* Focus on mount. */
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function send() {
    const s = stateRef.current
    if (s.kind !== 'chatting' || s.sending) return
    const text = value.trim()
    if (!text) return

    const userTurn: Turn = { id: uid(), role: 'user', text }
    setState({
      ...s,
      turns: [...s.turns, userTurn],
      sending: true,
    })
    setValue('')

    // Build history for the model: tutor + user messages in order.
    const history: ChatMessage[] = [...s.turns, userTurn].map((t) => ({
      role: t.role === 'tutor' ? 'assistant' : 'user',
      content: t.text,
    }))

    try {
      const res = await tutorReply(history, stats?.cefrLevel ?? 'B2')
      const clean = !res.correction
      const xpGained = XP_PER_MESSAGE + (clean ? XP_CLEAN_BONUS : 0)

      // Enrich the user turn + append tutor reply, atomically.
      setState((prev) => {
        if (prev.kind !== 'chatting') return prev
        const enrichedTurns = prev.turns.map((t) =>
          t.id === userTurn.id
            ? { ...t, correction: res.correction, note: res.note, clean }
            : t,
        )
        return {
          ...prev,
          turns: [
            ...enrichedTurns,
            { id: uid(), role: 'tutor', text: res.reply },
          ],
          sending: false,
          xp: prev.xp + xpGained,
          cleanCount: prev.cleanCount + (clean ? 1 : 0),
          messageCount: prev.messageCount + 1,
        }
      })

      // Persist XP + streak bump + daily log.
      if (stats) {
        await addXp(xpGained)
        incrementReviews()
        if (clean) registerCorrect()
        const dailyLog = await recordReview({
          xp: xpGained,
          wasCorrect: clean,
          timeSpentSeconds: 15, // rough estimate per message
          dailyGoalXp: stats.dailyGoalXp,
        })
        await notifyDailyLog(dailyLog)
      }
    } catch (err) {
      setState((prev) =>
        prev.kind === 'chatting'
          ? {
              ...prev,
              sending: false,
              turns: [
                ...prev.turns,
                {
                  id: uid(),
                  role: 'tutor',
                  text: `(Hmm, the connection hiccupped — ${errMessage(err)}. Try again?)`,
                },
              ],
            }
          : prev,
      )
    }
  }

  function endSession() {
    const s = stateRef.current
    if (s.kind !== 'chatting') return
    const seconds = Math.round((Date.now() - startedAt) / 1000)
    setState({
      kind: 'done',
      xp: s.xp,
      cleanCount: s.cleanCount,
      messageCount: s.messageCount,
      seconds,
    })
  }

  /* ------------------------------ Render ------------------------------ */

  if (state.kind === 'no-key') {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 font-display text-2xl font-semibold">
          Mistral API key missing.
        </h1>
        <p className="mb-6 text-text-muted">
          Add <code className="rounded bg-bg-subtle px-1.5">VITE_MISTRAL_API_KEY</code> to
          <code className="rounded bg-bg-subtle px-1.5"> .env.local</code> to use the writing chat.
        </p>
        <Link to="/practice" className="btn-ghost inline-flex">
          ← Back to practice menu
        </Link>
      </div>
    )
  }

  if (state.kind === 'done') {
    const cleanPct =
      state.messageCount === 0
        ? 0
        : Math.round((state.cleanCount / state.messageCount) * 100)
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl space-y-6 text-center"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-2xl shadow-accent/40">
          <span className="font-display text-4xl">✎</span>
        </div>
        <h1 className="font-display text-3xl font-semibold">Nice chat.</h1>
        <div className="card grid grid-cols-3 gap-6">
          <Stat label="Messages" value={`${state.messageCount}`} />
          <Stat label="Native-level" value={`${cleanPct}%`} />
          <Stat label="XP earned" value={`+${state.xp}`} />
        </div>
        <div className="flex justify-center gap-3">
          <Link to="/practice" className="btn-ghost">Back to menu</Link>
          <button onClick={() => navigate(0)} className="btn-primary">New chat</button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Writing chat</h1>
          <p className="text-xs text-text-subtle">
            Chat naturally. I'll rewrite you when something sounds off.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-subtle">
            +{state.xp} XP · {state.messageCount} msg
          </span>
          <button onClick={endSession} className="btn-ghost text-sm">
            End session
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-bg-subtle/40 p-4"
      >
        <AnimatePresence initial={false}>
          {state.turns.map((t) =>
            t.role === 'tutor' ? (
              <TutorBubble key={t.id} text={t.text} />
            ) : (
              <UserBubble key={t.id} turn={t} />
            ),
          )}
        </AnimatePresence>
        {state.sending && <TypingDots />}
      </div>

      {/* Composer */}
      <div className="answer-row mt-3">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          /* The keyboard instruction is dropped on touch devices, where
             there is no Enter to press and no Shift to hold. */
          placeholder={
            coarsePointer
              ? 'Type in English…'
              : 'Type in English — Shift+Enter for a new line.'
          }
          rows={2}
          className="input resize-none text-base"
          disabled={state.sending}
        />
        <button
          onClick={send}
          disabled={state.sending || !value.trim()}
          className="btn-primary self-end disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}

/* ------------------------------ Bubbles -------------------------------- */

function TutorBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
        T
      </div>
      <div className="w-fit max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-border bg-bg px-4 py-2.5 text-sm text-text">
        {text}
      </div>
    </motion.div>
  )
}

function UserBubble({
  turn,
}: {
  turn: Extract<Turn, { role: 'user' }>
}) {
  const hasCorrection = !!turn.correction
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full flex-col items-end gap-1"
    >
      <div className="ml-auto w-fit max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-accent/20 px-4 py-2.5 text-sm text-text">
        {turn.text}
      </div>

      {/* Clean-check badge (only after reply arrived). */}
      {turn.clean === true && (
        <div className="pr-1 text-[11px] text-success">✓ Native-level</div>
      )}

      {/* Correction inline. */}
      {hasCorrection && (
        <div className="ml-auto w-fit max-w-[80%] rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs">
          <div className="mb-1 font-semibold text-warning">Smoother version</div>
          <div className="whitespace-pre-wrap text-text">{turn.correction}</div>
          {turn.note && <div className="mt-1 text-text-subtle">— {turn.note}</div>}
        </div>
      )}
    </motion.div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
        T
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-subtle">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-text">{value}</div>
    </div>
  )
}

/* --------------------------------- utils ------------------------------- */

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
