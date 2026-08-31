/**
 * Desktop sidebar (and, on mobile, the "More" drawer).
 *
 * Review sits at the top and is styled as a primary action rather than a
 * nav link — it is the thing this app exists to make you do, and burying it
 * in a list of five equal-weight items would be a lie about the hierarchy.
 */

import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Home,
  Layers,
  Quote,
  Settings,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { IS_DEMO } from '@/config'

type NavEntry = {
  to: string
  label: string
  Icon: React.ElementType
  end?: boolean
}

const ENTRIES: NavEntry[] = [
  { to: '/', label: 'Dashboard', Icon: Home, end: true },
  { to: '/practice', label: 'Practice', Icon: Sparkles },
  { to: '/deck', label: 'My Deck', Icon: Layers },
  { to: '/idioms', label: 'Idioms', Icon: Quote },
  { to: '/profile', label: 'Profile', Icon: User },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

const EXPANDED_W = 248
const COLLAPSED_W = 76

interface Props {
  collapsed: boolean
  onToggle: () => void
  mobileToggleLabel?: string
}

export function Sidebar({ collapsed, onToggle, mobileToggleLabel }: Props) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      /* `sticky top-0` keeps the nav in place while the page scrolls. Without
         it the sidebar is just a very tall column that scrolls away with
         everything else, which is what it was doing. */
      className="sticky top-0 flex h-[100dvh] shrink-0 flex-col overflow-y-auto border-r-hair border-border bg-bg-elevated px-3 py-5"
      style={{ paddingTop: 'calc(var(--space-5) + var(--safe-top))' }}
    >
      {/* --- Brand ----------------------------------------------------- */}
      <div className="mb-6 flex h-10 items-center gap-3 px-1">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent"
          aria-hidden
        >
          <span className="font-display text-base font-semibold text-on-accent">M</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="block truncate font-display text-base font-semibold tracking-display">
              MX Learning
            </span>
            {IS_DEMO && (
              <span className="font-mono text-2xs font-semibold uppercase tracking-wider text-warning">
                demo data
              </span>
            )}
          </div>
        )}
      </div>

      {/* --- The one action that matters ------------------------------- */}
      <NavLink
        to="/review"
        title={collapsed ? 'Review' : undefined}
        className="press mb-5 flex min-h-tap items-center gap-3 rounded-lg bg-accent px-3 font-semibold text-on-accent"
      >
        <Zap size={20} className="shrink-0" />
        {!collapsed && <span className="whitespace-nowrap">Review</span>}
      </NavLink>

      {/* --- Everything else -------------------------------------------- */}
      <nav className="flex flex-col gap-1">
        {ENTRIES.map((e) => (
          <NavLink
            key={e.to}
            to={e.to}
            end={e.end}
            title={collapsed ? e.label : undefined}
            className={({ isActive }) =>
              `flex min-h-tap items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-fast ${
                isActive
                  ? 'bg-accent-subtle text-text'
                  : 'text-text-muted hover:bg-bg-subtle hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <e.Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 2}
                  className={`shrink-0 ${isActive ? 'text-accent' : 'text-text-subtle'}`}
                />
                {!collapsed && <span className="whitespace-nowrap">{e.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* --- Collapse / close ------------------------------------------- */}
      <button
        onClick={onToggle}
        aria-label={mobileToggleLabel ?? (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
        className="mt-auto flex min-h-tap items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-subtle transition-colors duration-fast hover:bg-bg-subtle hover:text-text"
      >
        {mobileToggleLabel ? (
          <X size={20} className="shrink-0" />
        ) : (
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0"
          >
            <ChevronLeft size={20} />
          </motion.div>
        )}
        {!collapsed && (
          <span className="whitespace-nowrap">{mobileToggleLabel ?? 'Collapse'}</span>
        )}
      </button>
    </motion.aside>
  )
}
