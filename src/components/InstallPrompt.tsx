/**
 * "Add to home screen" prompt for Android.
 *
 * Chrome fires `beforeinstallprompt` when the app qualifies for installation
 * (manifest + service worker + served over a secure origin). We capture that
 * event instead of letting Chrome show its own mini-infobar, and offer the
 * install at a moment that makes sense — not the first second of the first
 * visit, when the user has no idea whether they want this on their home
 * screen.
 *
 * Dismissal is remembered. A prompt that reappears every launch is an advert.
 */

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui'

/** Chrome-only event; not in the DOM lib types. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'mx:install-dismissed'
/** Don't ask again for this long after a dismissal. */
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
/** Wait until the user has actually done something before asking. */
const SHOW_AFTER_MS = 20_000

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Already installed — `display-mode: standalone` means we are running
    // from the home screen and there is nothing to offer.
    if (window.matchMedia('(display-mode: standalone)').matches) return

    try {
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0)
      if (dismissedAt && Date.now() - dismissedAt < SNOOZE_MS) return
    } catch {
      /* Storage blocked — fall through and offer it. */
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  /* Hold the banner back until the session has some substance to it. */
  useEffect(() => {
    if (!deferred) return
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [deferred])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {
      /* Nothing to do — it will simply be offered again next time. */
    }
  }

  async function install() {
    if (!deferred) return
    setVisible(false)
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'dismissed') dismiss()
    setDeferred(null)
  }

  if (!visible || !deferred) return null

  return (
    <div
      role="dialog"
      aria-label="Install MX Learning"
      className="fixed inset-x-0 z-50 edge-x"
      style={{
        /* Sits above the bottom navigation, clear of the gesture bar. */
        bottom: 'calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--space-3))',
      }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-xl border-hair border-border bg-bg-elevated p-4 shadow-float">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-text">
            Put this on your home screen
          </p>
          <p className="mt-0.5 text-sm text-text-muted">
            Full screen, works offline, and your progress on the phone stays on
            the phone.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => void install()}
          leading={<Download size={16} />}
        >
          Install
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="press flex h-tap w-tap shrink-0 items-center justify-center rounded-lg text-text-subtle hover:bg-bg-subtle hover:text-text"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
