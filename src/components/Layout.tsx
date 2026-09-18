/**
 * App shell.
 *
 * Two distinct layouts rather than one responsive compromise:
 *
 *   ≥ md  a collapsible sidebar on the left, the way a desktop tool works.
 *         Collapsed state persists to localStorage.
 *   < md  a bottom navigation bar in the thumb arc, plus a drawer behind
 *         "More" for the screens you visit weekly rather than daily.
 *
 * On a phone both chrome bars have to earn their space. The top bar (level,
 * XP, streak) is a dashboard widget, so it shows on the dashboard and nowhere
 * else. The bottom bar steps out entirely while a text field has focus —
 * mid-answer you need the screen, not the navigation.
 *
 * The review session does not use this shell at all — see App.tsx.
 */

import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { InstallPrompt } from './InstallPrompt'
import { Sidebar } from './Sidebar'
import { ToastContainer } from './ToastContainer'
import { TopBar } from './TopBar'
import { countDue } from '@/db/queries'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { useAppStore } from '@/store/useAppStore'
import { useTextEntryFocus } from '@/utils/useTextEntryFocus'

const STORAGE_KEY = 'mx:sidebar-collapsed'
const MOBILE_BREAKPOINT_PX = 768

export function Layout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  /* True on viewports below md — switches the whole navigation model. */
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches,
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [due, setDue] = useState<number>(0)

  const location = useLocation()
  const stats = useAppStore((s) => s.stats)
  const typing = useTextEntryFocus()
  const sessionReviews = useAppStore((s) => s.session.reviewsDone)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // localStorage may be blocked (e.g. Brave shields) — ignore silently.
    }
  }, [collapsed])

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  /* Auto-close the drawer on every navigation. Derived from the path rather
     than reset in an effect, so there is no render where the drawer is still
     open on the new page. */
  const [drawerPath, setDrawerPath] = useState(location.pathname)
  if (drawerPath !== location.pathname) {
    setDrawerPath(location.pathname)
    if (drawerOpen) setDrawerOpen(false)
  }

  /* Lock body scroll while the drawer is open. */
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  /* Due count for the review badge. Recomputed after every review and on
     each navigation, which is cheap and always current enough. */
  useEffect(() => {
    const levels = stats?.cefrLevel ? allowedLevelsFor(stats.cefrLevel) : undefined
    countDue(levels)
      .then(setDue)
      .catch(() => setDue(0))
  }, [stats?.cefrLevel, sessionReviews, location.pathname])

  /* The XP/level row belongs to the dashboard on a phone: anywhere else it is
     a permanent band of score-keeping above the content you opened the screen
     for. Desktop has the height to spare, so it keeps the row everywhere. */
  const showStats = !isMobile || location.pathname === '/'

  /* Navigation yields the floor to the keyboard. */
  const showBottomNav = isMobile && !typing

  return (
    <div className="flex min-h-[100dvh] bg-bg text-text">
      {/* --- Desktop sidebar ------------------------------------------ */}
      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      )}

      {/* --- Mobile drawer, behind "More" ------------------------------ */}
      {isMobile && drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-text/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 shadow-float">
            <Sidebar
              collapsed={false}
              onToggle={() => setDrawerOpen(false)}
              mobileToggleLabel="Close"
            />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar showStats={showStats} />
        <main
          className={[
            'edge-x flex-1 py-5 md:px-8 md:py-6',
            /* With no header above it, content would otherwise start under
               the notch on a device that has one. */
            showStats ? '' : 'pt-safe-t',
            /* Clear the bottom bar (and the gesture bar under it) so the last
               row of content is never trapped behind navigation. While the
               keyboard is up there is no bar left to clear — only the gesture
               area — and every pixel of the shrunken viewport counts. */
            showBottomNav
              ? 'pb-[calc(var(--bottom-nav-h)+var(--safe-bottom)+var(--space-6))]'
              : isMobile
                ? 'pb-[calc(var(--safe-bottom)+var(--space-4))]'
                : '',
          ].join(' ')}
        >
          <Outlet />
        </main>
      </div>

      {showBottomNav && (
        <BottomNav onMore={() => setDrawerOpen(true)} dueCount={due} />
      )}

      <InstallPrompt />
      <ToastContainer />
    </div>
  )
}
