/**
 * Top bar — level, XP progress, live combo, and the staging warning.
 *
 * It no longer carries a hamburger: on mobile the BottomNav owns navigation,
 * which frees this row to be purely informational. It stays sticky so the
 * XP bar is visible while you scroll a long deck.
 */

import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { levelFromXp } from '@/utils/levels'
import { IS_DEMO } from '@/config'

export function TopBar() {
  const stats = useAppStore((s) => s.stats)
  const combo = useAppStore((s) => s.combo)

  const lvl = stats ? levelFromXp(stats.xp) : null

  return (
    <>
      {/* Impossible to mistake staging for the real thing. */}
      {IS_DEMO && (
        <div
          role="status"
          className="border-b-hair border-warning/40 bg-warning/15 px-4 py-1.5 text-center font-mono text-2xs font-semibold uppercase tracking-wider text-warning"
        >
          Demo database — your real deck is untouched
        </div>
      )}

      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-hair border-border-subtle bg-bg/85 px-4 py-3 backdrop-blur sm:px-6"
        style={{ paddingTop: 'calc(var(--space-3) + var(--safe-top))' }}
      >
        {/* --- Level & XP ---------------------------------------------- */}
        <div className="flex min-w-0 items-center gap-3">
          {lvl && (
            <>
              <div className="flex min-w-0 flex-col">
                <span className="font-mono text-2xs uppercase tracking-wider text-text-subtle">
                  {lvl.name}
                </span>
                <span className="truncate text-sm font-semibold text-text">
                  Level {lvl.level + 1}
                  <span className="ml-1.5 font-sans font-normal tabular-nums text-text-muted">
                    {stats!.xp.toLocaleString()}
                    <span className="text-text-subtle"> / {lvl.next.toLocaleString()} XP</span>
                  </span>
                </span>
              </div>
              <div className="hidden h-2 w-32 overflow-hidden rounded-full border-hair border-border bg-bg-subtle sm:block md:w-40">
                <motion.div
                  className="h-full origin-left rounded-full bg-accent"
                  initial={false}
                  animate={{ scaleX: lvl.progress }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: '100%' }}
                />
              </div>
            </>
          )}
        </div>

        {/* --- Combo ---------------------------------------------------- */}
        <div className="flex shrink-0 items-center gap-3">
          {stats && stats.currentStreak > 0 && (
            <span
              className="font-mono text-xs font-semibold tabular-nums text-text-muted"
              title={`${stats.currentStreak}-day streak`}
            >
              🔥 {stats.currentStreak}
            </span>
          )}
          {combo.count > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-full border-hair px-3 py-1 font-mono text-xs font-semibold ${
                combo.multiplierActive
                  ? 'border-transparent bg-accent text-on-accent'
                  : 'border-border bg-bg-subtle text-text-muted'
              }`}
            >
              ×{combo.count}
              {combo.multiplierActive && (
                <span className="hidden sm:inline"> · 2× XP</span>
              )}
            </motion.div>
          )}
        </div>
      </header>
    </>
  )
}
