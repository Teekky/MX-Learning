/**
 * End of the pile.
 *
 * The one moment in the app that is purely a reward, so it gets a real
 * animation: a stamp that lands with an overshoot, a ring that pulses out
 * behind it, and the numbers counting themselves up. All transform and
 * opacity — no layout thrash, no jank on the landing.
 */

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { buttonClass, Stat } from '@/components/ui'

export interface ReviewSummary {
  reviewed: number
  /** Cards graded Good or Easy on their first showing. */
  firstTry: number
  xp: number
  seconds: number
  /** Cards still due after this session (there was a per-session cap). */
  remaining: number
}

export function ReviewComplete({
  summary,
  onContinue,
}: {
  summary: ReviewSummary
  /** Start another batch from the still-due pile, without a page reload. */
  onContinue: () => void
}) {
  const accuracy =
    summary.reviewed > 0 ? Math.round((summary.firstTry / summary.reviewed) * 100) : 0
  const minutes = Math.floor(summary.seconds / 60)
  const seconds = summary.seconds % 60

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-gutter py-10 text-center">
      {/* --- The stamp ------------------------------------------------- */}
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border-ink border-accent/60"
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 1.35, opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
          aria-hidden
        />
        <motion.div
          className="flex h-24 w-24 items-center justify-center rounded-full bg-accent shadow-md"
          initial={{ scale: 0.3, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: -6, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 14, mass: 0.8 }}
        >
          <span className="font-display text-4xl font-semibold text-on-accent">✓</span>
        </motion.div>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="font-display text-3xl font-semibold text-text"
      >
        {summary.remaining > 0 ? 'Session done.' : 'Pile cleared.'}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="mt-2 text-text-muted"
      >
        {summary.remaining > 0
          ? `${summary.remaining} more card${summary.remaining === 1 ? '' : 's'} still due when you're ready.`
          : 'Nothing else is due today. Come back tomorrow and the schedule does the rest.'}
      </motion.p>

      {/* --- Numbers --------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 grid w-full grid-cols-2 gap-3"
      >
        <Stat label="Reviewed" value={<Counter to={summary.reviewed} />} emphasis />
        <Stat
          label="First try"
          value={<Counter to={accuracy} suffix="%" />}
          tone={accuracy >= 80 ? 'success' : accuracy >= 50 ? 'default' : 'warning'}
        />
        <Stat label="XP earned" value={<Counter to={summary.xp} prefix="+" />} tone="accent" />
        <Stat
          label="Time"
          value={minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
        />
      </motion.div>

      {/* --- Where to next --------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="thumb-zone mt-8 flex w-full flex-col gap-3"
      >
        {summary.remaining > 0 ? (
          <button
            type="button"
            onClick={onContinue}
            className={buttonClass('primary', 'lg', 'w-full')}
          >
            Keep going
          </button>
        ) : (
          <Link to="/practice" className={buttonClass('primary', 'lg', 'w-full')}>
            Practice something else
          </Link>
        )}
        <Link to="/" className={buttonClass('ghost', 'lg', 'w-full')}>
          Back to dashboard
        </Link>
      </motion.div>
    </div>
  )
}

/**
 * Counts from 0 to `to` over ~700 ms. Written by hand rather than with a
 * spring so the final value is exact — an animated stat that settles on 19
 * when you answered 20 questions is worse than no animation at all.
 */
function Counter({
  to,
  prefix = '',
  suffix = '',
}: {
  to: number
  prefix?: string
  suffix?: string
}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const duration = 700
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // Ease-out cubic — fast, then settles.
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(to * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [to])

  return (
    <span>
      {prefix}
      {value}
      {suffix}
    </span>
  )
}
