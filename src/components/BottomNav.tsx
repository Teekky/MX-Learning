/**
 * Mobile navigation, anchored where the thumb is.
 *
 * A sidebar behind a hamburger costs two taps and a reach to the top-left
 * corner — the single worst place to put anything on a 6.8" phone. This bar
 * sits in the thumb arc, clears the gesture bar via `--safe-bottom`, and
 * gives every target the full 48dp minimum.
 *
 * Review is promoted to the centre and styled as the one thing you came
 * here to do. The rest of the app hangs off "More".
 */

import { NavLink } from 'react-router-dom'
import { Home, Layers, MoreHorizontal, Sparkles, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './ui'

interface Entry {
  to: string
  label: string
  Icon: LucideIcon
  end?: boolean
}

const LEFT: Entry[] = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/deck', label: 'Deck', Icon: Layers },
]

const RIGHT: Entry[] = [
  { to: '/practice', label: 'Practice', Icon: Sparkles },
]

export function BottomNav({
  onMore,
  dueCount,
}: {
  onMore: () => void
  /** Badge on the review button — the reason to open the app at all. */
  dueCount?: number
}) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t-hair border-border bg-bg-elevated/95 backdrop-blur"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="edge-x mx-auto flex h-nav max-w-lg items-stretch justify-between">
        {LEFT.map((e) => (
          <NavItem key={e.to} entry={e} />
        ))}

        {/* --- The centre action --------------------------------------- */}
        <NavLink
          to="/review"
          aria-label={
            dueCount != null && dueCount > 0
              ? `Review — ${dueCount} card${dueCount === 1 ? '' : 's'} due`
              : 'Review'
          }
          className="press relative -mt-5 flex w-16 shrink-0 flex-col items-center justify-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-ink border-stroke bg-accent text-on-accent shadow-md">
            <Zap size={24} />
          </span>
          {dueCount != null && dueCount > 0 && (
            <span className="absolute -right-0.5 top-0 min-w-[22px] rounded-full border-hair border-stroke bg-bg-elevated px-1.5 py-0.5 text-center font-mono text-2xs font-semibold tabular-nums text-text">
              {dueCount > 99 ? '99+' : dueCount}
            </span>
          )}
        </NavLink>

        {RIGHT.map((e) => (
          <NavItem key={e.to} entry={e} />
        ))}

        <button
          type="button"
          onClick={onMore}
          aria-label="More"
          className="press flex min-w-tap flex-1 flex-col items-center justify-center gap-0.5 text-text-subtle"
        >
          <MoreHorizontal size={22} />
          <span className="text-2xs font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}

function NavItem({ entry }: { entry: Entry }) {
  return (
    <NavLink
      to={entry.to}
      end={entry.end}
      className={({ isActive }) =>
        cn(
          'press flex min-w-tap flex-1 flex-col items-center justify-center gap-0.5',
          isActive ? 'text-accent' : 'text-text-subtle',
        )
      }
    >
      {({ isActive }) => (
        <>
          <entry.Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
          <span className="text-2xs font-medium">{entry.label}</span>
        </>
      )}
    </NavLink>
  )
}
