/**
 * Badge — compact metadata.
 *
 * Used for CEFR level, part of speech, register, and regional variant. All
 * of these are *facts about a word*, so they share one visual treatment and
 * differ only in colour, which keeps the review card readable at a glance
 * instead of turning into a sticker album.
 */

import type { ReactNode } from 'react'
import type { Level, Word } from '@/types'
import { cn } from './cn'

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'

const TONE: Record<BadgeTone, string> = {
  neutral: 'border-transparent bg-bg-subtle text-text-muted',
  accent: 'border-transparent bg-accent-subtle text-accent',
  success: 'border-transparent bg-success/12 text-success',
  warning: 'border-transparent bg-warning/12 text-warning',
  danger: 'border-transparent bg-danger/12 text-danger',
  outline: 'border-stroke bg-transparent text-text-muted',
}

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  title?: string
}

export function Badge({ tone = 'neutral', children, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border-hair px-2 py-0.5',
        'font-mono text-2xs font-semibold uppercase tracking-wider',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Domain badges                                                      */
/* ------------------------------------------------------------------ */

/** A1–A2 read as "settled", B1–B2 as "current work", C1–C2 as "stretch". */
const LEVEL_TONE: Record<Level, BadgeTone> = {
  A1: 'success',
  A2: 'success',
  B1: 'accent',
  B2: 'accent',
  C1: 'warning',
  C2: 'warning',
}

export function LevelBadge({ level }: { level: Level }) {
  return (
    <Badge tone={LEVEL_TONE[level]} title={`CEFR level ${level}`}>
      {level}
    </Badge>
  )
}

/** Where an expression is socially safe to use. */
export function RegisterBadge({ register }: { register: NonNullable<Word['register']> }) {
  const label = { informal: 'informal', neutral: 'neutral', formal: 'formal' }[register]
  const tone: BadgeTone =
    register === 'informal' ? 'warning' : register === 'formal' ? 'accent' : 'neutral'
  return (
    <Badge tone={tone} title={`Register: ${label}`}>
      {label}
    </Badge>
  )
}

/** Regional variant. `both` is deliberately not rendered — it is the default. */
export function VariantBadge({ variant }: { variant: NonNullable<Word['variant']> }) {
  if (variant === 'both') return null
  return (
    <Badge
      tone="outline"
      title={variant === 'BrE' ? 'British English' : 'American English'}
    >
      {variant}
    </Badge>
  )
}
