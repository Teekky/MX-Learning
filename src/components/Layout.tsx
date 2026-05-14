/**
 * App shell — sidebar (collapsible on desktop, overlay drawer on mobile)
 * + top bar + outlet for routed pages.
 *
 * Responsive behaviour:
 *   - ≥ md (768px): sidebar is part of the layout, collapsible to icon-only.
 *     State is persisted to localStorage so it survives reloads.
 *   - < md: sidebar is hidden by default; a burger button in the TopBar
 *     opens it as an overlay drawer with a click-away backdrop. The
 *     "collapsed" state is irrelevant on mobile — the drawer always
 *     shows the full nav.
 */

import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from './ToastContainer'
import { TopBar } from './TopBar'

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

  /* True on viewports below md — switches the sidebar from inline to overlay. */
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches,
  )

  /* Mobile drawer open/closed — independent from the desktop "collapsed" flag. */
  const [drawerOpen, setDrawerOpen] = useState(false)

  const location = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // localStorage may be blocked (e.g. Brave shields) — ignore silently.
    }
  }, [collapsed])

  /* Track viewport size so the sidebar mode flips with the user's window. */
  useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`,
    )
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  /* Auto-close the mobile drawer on every navigation. */
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  /* Lock body scroll when the mobile drawer is open. */
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [drawerOpen])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      {/* Desktop: sidebar is part of the flex row.
          Mobile: sidebar is rendered as a fixed-position overlay. */}
      {!isMobile && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      )}

      {/* Mobile drawer + backdrop */}
      {isMobile && drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-bg/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-40 shadow-2xl">
            <Sidebar
              collapsed={false}
              onToggle={() => setDrawerOpen(false)}
              mobileToggleLabel="Close"
            />
          </div>
        </>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          showBurger={isMobile}
          onBurgerClick={() => setDrawerOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-8 md:py-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
