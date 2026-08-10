/**
 * Why isn't this installing?
 *
 * Chrome will only offer a real install when a handful of conditions all
 * hold at once, and when one fails it says nothing — it silently downgrades
 * the menu entry to "create a shortcut", which is just a bookmark with an
 * icon. On a phone there are no developer tools to go and look, so the app
 * reports on itself instead.
 *
 * Every row below is one of Chrome's actual preconditions, read live from
 * the page. If they are all green and Chrome still refuses, the problem is
 * outside this list; if one is red, that is the one to fix.
 */

import { useCallback, useEffect, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import { Button, Card, Notice, cn } from '@/components/ui'

interface Check {
  id: string
  label: string
  ok: boolean
  detail: string
  /** What to do when this one is the failure. */
  fix?: string
}

interface Report {
  installed: boolean
  origin: string
  checks: Check[]
}

async function runChecks(): Promise<Report> {
  const installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS reports it here instead; harmless to read on Android.
    (navigator as unknown as { standalone?: boolean }).standalone === true

  const checks: Check[] = []

  /* 1. Secure context — the gate everything else sits behind. */
  checks.push({
    id: 'secure',
    label: 'Secure context',
    ok: window.isSecureContext,
    detail: window.isSecureContext
      ? 'This origin counts as secure.'
      : 'Served over plain http on a non-local address.',
    fix:
      'On the phone: chrome://flags → "Insecure origins treated as secure" → Enabled, ' +
      `then put exactly ${window.location.origin} in its box — no trailing slash, ` +
      'no path — and tap Relaunch.',
  })

  /* 2. Service worker support. */
  const swSupported = 'serviceWorker' in navigator
  checks.push({
    id: 'sw-support',
    label: 'Service workers available',
    ok: swSupported,
    detail: swSupported
      ? 'The browser exposes the API.'
      : 'Not exposed — usually a consequence of the row above, or private browsing.',
    fix: 'Leave private/incognito browsing, then fix the secure-context row.',
  })

  /* 3. A service worker actually registered for this scope. */
  let swRegistered = false
  let swDetail = 'No registration found for this origin.'
  if (swSupported) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      const reg = regs[0]
      swRegistered = Boolean(reg)
      if (reg) {
        const worker = reg.active ?? reg.waiting ?? reg.installing
        swDetail = `${worker?.state ?? 'unknown'} · scope ${new URL(reg.scope).pathname}`
      }
    } catch (err) {
      swDetail = err instanceof Error ? err.message : 'Registration lookup failed.'
    }
  }
  checks.push({
    id: 'sw-registered',
    label: 'Service worker registered',
    ok: swRegistered,
    detail: swDetail,
    fix:
      'Reload the page once with the browser cache bypassed. If it stays red, ' +
      'clear this site’s data (Chrome ⋮ → Settings → Site settings → All sites → ' +
      'this address → Clear & reset) and load it again.',
  })

  /* 4. The manifest. */
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  let manifestOk = false
  let manifestDetail = 'No <link rel="manifest"> in the page.'
  if (manifestLink) {
    try {
      const res = await fetch(manifestLink.href)
      const json = (await res.json()) as {
        name?: string
        icons?: Array<{ sizes?: string }>
        display?: string
        start_url?: string
      }
      const sizes = (json.icons ?? []).flatMap((i) => (i.sizes ?? '').split(' '))
      const has192 = sizes.includes('192x192')
      const has512 = sizes.includes('512x512')
      const displayOk = ['standalone', 'fullscreen', 'minimal-ui'].includes(
        json.display ?? '',
      )
      manifestOk = Boolean(json.name) && has192 && has512 && displayOk
      manifestDetail = manifestOk
        ? `“${json.name}” · display ${json.display} · 192 + 512 icons`
        : `name:${json.name ? 'ok' : 'missing'} 192:${has192} 512:${has512} display:${json.display}`
    } catch {
      manifestDetail = 'The manifest could not be fetched or parsed.'
    }
  }
  checks.push({
    id: 'manifest',
    label: 'Web app manifest',
    ok: manifestOk,
    detail: manifestDetail,
    fix: 'Rebuild the app — this one is a packaging problem, not a device setting.',
  })

  return { installed, origin: window.location.origin, checks }
}

export function InstallDiagnostics() {
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    setBusy(true)
    void runChecks().then((r) => {
      setReport(r)
      setBusy(false)
    })
  }, [])

  useEffect(refresh, [refresh])

  const failing = report?.checks.find((c) => !c.ok)

  return (
    <Card
      title="Install check"
      subtitle={report ? report.origin : 'Reading…'}
      action={
        <Button
          size="sm"
          variant="quiet"
          onClick={refresh}
          disabled={busy}
          leading={<RefreshCw size={16} />}
        >
          Re-check
        </Button>
      }
      className="space-y-4"
    >
      {report?.installed && (
        <Notice tone="success">
          Running as an installed app — no address bar, works offline.
        </Notice>
      )}

      {report && !report.installed && !failing && (
        <Notice tone="success">
          Everything Chrome needs is in place. Open the ⋮ menu and look for
          <strong> Install app</strong>. If it still offers only a shortcut,
          close every tab on this address and load it once more.
        </Notice>
      )}

      {failing && (
        <Notice tone="warning">
          <strong>{failing.label}</strong> is what is blocking the install.
          {failing.fix && <> {failing.fix}</>}
        </Notice>
      )}

      <ul className="space-y-2">
        {report?.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                c.ok ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
              )}
              aria-hidden
            >
              {c.ok ? <Check size={13} /> : <X size={13} />}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-text">
                {c.label}
                <span className="sr-only">{c.ok ? ': pass' : ': fail'}</span>
              </div>
              <div className="font-mono text-xs text-text-subtle">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
