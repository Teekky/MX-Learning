import { lazy, type ComponentType } from 'react'

/**
 * `React.lazy` with one automatic recovery from a stale chunk.
 *
 * Every deploy renames the hashed chunk files. A browser still running the
 * previous build — a tab left open, a phone waking from sleep — asks for the
 * old URLs, which now 404, and React throws:
 *
 *   "Failed to fetch dynamically imported module: …/PracticeSessionPage.tsx"
 *
 * The cure is always the same: reload, so the fresh `index.html` points at
 * the fresh chunks. We do it once per tab session, guarded so a genuinely
 * failing import (offline, a real 500) surfaces to the ErrorBoundary instead
 * of spinning in a reload loop.
 */
const RELOAD_KEY = 'mx:chunk-reload-at'
const RELOAD_COOLDOWN_MS = 10_000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory()
      try {
        sessionStorage.removeItem(RELOAD_KEY)
      } catch {
        /* storage blocked — nothing to clear */
      }
      return mod
    } catch (err) {
      let lastTry = 0
      try {
        lastTry = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
      } catch {
        /* storage blocked — treat as "never tried" */
      }

      // Reload only if we haven't just done so. A second failure inside the
      // cooldown means reloading won't help — let the error propagate.
      if (Date.now() - lastTry > RELOAD_COOLDOWN_MS) {
        try {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
        } catch {
          /* storage blocked — the reload below still runs, just unguarded */
        }
        window.location.reload()
        // Hang until the reload takes over so nothing renders in between.
        return new Promise<{ default: T }>(() => {})
      }

      throw err
    }
  })
}
