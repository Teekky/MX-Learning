/**
 * Stat tile — one number, labelled, optionally trending.
 *
 * The number is the hero: display face, tight tracking, large. Everything
 * else is support. Tiles are designed to sit in a `grid` of 2 on a phone
 * and 3–4 on a desktop without any per-screen tuning.
 */

import type { ReactNode } from 'react'
import { cn } from './cn'

export interface StatProps {
  label: string
  value: ReactNode
  /** Small text under the value — a unit, a comparison, a target. */
  detail?: ReactNode
  /** Icon shown top-right, at low emphasis. */
  icon?: ReactNode
  /** Colours the value. Use sparingly — a wall of colour says nothing. */
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger'
  /** Raise to an ink card. Reserve for the single most important tile. */
  emphasis?: boolean
  className?: string
}

const TONE = {
  default: 'text-text',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const

export function Stat({
  label,
  value,
  detail,
  icon,
  tone = 'default',
  emphasis = false,
  className,
}: StatProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl p-4',
        emphasis
          ? 'border-hair border-ink bg-bg-elevated'
          : 'border-hair border-border bg-bg-elevated',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wider text-text-subtle">
          {label}
        </span>
        {icon && <span className="shrink-0 text-text-subtle">{icon}</span>}
      </div>
      <span
        className={cn(
          'mt-2 font-display text-2xl font-semibold tabular-nums',
          TONE[tone],
        )}
      >
        {value}
      </span>
      {detail && <span className="mt-1 text-xs text-text-muted">{detail}</span>}
    </div>
  )
}

/**
 * Horizontal progress meter. `transform: scaleX` rather than an animated
 * width, so the browser can run it on the compositor.
 */
export function Meter({
  value,
  max,
  tone = 'accent',
  label,
}: {
  value: number
  max: number
  tone?: 'accent' | 'success' | 'warning'
  label?: string
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const FILL = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
  } as const
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full border-hair border-border bg-bg-subtle"
    >
      <div
        className={cn('h-full origin-left rounded-full transition-transform duration-slow ease-out', FILL[tone])}
        style={{ transform: `scaleX(${pct})` }}
      />
    </div>
  )
}
