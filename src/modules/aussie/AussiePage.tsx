/**
 * Aussie — domain picker.
 *
 * A grid of working-holiday-life domains (mining, farm work, hospitality…).
 * Each ready domain offers three independent paths — learn the words,
 * quiz on them, or drill them in real-life context — via its own hub
 * page. The rest are shown as "coming soon" placeholders so the shape of
 * the whole module is visible while content is built out one domain at
 * a time.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AUSSIE_DOMAINS } from '@/data/aussie/domains'
import { aussiePartCount } from '@/utils/aussieParts'
import { getAllAussieProgress } from '@/utils/aussieProgress'
import { PageLoader } from '@/components/ui'
import type { AussieProgress } from '@/types'

export function AussiePage() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<Record<string, AussieProgress> | null>(null)

  useEffect(() => {
    getAllAussieProgress().then(setProgress)
  }, [])

  if (!progress) return <PageLoader />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
          Aussie
        </h1>
        <p className="text-text-muted">
          Your PVT survival kit: the words for working and living in
          Australia, domain by domain. Learn the words, quiz yourself in
          short parts, or both, your call.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {AUSSIE_DOMAINS.map((d) => {
          const p = progress[d.id]
          const partCount = d.ready ? aussiePartCount(d) : 0
          const quizDone = p ? Object.keys(p.quizParts ?? {}).length : 0
          const contextDone = p ? Object.keys(p.contextParts ?? {}).length : 0
          return (
            <motion.button
              key={d.id}
              type="button"
              disabled={!d.ready}
              onClick={() => navigate(`/aussie/${d.id}`)}
              whileHover={d.ready ? { y: -2 } : undefined}
              className={`card text-left transition-all ${
                d.ready ? '' : 'cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-text">
                  <d.icon size={18} className="text-accent" aria-hidden />
                  {d.name}
                </h3>
                {!d.ready && (
                  <span className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-text-muted">{d.blurb}</p>
              {d.ready && (
                <div className="mt-3 flex items-center justify-between text-xs text-text-subtle">
                  <span>{d.words.length} words · {partCount} parts</span>
                  {p && (
                    <span className="font-medium text-accent">
                      {p.taughtAt ? 'Learned · ' : ''}
                      Quiz {quizDone}/{partCount} · Context {contextDone}/{partCount}
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
