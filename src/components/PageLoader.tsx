/**
 * Standard loading + empty-state primitives.
 *
 * Pages used to be inconsistent: some returned `null`, others showed bare
 * text, others showed nothing for half a second. These tiny components
 * give every surface the same visual rhythm — a soft "..." dot animation
 * for loading, a friendly card for true empty states.
 */

import { motion } from 'framer-motion'

/**
 * Loading placeholder, sized to fit the current main column. Use it
 * any time you'd otherwise return `null` while waiting for data.
 */
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-text-muted"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-1.5">
        <Dot delay={0} />
        <Dot delay={0.15} />
        <Dot delay={0.3} />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  )
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="inline-block h-2 w-2 rounded-full bg-text-subtle"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  )
}

/**
 * Friendly empty-state card. Used when a list/section legitimately has
 * nothing to show, with a short message and an optional action.
 */
export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon?: string
  title: string
  body?: string
  /** Render a CTA below — typically a `<Link>` styled as a button. */
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-subtle/40 p-8 text-center">
      {icon && (
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-2xl text-accent">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-text">{title}</h3>
      {body && (
        <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">{body}</p>
      )}
      {children && <div className="mt-4 flex justify-center gap-3">{children}</div>}
    </div>
  )
}
