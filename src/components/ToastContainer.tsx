/**
 * Floating toast stack — shows transient notifications such as achievement
 * unlocks. Mounted once in the app shell; driven by the Zustand store.
 *
 * Each toast auto-dismisses after `AUTO_DISMISS_MS`. Clicking a toast also
 * dismisses it. Stacks bottom-right with spring-in / fade-out animation to
 * keep the interruption gentle.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useAppStore, type Toast } from '@/store/useAppStore'

const AUTO_DISMISS_MS = 5200

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 flex-col items-end gap-3">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useAppStore((s) => s.dismissToast)

  useEffect(() => {
    const h = window.setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS)
    return () => window.clearTimeout(h)
  }, [toast.id, dismiss])

  return (
    <motion.button
      type="button"
      onClick={() => dismiss(toast.id)}
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-border bg-bg-elevated p-4 text-left shadow-2xl shadow-black/40 hover:border-text-subtle"
    >
      {toast.icon && (
        <span className="mt-0.5 text-2xl leading-none text-accent">
          {toast.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-display text-sm font-semibold text-text">
          {toast.title}
        </div>
        {toast.body && (
          <div className="mt-0.5 text-xs text-text-muted">{toast.body}</div>
        )}
      </div>
    </motion.button>
  )
}
