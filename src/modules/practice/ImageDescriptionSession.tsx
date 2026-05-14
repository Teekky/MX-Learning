/**
 * Image Description — the user describes an image in English, Mistral
 * Pixtral grades the description against the actual image.
 *
 * Image sources:
 *   - "Random" button → Lorem Picsum (free, no API key, no cost).
 *   - Upload from computer → converted to a base64 data URL locally.
 *
 * XP: scaled with the Pixtral score (0..100) → up to 20 XP per image.
 * Streak bumped via addXp. Review logged in daily log.
 */

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hasMistralKey } from '@/ai/mistral'
import {
  compressImageDataUrl,
  fileToDataUrl,
  gradeImageDescription,
  urlToDataUrl,
  type ImageGrade,
} from '@/ai/imageDescribe'
import { useAppStore } from '@/store/useAppStore'
import { recordReview } from '@/utils/dailyLog'

const MAX_XP_PER_IMAGE = 20

type State =
  | { kind: 'no-key' }
  | {
      kind: 'active'
      imageDataUrl: string | null
      imageLoading: boolean
      imageError: string
      description: string
      grading: boolean
      grade: ImageGrade | null
      gradeError: string
      totalXp: number
      imagesDone: number
    }

export function ImageDescriptionSession() {
  const navigate = useNavigate()
  const addXp = useAppStore((s) => s.addXp)
  const incrementReviews = useAppStore((s) => s.incrementReviews)
  const registerCorrect = useAppStore((s) => s.registerCorrect)
  const registerWrong = useAppStore((s) => s.registerWrong)
  const notifyDailyLog = useAppStore((s) => s.notifyDailyLog)
  const stats = useAppStore((s) => s.stats)

  const [state, setState] = useState<State>(() =>
    hasMistralKey()
      ? {
          kind: 'active',
          imageDataUrl: null,
          imageLoading: false,
          imageError: '',
          description: '',
          grading: false,
          grade: null,
          gradeError: '',
          totalXp: 0,
          imagesDone: 0,
        }
      : { kind: 'no-key' },
  )
  const [startedAt] = useState(Date.now())
  const descRef = useRef<HTMLTextAreaElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  /* Auto-load a first random image on mount. */
  useEffect(() => {
    if (state.kind !== 'active') return
    if (!state.imageDataUrl && !state.imageLoading) {
      void loadRandom()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------------------- Image loaders --------------------------- */

  async function loadRandom() {
    const s = stateRef.current
    if (s.kind !== 'active' || s.imageLoading) return
    setState({
      ...s,
      imageLoading: true,
      imageError: '',
      imageDataUrl: null,
      description: '',
      grade: null,
      gradeError: '',
    })
    try {
      // Lorem Picsum: free, no API key. Seed param forces a fresh image.
      const seed = Math.floor(Math.random() * 1_000_000)
      const url = `https://picsum.photos/seed/${seed}/1024/640`
      const rawDataUrl = await urlToDataUrl(url)
      const dataUrl = await compressImageDataUrl(rawDataUrl)
      setState((prev) =>
        prev.kind === 'active'
          ? { ...prev, imageDataUrl: dataUrl, imageLoading: false }
          : prev,
      )
      setTimeout(() => descRef.current?.focus(), 0)
    } catch (err) {
      setState((prev) =>
        prev.kind === 'active'
          ? {
              ...prev,
              imageLoading: false,
              imageError: errMessage(err),
            }
          : prev,
      )
    }
  }

  async function onFilePicked(file: File) {
    const s = stateRef.current
    if (s.kind !== 'active') return
    if (!file.type.startsWith('image/')) {
      setState({ ...s, imageError: 'That file is not an image.' })
      return
    }
    setState({
      ...s,
      imageLoading: true,
      imageError: '',
      imageDataUrl: null,
      description: '',
      grade: null,
      gradeError: '',
    })
    try {
      const rawDataUrl = await fileToDataUrl(file)
      // Downscale large phone photos before they ever leave the page —
      // keeps Pixtral token usage low and minimizes data exposure.
      const dataUrl = await compressImageDataUrl(rawDataUrl)
      setState((prev) =>
        prev.kind === 'active'
          ? { ...prev, imageDataUrl: dataUrl, imageLoading: false }
          : prev,
      )
      setTimeout(() => descRef.current?.focus(), 0)
    } catch (err) {
      setState((prev) =>
        prev.kind === 'active'
          ? { ...prev, imageLoading: false, imageError: errMessage(err) }
          : prev,
      )
    }
  }

  /* ------------------------------- Grade ------------------------------- */

  async function submit() {
    const s = stateRef.current
    if (s.kind !== 'active' || s.grading || !s.imageDataUrl) return
    const text = s.description.trim()
    if (!text) return

    setState({ ...s, grading: true, gradeError: '' })

    try {
      const grade = await gradeImageDescription(
        s.imageDataUrl,
        text,
        stats?.cefrLevel ?? 'B2',
      )
      const xpGained = Math.round((grade.score / 100) * MAX_XP_PER_IMAGE)
      const wasCorrect = grade.score >= 60

      setState((prev) =>
        prev.kind === 'active'
          ? {
              ...prev,
              grading: false,
              grade,
              totalXp: prev.totalXp + xpGained,
              imagesDone: prev.imagesDone + 1,
            }
          : prev,
      )

      if (stats) {
        if (xpGained > 0) await addXp(xpGained)
        incrementReviews()
        if (wasCorrect) registerCorrect()
        else registerWrong()
        const dailyLog = await recordReview({
          xp: xpGained,
          wasCorrect,
          timeSpentSeconds: 60,
          dailyGoalXp: stats.dailyGoalXp,
        })
        await notifyDailyLog(dailyLog)
      }
    } catch (err) {
      setState((prev) =>
        prev.kind === 'active'
          ? { ...prev, grading: false, gradeError: errMessage(err) }
          : prev,
      )
    }
  }

  /* ------------------------------ End --------------------------------- */
  function endSession() {
    const s = stateRef.current
    if (s.kind !== 'active') return
    const seconds = Math.round((Date.now() - startedAt) / 1000)
    navigate('/practice', { replace: false })
    void seconds // not stored per-session here; daily log tracks per-review
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
          <code className="rounded bg-bg-subtle px-1.5"> .env.local</code> to use image description.
        </p>
        <Link to="/practice" className="btn-ghost inline-flex">
          ← Back to practice menu
        </Link>
      </div>
    )
  }

  const canSubmit =
    state.imageDataUrl !== null &&
    state.description.trim().length > 0 &&
    !state.grading &&
    !state.grade

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Describe an image</h1>
          <p className="text-xs text-text-subtle">
            Write a rich, specific description. Pixtral will grade you.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-subtle">
            +{state.totalXp} XP · {state.imagesDone} image{state.imagesDone === 1 ? '' : 's'}
          </span>
          <button onClick={endSession} className="btn-ghost text-sm">
            End session
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Image */}
        <div className="card flex flex-col gap-4">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-bg-subtle">
            {state.imageLoading ? (
              <div className="flex h-full items-center justify-center text-text-muted">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
                <span className="ml-2">Loading image…</span>
              </div>
            ) : state.imageDataUrl ? (
              <img
                src={state.imageDataUrl}
                alt="Describe this"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-text-subtle">
                No image loaded.
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadRandom}
              disabled={state.imageLoading}
              className="btn-ghost text-sm"
            >
              <span className="mr-2 text-accent">↻</span>
              Random image
            </button>
            <label className="btn-ghost cursor-pointer text-sm">
              <span className="mr-2 text-accent">↑</span>
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFilePicked(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          {state.imageError && (
            <p className="text-xs text-danger">{state.imageError}</p>
          )}

          <p className="text-[11px] text-text-subtle">
            Images are resized in your browser and held in memory only — never saved
            to disk. They're sent once to Mistral for grading and discarded.
          </p>
        </div>

        {/* Composer + feedback */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-text-subtle">
              Your description
            </div>
            {state.description && (
              <span className="text-xs text-text-subtle">
                {state.description.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            )}
          </div>

          <textarea
            ref={descRef}
            value={state.description}
            onChange={(e) =>
              setState((prev) =>
                prev.kind === 'active'
                  ? { ...prev, description: e.target.value }
                  : prev,
              )
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                if (canSubmit) void submit()
              }
            }}
            placeholder="Describe what you see — people, setting, mood, details…"
            rows={6}
            disabled={state.grading || !!state.grade}
            className="input w-full resize-none text-base"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-text-subtle">
              {state.grade
                ? 'Try another image to keep practising.'
                : 'Cmd/Ctrl + Enter to submit.'}
            </p>
            {state.grade ? (
              <button onClick={loadRandom} className="btn-primary">
                Next image →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="btn-primary disabled:opacity-40"
              >
                {state.grading ? 'Grading…' : 'Submit'}
              </button>
            )}
          </div>

          {state.gradeError && (
            <p className="text-xs text-danger">{state.gradeError}</p>
          )}

          {state.grade && <Feedback grade={state.grade} />}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Feedback ------------------------------ */

function Feedback({ grade }: { grade: ImageGrade }) {
  const tone =
    grade.score >= 80 ? 'success' : grade.score >= 55 ? 'warning' : 'danger'
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-xl border border-border bg-bg-subtle/50 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-text-subtle">
            Grade
          </div>
          <div
            className={`font-display text-3xl font-semibold ${
              tone === 'success'
                ? 'text-success'
                : tone === 'warning'
                  ? 'text-warning'
                  : 'text-danger'
            }`}
          >
            {grade.score}
            <span className="text-lg text-text-subtle">/100</span>
          </div>
        </div>
        <div className="max-w-[60%] text-right text-sm italic text-text-muted">
          "{grade.verdict}"
        </div>
      </div>

      {grade.model && (
        <Section title="Native-level description">
          <p className="whitespace-pre-wrap text-sm text-text">{grade.model}</p>
        </Section>
      )}

      {grade.strengths.length > 0 && (
        <Section title="What you nailed" tone="success">
          <Bullets items={grade.strengths} />
        </Section>
      )}

      {grade.gaps.length > 0 && (
        <Section title="What you missed" tone="warning">
          <Bullets items={grade.gaps} />
        </Section>
      )}

      {grade.suggestions.length > 0 && (
        <Section title="Try next time">
          <Bullets items={grade.suggestions} />
        </Section>
      )}
    </motion.div>
  )
}

function Section({
  title,
  tone,
  children,
}: {
  title: string
  tone?: 'success' | 'warning' | 'danger'
  children: React.ReactNode
}) {
  const titleColor =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'danger'
          ? 'text-danger'
          : 'text-text-subtle'
  return (
    <div>
      <div className={`mb-1 text-xs font-semibold uppercase tracking-wider ${titleColor}`}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-sm text-text">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="shrink-0 text-text-subtle">·</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
