/**
 * The three states every screen forgets: loading, empty, and broken.
 *
 * They live together so they stay consistent — same rhythm, same voice,
 * same vertical measure — and so no page has to invent its own.
 */

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from './cn'

/* ------------------------------------------------------------------ */
/*  Loading                                                            */
/* ------------------------------------------------------------------ */

/**
 * Minimal spinner: a rotating arc. Pure `transform`, so it never touches
 * layout and holds its frame rate under load.
 */
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="presentation"
      className={cn('animate-spin text-accent', className)}
      style={{ animationDuration: '0.8s' }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.18" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Full-column loading placeholder. Use anywhere you would otherwise return
 * `null` and leave the user staring at nothing.
 */
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-text-muted"
      role="status"
      aria-live="polite"
    >
      <Spinner size={28} />
      <span className="text-sm">{label}</span>
    </div>
  )
}

/**
 * Content-shaped placeholder for lists. Better than a spinner when you know
 * how many rows are coming: the page doesn't jump when they arrive.
 */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border-hair border-border-subtle bg-bg-subtle"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty                                                              */
/* ------------------------------------------------------------------ */

/**
 * Empty state — an invitation, not an apology.
 *
 * Always give it an action: an empty screen with no way forward is a
 * dead end, and the first-run deck is empty by design in this app.
 */
export function EmptyState({
  icon,
  title,
  body,
  children,
  className,
}: {
  /** A lucide icon element, or an emoji string. */
  icon?: ReactNode
  title: string
  body?: string
  /** The way out. A button or link — ideally exactly one primary action. */
  children?: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center rounded-xl border-ink border-stroke bg-bg-elevated',
        'px-6 py-10 text-center shadow-md',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-full',
            'border-ink border-stroke bg-accent-subtle text-2xl text-accent',
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-text">{title}</h3>
      {body && <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">{body}</p>}
      {children && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Broken                                                             */
/* ------------------------------------------------------------------ */

/**
 * Error state. Says what failed and offers the one thing that might fix
 * it — never a raw stack trace, never a shrug.
 */
export function ErrorState({
  title = 'That didn’t work',
  body,
  onRetry,
  retryLabel = 'Try again',
  children,
}: {
  title?: string
  body?: string
  onRetry?: () => void
  retryLabel?: string
  children?: ReactNode
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border-ink border-danger bg-danger/8 px-6 py-8 text-center"
    >
      <h3 className="font-display text-lg font-semibold text-text">{title}</h3>
      {body && <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">{body}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-ghost">
            {retryLabel}
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

/**
 * Inline, non-blocking notice. For "we saved it, but…" situations where a
 * full error state would be melodramatic.
 */
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success'
  children: ReactNode
}) {
  const TONE = {
    info: 'border-accent/40 bg-accent/8 text-text',
    warning: 'border-warning/50 bg-warning/10 text-text',
    danger: 'border-danger/50 bg-danger/10 text-text',
    success: 'border-success/50 bg-success/10 text-text',
  } as const
  return (
    <div className={cn('rounded-lg border-hair px-4 py-3 text-sm', TONE[tone])}>
      {children}
    </div>
  )
}
