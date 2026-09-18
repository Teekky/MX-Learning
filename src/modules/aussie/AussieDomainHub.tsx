/**
 * Aussie — domain hub.
 *
 * The landing screen for one domain: three independent, always-available
 * paths — "Learn the words" (browse every word at your own pace), "Take
 * the quiz" (multiple-choice, recognition) and "Real-life context"
 * (typed cloze, production) — each quiz/context path split into named
 * parts (Part 1 / Part 2 / …), a fixed set of ~10 words. None of the
 * three gates the others — a learner can quiz or context-drill cold, or
 * browse without ever testing themselves.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, ChevronRight, MessageSquareText, PenSquare } from 'lucide-react'
import { getAussieDomain } from '@/data/aussie/domains'
import { aussiePartCount, aussiePartWords } from '@/utils/aussieParts'
import { getAussieProgress } from '@/utils/aussieProgress'
import { PageLoader } from '@/components/ui'
import type { AussieDomain, AussiePartResult, AussieProgress } from '@/types'

export function AussieDomainHub() {
  const { domainId } = useParams<{ domainId: string }>()
  const domain = domainId ? getAussieDomain(domainId) : undefined

  if (!domain || !domain.ready) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-display text-2xl font-semibold">
          This domain isn't ready yet.
        </h1>
        <p className="text-text-muted">
          It's on the map, but the vocabulary hasn't shipped for it.
        </p>
        <Link to="/aussie" className="btn-ghost inline-flex">
          ← All domains
        </Link>
      </div>
    )
  }

  return <HubBody domain={domain} />
}

function HubBody({ domain }: { domain: AussieDomain }) {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<AussieProgress | null | undefined>(null)

  useEffect(() => {
    getAussieProgress(domain.id).then((p) => setProgress(p ?? undefined))
  }, [domain.id])

  if (progress === null) return <PageLoader />

  const partCount = aussiePartCount(domain)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/aussie" className="text-sm text-text-muted transition-colors hover:text-text">
        ← All domains
      </Link>

      <header className="flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
          <domain.icon size={28} aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {domain.name}
          </h1>
          <p className="text-text-muted">{domain.blurb}</p>
        </div>
      </header>

      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        onClick={() => navigate(`/aussie/${domain.id}/learn`)}
        className="card flex w-full items-center gap-4 text-left transition-all"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent">
          <BookOpen size={22} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-semibold text-text">
            Learn the words
          </span>
          <span className="block text-sm text-text-muted">
            Browse all {domain.words.length} words at your own pace: meaning, example, pronunciation.
            {progress?.taughtAt && ' Learned at least once.'}
          </span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-text-subtle" aria-hidden />
      </motion.button>

      <PartSection
        title="Take the quiz"
        blurb="Recognition: pick the right definition."
        Icon={PenSquare}
        domain={domain}
        partCount={partCount}
        results={progress?.quizParts}
        buildHref={(i) => `/aussie/${domain.id}/quiz/${i}`}
      />

      <PartSection
        title="Real-life context"
        blurb="Production: type the missing word in a real sentence."
        Icon={MessageSquareText}
        domain={domain}
        partCount={partCount}
        results={progress?.contextParts}
        buildHref={(i) => `/aussie/${domain.id}/context/${i}`}
      />
    </div>
  )
}

function PartSection({
  title,
  blurb,
  Icon,
  domain,
  partCount,
  results,
  buildHref,
}: {
  title: string
  blurb: string
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
  domain: AussieDomain
  partCount: number
  results: Record<number, AussiePartResult> | undefined
  buildHref: (partIndex: number) => string
}) {
  const navigate = useNavigate()
  const done = results ? Object.keys(results).length : 0

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-accent" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
          <p className="text-sm text-text-muted">
            {blurb} · {done} / {partCount} part{partCount === 1 ? '' : 's'} tried.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: partCount }, (_, i) => i).map((i) => {
          const words = aussiePartWords(domain, i)
          const result = results?.[i]
          return (
            <motion.button
              key={i}
              type="button"
              whileHover={{ y: -2 }}
              onClick={() => navigate(buildHref(i))}
              className="card text-left transition-all"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-text">
                  Part {i + 1}
                </h3>
                {result && (
                  <span
                    className={`text-xs font-medium ${
                      result.bestScore >= words.length ? 'text-success' : 'text-text-subtle'
                    }`}
                  >
                    Best: {result.bestScore} / {words.length}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {words.length} question{words.length === 1 ? '' : 's'}
              </p>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
