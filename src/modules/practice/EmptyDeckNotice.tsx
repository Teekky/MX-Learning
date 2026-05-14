/**
 * Shared empty-state for SRS practice modules.
 *
 * Two distinct situations users hit:
 *   1. Deck truly empty  — no words imported yet. Tell them to import.
 *   2. Deck has words, nothing due right now — point them at the drill
 *      surface or a non-SRS mode instead of a dead-end "come back later".
 *
 * The previous one-size message ("Nothing due right now. Come back
 * later.") was actively misleading for users who had just cleared the
 * seed and wondered where to start. This component fixes that.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '@/db/database'

interface Props {
  /** Label for the screen title — shown when the deck IS populated but nothing's due. */
  mode?: string
}

export function EmptyDeckNotice({ mode }: Props) {
  const [wordCount, setWordCount] = useState<number | null>(null)

  useEffect(() => {
    // Count raw — no CEFR filter — so we know whether the deck is literally empty.
    db.words.count().then(setWordCount)
  }, [])

  if (wordCount === null) {
    return <div className="text-center text-text-muted">Loading…</div>
  }

  if (wordCount === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle">
          <span className="text-2xl text-accent">◓</span>
        </div>
        <h1 className="font-display text-2xl font-semibold">
          Your deck is empty.
        </h1>
        <p className="text-text-muted">
          Paste an English article, email, or any text you care about. We'll
          pull out the words worth learning and add them to your deck —
          that's what every practice mode draws from.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/practice/import" className="btn-primary">
            Learn from anything →
          </Link>
          <Link to="/practice" className="btn-ghost">
            Back to menu
          </Link>
        </div>
      </div>
    )
  }

  // Deck has words but nothing is due right now.
  return (
    <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bg-subtle">
        <span className="text-2xl text-text-muted">○</span>
      </div>
      <h1 className="font-display text-2xl font-semibold">
        Nothing due right now.
      </h1>
      <p className="text-text-muted">
        Your {wordCount} saved word{wordCount === 1 ? '' : 's'} {wordCount === 1 ? 'is' : 'are'} all
        caught up. Drill your weakest cards, practice without the SRS schedule,
        or import new content to grow the deck.
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link to="/practice/weak-words" className="btn-primary">
          Drill weakest words
        </Link>
        <Link to="/practice/import" className="btn-ghost">
          Import more text
        </Link>
        <Link to="/practice" className="btn-ghost">
          Back to menu{mode ? ` (skip ${mode})` : ''}
        </Link>
      </div>
    </div>
  )
}
