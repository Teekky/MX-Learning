/**
 * Aussie — "Learn the words" browser.
 *
 * A free-standing flashcard browser through every word in a domain, at
 * the learner's own pace. Independent of the quiz: leaving early loses
 * nothing (the same words are still there next time), and finishing adds
 * every word in the domain to the main deck so they enter the ordinary
 * FSRS review cycle.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Languages, Volume2 } from 'lucide-react'
import { getAussieDomain } from '@/data/aussie/domains'
import { addManyToDeck } from '@/db/words'
import { markAussieTaught } from '@/utils/aussieProgress'
import { speak } from '@/audio/tts'
import { useAppStore } from '@/store/useAppStore'
import type { AussieDomain } from '@/types'

export function AussieLearnSession() {
  const { domainId } = useParams<{ domainId: string }>()
  const domain = domainId ? getAussieDomain(domainId) : undefined

  if (!domain || !domain.ready) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-display text-2xl font-semibold">
          This domain isn't ready yet.
        </h1>
        <Link to="/aussie" className="btn-ghost inline-flex">
          ← All domains
        </Link>
      </div>
    )
  }

  return <LearnBody domain={domain} />
}

function LearnBody({ domain }: { domain: AussieDomain }) {
  const navigate = useNavigate()
  const settings = useAppStore((s) => s.settings)
  const [index, setIndex] = useState(0)
  const [showFrench, setShowFrench] = useState(false)
  const [done, setDone] = useState(false)

  const word = domain.words[index]

  // Hear the word the moment its flashcard appears — no need to reach for
  // the play button every single time.
  useEffect(() => {
    if (done) return
    void speak(word.lemma, { preferAustralian: settings?.aussieAccent ?? true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.lemma, done])

  async function finish() {
    await markAussieTaught(domain.id)
    await addManyToDeck(
      domain.words.map(({ icon: _icon, ...rest }) => ({ ...rest, source: 'user' as const })),
    )
    setDone(true)
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl space-y-6 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle text-accent">
          <domain.icon size={28} aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">All learned</h1>
          <p className="mt-1 text-text-muted">
            All {domain.words.length} words from {domain.name} are now in your
            deck for regular review.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate(`/aussie/${domain.id}`)} className="btn-ghost">
            ← Back to domain
          </button>
          <button onClick={() => navigate(`/aussie/${domain.id}/quiz/0`)} className="btn-primary">
            Take the quiz →
          </button>
        </div>
      </motion.div>
    )
  }

  const isLast = index === domain.words.length - 1

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        to={`/aussie/${domain.id}`}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        ← Back to domain
      </Link>

      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
            <domain.icon size={22} className="text-accent" aria-hidden />
            {domain.name}
          </h1>
          <p className="text-sm text-text-muted">
            Word {index + 1} / {domain.words.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFrench((v) => !v)}
          aria-pressed={showFrench}
          className={`press inline-flex min-h-tap shrink-0 items-center gap-2 rounded-lg border-hair px-3 text-sm font-medium transition-colors ${
            showFrench
              ? 'border-accent bg-accent-subtle text-text'
              : 'border-border bg-bg-subtle text-text-muted hover:text-text'
          }`}
        >
          <Languages size={16} aria-hidden />
          {showFrench ? 'Hide French' : 'Français'}
        </button>
      </header>

      <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={false}
          animate={{ width: `${((index + 1) / domain.words.length) * 100}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={word.lemma}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="card space-y-3"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-semibold text-text">
              {word.lemma}
            </h2>
            <button
              type="button"
              onClick={() =>
                void speak(word.lemma, { preferAustralian: settings?.aussieAccent ?? true })
              }
              aria-label={`Hear "${word.lemma}" pronounced`}
              className="press flex h-tap w-tap items-center justify-center rounded-full border-hair border-border text-text-muted hover:bg-bg-subtle hover:text-text"
            >
              <Volume2 size={18} />
            </button>
          </div>
          <p className="text-text">{word.definitionEn}</p>
          {word.examples[0] && (
            <p className="text-sm italic text-text-muted">“{word.examples[0].en}”</p>
          )}
          {showFrench && word.fr && <p className="text-sm text-accent">{word.fr}</p>}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end">
        <button
          onClick={() => (isLast ? void finish() : setIndex(index + 1))}
          className="btn-primary"
        >
          {isLast ? 'Finish learning →' : 'Next word →'}
        </button>
      </div>
    </div>
  )
}
