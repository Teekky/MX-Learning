import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { levelFromXp } from '@/utils/levels'

interface Props {
  showBurger?: boolean
  onBurgerClick?: () => void
}

export function TopBar({ showBurger, onBurgerClick }: Props) {
  const stats = useAppStore((s) => s.stats)
  const combo = useAppStore((s) => s.combo)

  const lvl = stats ? levelFromXp(stats.xp) : null

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border-subtle bg-bg-elevated/60 px-4 py-3 backdrop-blur sm:px-6">
      {/* Left: burger (mobile) + Level & XP */}
      <div className="flex min-w-0 items-center gap-3">
        {showBurger && (
          <button
            type="button"
            onClick={onBurgerClick}
            aria-label="Open navigation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text"
          >
            <BurgerIcon />
          </button>
        )}
        {lvl && (
          <>
            <div className="flex min-w-0 flex-col">
              <span className="text-xs uppercase tracking-wider text-text-subtle">
                {lvl.name}
              </span>
              <span className="truncate font-display text-sm font-medium text-text">
                Level {lvl.level + 1} ·{' '}
                <span className="text-accent">{stats!.xp.toLocaleString()}</span>
                <span className="text-text-subtle">
                  {' '}/ {lvl.next.toLocaleString()} XP
                </span>
              </span>
            </div>
            {/* XP progress bar */}
            <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-bg-subtle sm:block md:w-40">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={false}
                animate={{ width: `${lvl.progress * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </>
        )}
      </div>

      {/* Right: combo + key status */}
      <div className="flex shrink-0 items-center gap-3">
        {combo.count > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              combo.multiplierActive
                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                : 'bg-bg-subtle text-text-muted'
            }`}
          >
            <span>×{combo.count}</span>
            {combo.multiplierActive && (
              <span className="hidden sm:inline"> · 2× XP</span>
            )}
          </motion.div>
        )}
      </div>
    </header>
  )
}

function BurgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  )
}
