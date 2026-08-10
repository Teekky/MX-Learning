/**
 * "A new version is ready" banner.
 *
 * The service worker downloads updates in the background. It could apply
 * them silently, but a page that reloads itself mid-review — losing the card
 * you were halfway through grading — is worse than a two-second banner. So
 * the new version waits until you say so.
 *
 * Worth being explicit, because it is the question everyone asks: updating
 * the app does **not** touch your data. The service worker only replaces
 * HTML, JavaScript and CSS. Your deck, schedule, streak and history live in
 * IndexedDB, which the update never opens. The only thing that migrates the
 * database is an explicit Dexie version bump in src/db/database.ts, and those
 * migrations are additive.
 */

import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      /* Poll hourly so a long-lived tab — or an installed PWA that is never
         really closed — still notices a new build. */
      if (!registration) return
      setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="edge-x fixed inset-x-0 z-50"
      style={{
        bottom: 'calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--space-3))',
      }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-xl border-hair border-border bg-bg-elevated p-4 shadow-float">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-text">
            A new version is ready
          </p>
          <p className="mt-0.5 text-sm text-text-muted">
            Your deck and progress are not affected.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => void updateServiceWorker(true)}
          leading={<RefreshCw size={16} />}
        >
          Update
        </Button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Later"
          className="press flex h-tap w-tap shrink-0 items-center justify-center rounded-lg text-text-subtle hover:bg-bg-subtle hover:text-text"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
