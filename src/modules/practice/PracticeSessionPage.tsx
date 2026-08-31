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

import { Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageLoader } from '@/components/ui'
import { lazyWithReload } from '@/utils/lazyWithReload'

const SESSIONS: Record<string, React.LazyExoticComponent<() => React.ReactNode>> = {
  'fill-in-blank': lazyWithReload(() =>
    import('./FillInBlankSession').then((m) => ({ default: m.FillInBlankSession })),
  ),
  'time-attack': lazyWithReload(() =>
    import('./TimeAttackSession').then((m) => ({ default: m.TimeAttackSession })),
  ),
  'random-words': lazyWithReload(() =>
    import('./WordsInContextSession').then((m) => ({
      default: m.WordsInContextSession,
    })),
  ),
  writing: lazyWithReload(() =>
    import('./WritingChatSession').then((m) => ({ default: m.WritingChatSession })),
  ),
  audio: lazyWithReload(() =>
    import('./AudioChatSession').then((m) => ({ default: m.AudioChatSession })),
  ),
  image: lazyWithReload(() =>
    import('./ImageDescriptionSession').then((m) => ({
      default: m.ImageDescriptionSession,
    })),
  ),
  interview: lazyWithReload(() =>
    import('./InterviewSimulatorSession').then((m) => ({
      default: m.InterviewSimulatorSession,
    })),
  ),
  import: lazyWithReload(() =>
    import('./ImportTextSession').then((m) => ({ default: m.ImportTextSession })),
  ),
  listening: lazyWithReload(() =>
    import('./ListeningSession').then((m) => ({ default: m.ListeningSession })),
  ),
  pronunciation: lazyWithReload(() =>
    import('./PronunciationSession').then((m) => ({
      default: m.PronunciationSession,
    })),
  ),
  grammar: lazyWithReload(() =>
    import('./GrammarSession').then((m) => ({ default: m.GrammarSession })),
  ),
  tenses: lazyWithReload(() =>
    import('./TensesSession').then((m) => ({ default: m.TensesSession })),
  ),
  conjugation: lazyWithReload(() =>
    import('./ConjugationSession').then((m) => ({ default: m.ConjugationSession })),
  ),
  'weak-words': lazyWithReload(() =>
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
