/**
 * Audio (Speaking) chat — voice-first conversation with the AI tutor.
 *
 * Flow:
 *   1. Tap the mic to start listening (browser STT via Web Speech API).
 *   2. Speak — live transcript fills the composer as you talk.
 *   3. Tap the mic again to stop → transcript stays editable in the
 *      composer so you can fix any STT mis-hearings.
 *   4. Tap Send (or press Enter) → sent to the tutor.
 *   5. Tutor replies in text AND speaks it via TTS (muteable).
 *      Every tutor bubble has a ▶ replay button.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hasMistralKey } from '@/ai/mistral'
import { tutorOpener, tutorReply } from '@/ai/tutor'
import type { ChatMessage } from '@/ai/chat'
import { recordReview } from '@/utils/dailyLog'
import { useAppStore } from '@/store/useAppStore'
import { isSTTSupported, startRecognition, type STTHandle } from '@/audio/stt'
import { speak, stopSpeaking } from '@/audio/tts'

const XP_PER_MESSAGE = 4
const XP_CLEAN_BONUS = 3

type Turn =
  | { id: string; role: 'tutor'; text: string }
  | {
      id: string
      role: 'user'
      text: string
      correction?: string | null
      note?: string | null
      clean?: boolean
    }

type State =
  | { kind: 'no-support' }
  | { kind: 'no-key' }
  | {
      kind: 'active'
      turns: Turn[]
      sending: boolean
      xp: number
      cleanCount: number
      messageCount: number
      mic: 'idle' | 'listening'
      /** Editable composer content — filled by STT, corrected by the user. */
      draft: string
      permissionDenied: boolean
    }
  | {
      kind: 'done'
      xp: number
      cleanCount: number
      messageCount: number
      seconds: number
    }

export function AudioChatSession() {
  const navigate = useNavigate()
  const addXp = useAppStore((s) => s.addXp)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)
  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)

  const [state, setState] = useState<State>(() => {
    if (!hasMistralKey()) return { kind: 'no-key' }
    if (!isSTTSupported()) return { kind: 'no-support' }
    return {
      kind: 'active',
      turns: [{ id: uid(), role: 'tutor', text: tutorOpener() }],
      sending: false,
      xp: 0,
      cleanCount: 0,
      messageCount: 0,
      mic: 'idle',
      draft: '',
      permissionDenied: false,
    }
  })
  const [muted, setMuted] = useState(false)
  const [startedAt] = useState(Date.now())
  const scrollRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<STTHandle | null>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  /* Scroll pinning. */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state])

  /* Cleanup on unmount. */
  useEffect(() => {
    return () => {
      recRef.current?.abort()
      stopSpeaking()
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
      if (s.kind !== 'active' || s.sending) return
      e.preventDefault()
      toggleMic()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Play any string via TTS. */
  function play(text: string) {
    if (muted) return
    void speak(text, {
      voiceURI: settings?.voiceURI,
      rate: settings?.voiceRate ?? 1,
      pitch: settings?.voicePitch ?? 1,
    })
  }

  /* -------------------------- Mic controls --------------------------- */

  function startListening() {
    const s = stateRef.current
    if (s.kind !== 'active' || s.sending) return

    stopSpeaking() // don't record the tutor's own voice
    setState({ ...s, mic: 'listening', permissionDenied: false })

    const handle = startRecognition(
      {
        onInterim: (t) =>
          setState((prev) =>
            prev.kind === 'active' ? { ...prev, draft: t } : prev,
          ),
        onFinal: (finalText) =>
          setState((prev) =>
            prev.kind === 'active'
              ? { ...prev, draft: finalText.trim() }
              : prev,
          ),
        onError: (error) => {
          setState((prev) =>
            prev.kind === 'active'
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
            prev.kind === 'active' && prev.mic === 'listening'
              ? { ...prev, mic: 'idle' }
              : prev,
          )
          // Focus the textarea so the user can immediately edit or send.
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
    if (s.kind !== 'active') return
    if (s.mic === 'listening') stopListening()
    else startListening()
  }

  /* ----------------------- Send to tutor ----------------------------- */

  async function send() {
    const s = stateRef.current
    if (s.kind !== 'active' || s.sending) return
    const text = s.draft.trim()
    if (!text) return

    // If mic is still on, stop it cleanly first.
    if (s.mic === 'listening') stopListening()

    const userTurn: Turn = { id: uid(), role: 'user', text }
    setState({
      ...s,
      turns: [...s.turns, userTurn],
      sending: true,
      mic: 'idle',
      draft: '',
    })

    const history: ChatMessage[] = [...s.turns, userTurn].map((t) => ({
      role: t.role === 'tutor' ? 'assistant' : 'user',
      content: t.text,
    }))

    try {
      const res = await tutorReply(history, stats?.cefrLevel ?? 'B2')
      const clean = !res.correction
      const xpGained = XP_PER_MESSAGE + (clean ? XP_CLEAN_BONUS : 0)

      const tutorTurn: Turn = { id: uid(), role: 'tutor', text: res.reply }
      setState((prev) => {
        if (prev.kind !== 'active') return prev
        return {
          ...prev,
          turns: [
            ...prev.turns.map((t) =>
              t.id === userTurn.id
                ? { ...t, correction: res.correction, note: res.note, clean }
                : t,
            ),
            tutorTurn,
          ],
          sending: false,
          xp: prev.xp + xpGained,
          cleanCount: prev.cleanCount + (clean ? 1 : 0),
          messageCount: prev.messageCount + 1,
        }
      })

      if (stats) {
        await addXp(xpGained)
        incrementReviews()
        if (clean) registerCorrect()
        const dailyLog = await recordReview({
          xp: xpGained,
          wasCorrect: clean,
          timeSpentSeconds: 20,
          dailyGoalXp: stats.dailyGoalXp,
        })
        await notifyDailyLog(dailyLog)
      }

      play(res.reply)
    } catch (err) {
      setState((prev) =>
        prev.kind === 'active'
          ? {
              ...prev,
              sending: false,
              mic: 'idle',
              turns: [
                ...prev.turns,
                {
                  id: uid(),
                  role: 'tutor',
                  text: `(Connection hiccup — ${errMessage(err)}. Try again.)`,
                },
              ],
            }
          : prev,
      )
    }
  }

  function endSession() {
    const s = stateRef.current
    if (s.kind !== 'active') return
    recRef.current?.abort()
    stopSpeaking()
    setState({
      kind: 'done',
      xp: s.xp,
      cleanCount: s.cleanCount,
      messageCount: s.messageCount,
      seconds: Math.round((Date.now() - startedAt) / 1000),
    })
  }

  /* ------------------------------ Render ----------------------------- */

  if (state.kind === 'no-key') {
    return (
      <Notice
        title="Mistral API key missing."
        body="Add VITE_MISTRAL_API_KEY to .env.local to use the speaking chat."
      />
    )
  }

  if (state.kind === 'no-support') {
    return (
      <Notice
        title="Speech recognition not available."
        body="Use Microsoft Edge, Google Chrome, or Brave — Firefox does not support the Web Speech API."
      />
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
          <span className="font-display text-4xl">◉</span>
        </div>
        <h1 className="font-display text-3xl font-semibold">Great session.</h1>
        <div className="card grid grid-cols-3 gap-6">
          <Stat label="Spoken" value={`${state.messageCount}`} />
          <Stat label="Native-level" value={`${cleanPct}%`} />
          <Stat label="XP earned" value={`+${state.xp}`} />
        </div>
        <div className="flex justify-center gap-3">
          <Link to="/practice" className="btn-ghost">Back to menu</Link>
          <button onClick={() => navigate(0)} className="btn-primary">
            New session
          </button>
        </div>
      </motion.div>
    )
  }

  const canSend = state.draft.trim().length > 0 && !state.sending

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Speaking chat</h1>
          <p className="text-xs text-text-subtle">
            Tap 🎙 to speak, edit the transcript if needed, then Send.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-subtle">
            +{state.xp} XP · {state.messageCount} msg
          </span>
          <button
            onClick={() => {
              if (!muted) stopSpeaking()
              setMuted((m) => !m)
            }}
            className="btn-ghost text-sm"
            title={muted ? 'Unmute tutor voice' : 'Mute tutor voice'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
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
              <TutorBubble key={t.id} text={t.text} onReplay={() => play(t.text)} />
            ) : (
              <UserBubble key={t.id} turn={t} />
            ),
          )}
        </AnimatePresence>
        {state.sending && <TypingDots />}
      </div>

      {/* Composer: mic + editable draft + send */}
      <div className="mt-4 flex items-start gap-3">
        <MicButton
          listening={state.mic === 'listening'}
          disabled={state.sending}
          onToggle={toggleMic}
        />
        <div className="flex-1">
          <textarea
            ref={draftRef}
            value={state.draft}
            onChange={(e) =>
              setState((prev) =>
                prev.kind === 'active' ? { ...prev, draft: e.target.value } : prev,
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
          <p className="mt-1 text-[11px] text-text-subtle">
            {state.permissionDenied
              ? 'Microphone access denied — enable it in browser settings.'
              : state.mic === 'listening'
                ? 'Listening — press Space to stop, Enter to send.'
                : 'Press Space to toggle the mic · Enter to send.'}
          </p>
        </div>
        <button
          onClick={send}
          disabled={!canSend}
          className="btn-primary self-start disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}

/* ------------------------------ Bubbles -------------------------------- */

function TutorBubble({
  text,
  onReplay,
}: {
  text: string
  onReplay: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
        T
      </div>
      <div className="group relative w-fit max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-border bg-bg px-4 py-2.5 text-sm text-text">
        {text}
        <button
          onClick={onReplay}
          className="ml-2 text-xs text-text-subtle transition-colors hover:text-accent"
          title="Replay"
          aria-label="Replay tutor message"
        >
          ▶
        </button>
      </div>
    </motion.div>
  )
}

function UserBubble({ turn }: { turn: Extract<Turn, { role: 'user' }> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full flex-col items-end gap-1"
    >
      <div className="ml-auto w-fit max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-accent/20 px-4 py-2.5 text-sm text-text">
        {turn.text}
      </div>
      {turn.clean === true && (
        <div className="pr-1 text-[11px] text-success">✓ Native-level</div>
      )}
      {turn.correction && (
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

/* --------------------------------- misc -------------------------------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-subtle">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-text">{value}</div>
    </div>
  )
}

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

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
