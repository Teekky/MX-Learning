import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { countDue, countWords } from '@/db/queries'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { useAppStore } from '@/store/useAppStore'
import { TILES, LS_FAVORITES } from './practiceTiles'

function readFavorites(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LS_FAVORITES)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeFavorites(favs: Set<string>) {
  try {
    localStorage.setItem(LS_FAVORITES, JSON.stringify(Array.from(favs)))
  } catch {
    /* ignore */
  }
}

export function PracticePage() {
  const [stats, setStats] = useState<{ due: number; total: number } | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(() => readFavorites())
  const userStats = useAppStore((s) => s.stats)
  const cefrLevel = userStats?.cefrLevel

  useEffect(() => {
    const levels = cefrLevel ? allowedLevelsFor(cefrLevel) : undefined
    Promise.all([countDue(levels), countWords(levels)]).then(([due, total]) =>
      setStats({ due, total }),
    )
  }, [cefrLevel])

  function toggleFavorite(slug: string) {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      writeFavorites(next)
      return next
    })
  }

  const orderedTiles = [
    ...TILES.filter((t) => favorites.has(t.slug)),
    ...TILES.filter((t) => !favorites.has(t.slug)),
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
            Practice
          </h1>
          <p className="text-text-muted">
            Pick a mode. More unlock as you progress.
          </p>
        </div>
        {stats && (
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-text-subtle">
                Due now
              </div>
              <div className="font-display text-xl font-semibold text-accent">
                {stats.due}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-text-subtle">
                In your deck
              </div>
              <div className="font-display text-xl font-semibold text-text">
                {stats.total}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orderedTiles.map((t, i) => {
          const isFav = favorites.has(t.slug)
          const tileBody = (
            <>
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent">
                  <t.Icon size={20} />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleFavorite(t.slug)
                  }}
                  className={
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors ' +
                    (isFav
                      ? 'text-warning hover:bg-warning/10'
                      : 'text-text-subtle hover:bg-bg-subtle hover:text-text')
                  }
                  aria-label={isFav ? `Remove ${t.title} from favourites` : `Add ${t.title} to favourites`}
                  title={isFav ? 'Unpin' : 'Pin to top'}
                >
                  <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="min-w-0 w-full">
                <div className="font-display text-base font-semibold text-text">
                  {t.title}
                </div>
                <div className="mt-1 min-h-[2.5rem] text-sm text-text-muted line-clamp-2">
                  {t.blurb}
                </div>
              </div>
              {!t.ready && (
                <div className="mt-auto text-xs uppercase tracking-wider text-text-subtle">
                  Coming soon
                </div>
              )}
            </>
          )

          const className = `card flex flex-col items-start gap-3 text-left transition-all ${
            t.ready
              ? 'cursor-pointer hover:border-accent/40 hover:shadow-accent/10'
              : 'cursor-not-allowed opacity-50'
          } ${isFav ? 'border-warning/40' : ''}`

          return (
            <motion.div
              key={t.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              whileHover={t.ready ? { y: -3 } : undefined}
            >
              {t.ready ? (
                <Link to={`/practice/${t.slug}`} className={className}>
                  {tileBody}
                </Link>
              ) : (
                <div className={className} aria-disabled>
                  {tileBody}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
