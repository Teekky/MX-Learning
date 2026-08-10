/**
 * Keyboard hint that hides itself on touch devices.
 *
 * "Press Enter to submit" is worse than useless on a phone: there is no
 * Enter key to press, and the line eats a row of vertical space on the
 * screen that has the least of it. Wrap every keyboard instruction in this
 * and it simply is not rendered where it cannot be followed.
 */

import type { ReactNode } from 'react'
import { useCoarsePointer } from '@/utils/usePointer'
import { cn } from './cn'

export function KeyHint({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const coarse = useCoarsePointer()
  if (coarse) return null
  return (
    <p className={cn('mt-4 text-center text-xs text-text-subtle', className)}>
      {children}
    </p>
  )
}

/** A single key cap, for use inside `KeyHint`. */
export function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border-hair border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-2xs">
      {children}
    </kbd>
  )
}
