import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Dumbbell,
  LayoutDashboard,
  Library,
  Settings,
  User,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

type NavEntry = {
  to: string
  label: string
  Icon: React.ElementType
}

const ENTRIES: NavEntry[] = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/practice', label: 'Practice', Icon: Dumbbell },
  { to: '/deck', label: 'My Deck', Icon: Library },
  { to: '/profile', label: 'Profile', Icon: User },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

const EXPANDED_W = 240
const COLLAPSED_W = 68

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
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
      className="flex shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-bg-elevated/40 px-3 py-6"
    >
      {/* Brand */}
      <div className="mb-8 flex h-8 items-center gap-2 px-1">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-accent shadow-lg shadow-accent/30" />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="whitespace-nowrap font-display text-lg font-semibold tracking-tight"
          >
            MX Learning
          </motion.span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1">
        {ENTRIES.map((e) => (
          <NavLink
            key={e.to}
            to={e.to}
            end={e.to === '/'}
            title={collapsed ? e.label : undefined}
            className={({ isActive }) =>
              `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent-subtle text-text'
                  : 'text-text-muted hover:bg-bg-subtle hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <e.Icon
                  size={18}
                  className={`shrink-0 ${isActive ? 'text-accent' : 'text-accent'}`}
                />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap"
                  >
                    {e.label}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label={
          mobileToggleLabel ?? (collapsed ? 'Expand sidebar' : 'Collapse sidebar')
        }
        title={
          mobileToggleLabel ?? (collapsed ? 'Expand sidebar' : 'Collapse sidebar')
        }
        className="mt-auto flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-muted transition-all hover:bg-bg-subtle hover:text-text"
      >
        {mobileToggleLabel ? (
          <X size={18} className="shrink-0 text-accent" />
        ) : (
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0"
          >
            <ChevronLeft size={18} className="text-accent" />
          </motion.div>
        )}
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="whitespace-nowrap"
          >
            {mobileToggleLabel ?? 'Collapse'}
          </motion.span>
        )}
      </button>
    </motion.aside>
  )
}
