/**
 * Top-level error boundary.
 *
 * `<Suspense>` only catches the *loading* state of a lazy chunk — if a page
 * throws while rendering (a bad AI response shape, a Dexie read that blew
 * up, a null the types said couldn't happen), React unmounts the whole tree
 * and the user gets a white screen with no way back. This catches that and
 * offers a door out.
 *
 * Class component because `getDerivedStateFromError` has no hook equivalent.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept to console only — no telemetry endpoint by design (local-first,
    // no tracking). Still invaluable when the user opens dev tools.
    console.error('[MX Learning] Uncaught render error:', error, info.componentStack)
  }

  private reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    /* A failed dynamic import almost always means a new build shipped while
       this tab was open — the old chunk URLs are gone. lazyWithReload tries
       to self-heal first; if we still land here, a manual reload is the fix. */
    const staleChunk =
      /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
        error.message,
      )

    if (staleChunk) {
      return (
        <div
          className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-6 text-center text-text"
          style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
        >
          <div className="w-full max-w-sm space-y-4">
            <div className="text-4xl" aria-hidden>
              ↻
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              A new version is ready
            </h1>
            <p className="text-sm text-text-muted">
              Reload to pick it up — your progress is saved.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-6 text-center text-text"
        style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="w-full max-w-sm space-y-4">
          <div className="text-4xl" aria-hidden>
            ⚠
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Something broke on this screen
          </h1>
          <p className="text-sm text-text-muted">
            Your progress is saved — this is just the view. Try again, or
            reload the app.
          </p>
          {import.meta.env.DEV && (
            <pre className="overflow-x-auto rounded-lg border-hair border-border bg-bg-subtle p-3 text-left text-2xs text-text-muted">
              {error.message}
            </pre>
          )}
          <div className="flex justify-center gap-2 pt-1">
            <button type="button" onClick={this.reset} className="btn-primary">
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-ghost"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    )
  }
}
