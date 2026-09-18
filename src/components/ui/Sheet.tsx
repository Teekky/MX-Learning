/**
 * Sheet — a modal that rises from the bottom on a phone and centres itself
 * on a desktop.
 *
 * Bottom-anchored on mobile for the obvious reason: that is where the thumb
 * is. It traps focus, closes on Escape and on backdrop click, and pads
 * itself clear of the gesture bar.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  /** Optional line under the title. */
  description?: string
  children: ReactNode
  /** Pinned action row at the bottom, inside the thumb zone. */
  footer?: ReactNode
  className?: string
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  /* Escape closes; Tab is kept inside the panel while it is open. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  /* Freeze the page behind the sheet so scrolling doesn't leak through. */
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  /* Move focus into the panel when it opens. */
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
        )
        ?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-text/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden',
              'rounded-t-2xl border-hair border-border bg-bg-elevated shadow-float',
              'sm:max-w-lg sm:rounded-2xl',
              className,
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b-hair border-border-subtle px-6 py-5">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-text-muted">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="press -mr-2 -mt-2 flex h-tap w-tap shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-bg-subtle hover:text-text"
              >
                <X size={20} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <footer className="thumb-zone flex flex-wrap items-center justify-end gap-3 border-t-hair border-border-subtle px-6 pt-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
