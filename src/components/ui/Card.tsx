/**
 * Card — the surface primitive.
 *
 * Two weights, and the distinction is the whole point of the design
 * language: `plain` is a hairline container that stays out of the way,
 * `ink` is a statement — 2px stroke, hard offset shadow. If every card on a
 * screen is `ink`, none of them are; keep it to one or two per view.
 */

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export type CardWeight = 'plain' | 'ink' | 'sunken'

const WEIGHT: Record<CardWeight, string> = {
  plain: 'border-hair border-border bg-bg-elevated',
  /* One step up, by line weight rather than elevation. */
  ink: 'border-hair border-ink bg-bg-elevated',
  /* Recessed well — for content that belongs *inside* another surface. */
  sunken: 'border-hair border-border-subtle bg-bg-subtle',
}

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const

/* `title` is omitted from the DOM props: the native attribute is a tooltip
   string, whereas ours is rendered heading content. */
export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  weight?: CardWeight
  padding?: keyof typeof PADDING
  /** Heading rendered at the top of the card. */
  title?: ReactNode
  /** Small text under the title. */
  subtitle?: ReactNode
  /** Right-aligned content on the title row (a link, a count, a menu). */
  action?: ReactNode
}

export function Card({
  weight = 'plain',
  padding = 'md',
  title,
  subtitle,
  action,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn('rounded-xl', WEIGHT[weight], PADDING[padding], className)}
      {...rest}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
