/**
 * Practice session dispatcher — picks the right session component
 * based on the `:mode` URL param.
 *
 * Every session is a separate lazy chunk. The heavy content files
 * (`grammar.ts`, `tenses.ts`, `irregularVerbs.ts`, the seed vocabulary)
 * are each pulled in by exactly one session, so opening Time-Attack no
 * longer downloads the grammar corpus. On a phone that is the difference
 * between "open it and drill for two minutes" and a 1 MB stall.
 */

import { lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageLoader } from '@/components/ui'

const SESSIONS: Record<string, React.LazyExoticComponent<() => React.ReactNode>> = {
  'fill-in-blank': lazy(() =>
    import('./FillInBlankSession').then((m) => ({ default: m.FillInBlankSession })),
  ),
  'time-attack': lazy(() =>
    import('./TimeAttackSession').then((m) => ({ default: m.TimeAttackSession })),
  ),
  'random-words': lazy(() =>
    import('./WordsInContextSession').then((m) => ({
      default: m.WordsInContextSession,
    })),
  ),
  writing: lazy(() =>
    import('./WritingChatSession').then((m) => ({ default: m.WritingChatSession })),
  ),
  audio: lazy(() =>
    import('./AudioChatSession').then((m) => ({ default: m.AudioChatSession })),
  ),
  image: lazy(() =>
    import('./ImageDescriptionSession').then((m) => ({
      default: m.ImageDescriptionSession,
    })),
  ),
  interview: lazy(() =>
    import('./InterviewSimulatorSession').then((m) => ({
      default: m.InterviewSimulatorSession,
    })),
  ),
  import: lazy(() =>
    import('./ImportTextSession').then((m) => ({ default: m.ImportTextSession })),
  ),
  listening: lazy(() =>
    import('./ListeningSession').then((m) => ({ default: m.ListeningSession })),
  ),
  pronunciation: lazy(() =>
    import('./PronunciationSession').then((m) => ({
      default: m.PronunciationSession,
    })),
  ),
  grammar: lazy(() =>
    import('./GrammarSession').then((m) => ({ default: m.GrammarSession })),
  ),
  tenses: lazy(() =>
    import('./TensesSession').then((m) => ({ default: m.TensesSession })),
  ),
  conjugation: lazy(() =>
    import('./ConjugationSession').then((m) => ({ default: m.ConjugationSession })),
  ),
  'weak-words': lazy(() =>
    import('./WeakWordsSession').then((m) => ({ default: m.WeakWordsSession })),
  ),
}

export function PracticeSessionPage() {
  const { mode } = useParams<{ mode: string }>()
  const Session = mode ? SESSIONS[mode] : undefined

  if (!Session) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 font-display text-2xl font-semibold">
          Mode not available yet.
        </h1>
        <p className="mb-6 text-text-muted">
          This mode ships in a later sub-phase.
        </p>
        <Link to="/practice" className="btn-ghost inline-flex">
          ← Back to practice menu
        </Link>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageLoader label="Loading…" />}>
      <Session />
    </Suspense>
  )
}
