/**
 * The end-of-session screen, shared by every drill.
 *
 * This markup existed a dozen times over, copied file to file: the same
 * circle, the same three figures, the same two buttons — drifting slightly
 * each time it was pasted. One of them still carried a hard drop shadow from
 * the previous design language.
 *
 * Everything that genuinely differs between modules is a prop: the mark, the
 * sentence, and which numbers are worth showing. A time-attack round reports
 * accuracy; a spaced-repetition session reports how many cards it got
 * through. Nothing else about them should look different.
 */

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { buttonClass, Card } from '@/components/ui'

export interface SessionStat {
  label: string
  value: ReactNode
}

export interface SessionCompleteProps {
  /** Single glyph in the medallion. Defaults to a tick. */
  icon?: ReactNode
  title: string
  /** One line under the title — context, not congratulation. */
  subtitle?: string
  /** Two to four figures. More than four stops being readable. */
  stats: SessionStat[]
  /** The "go again" action. Omit for modules you cannot simply repeat. */
  onRepeat?: () => void
  repeatLabel?: string
  /** Where the secondary link goes. Defaults to the practice menu. */
  backTo?: string
  backLabel?: string
  /** Anything module-specific — a correction list, a transcript. */
  children?: ReactNode
}

export function SessionComplete({
  icon = '✓',
  title,
  subtitle,
  stats,
  onRepeat,
  repeatLabel = 'Another round',
  backTo = '/practice',
  backLabel = 'Back to menu',
  children,
}: SessionCompleteProps) {
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18, mass: 0.7 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-on-accent shadow-md"
      >
        <span className="font-display text-3xl">{icon}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-display text-3xl font-semibold tracking-display text-text">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-text-muted">{subtitle}</p>}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card
          weight="ink"
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, minmax(0, 1fr))`,
          }}
        >
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-mono text-2xs uppercase tracking-wider text-text-subtle">
                {s.label}
              </div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-text">
                {s.value}
              </div>
            </div>
          ))}
        </Card>
      </motion.div>

      {children}

      {/* Actions last and full-width on a phone — the thumb is already low. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="thumb-zone flex flex-col gap-3 sm:flex-row sm:justify-center"
      >
        {onRepeat && (
          <button type="button" onClick={onRepeat} className={buttonClass('primary')}>
            {repeatLabel}
          </button>
        )}
        <Link to={backTo} className={buttonClass('ghost')}>
          {backLabel}
        </Link>
      </motion.div>
    </div>
  )
}
