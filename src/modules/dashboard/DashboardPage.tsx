import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { countDue, getDailyLogsRange, getWeakPairs } from '@/db/queries'
import { allowedLevelsFor } from '@/utils/levelFilter'
import { getTodayLog } from '@/utils/dailyLog'
import { shouldRemind } from '@/utils/streakReminder'
import { PageLoader } from '@/components/PageLoader'
import { TILES, LS_FAVORITES } from '@/modules/practice/practiceTiles'
import type { DailyLog, Level, SRSCard, Word } from '@/types'

const WEAK_LIMIT = 10
type Pair = { card: SRSCard; word: Word }

function readFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_FAVORITES)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function DashboardPage() {
  const stats = useAppStore((s) => s.stats)
  const settings = useAppStore((s) => s.settings)
  const sessionReviews = useAppStore((s) => s.session.reviewsDone)
  const [due, setDue] = useState(0)
  const [logs, setLogs] = useState<DailyLog[] | null>(null)
  const [today, setToday] = useState<DailyLog | null>(null)
  const [weak, setWeak] = useState<Pair[] | null>(null)
  const [pinnedTiles] = useState(() => {
    const favs = readFavorites()
    return TILES.filter((t) => favs.has(t.slug))
  })

  useEffect(() => {
    const levels = stats?.cefrLevel
      ? allowedLevelsFor(stats.cefrLevel)
      : undefined
    Promise.all([
      countDue(levels),
      getDailyLogsRange(7),
      getTodayLog(),
      getWeakPairs(WEAK_LIMIT, levels),
    ]).then(([n, l, t, w]) => {
      setDue(n)
      setLogs(l)
      setToday(t)
      setWeak(w)
    })
  }, [sessionReviews, stats?.cefrLevel])

  const weekly = useMemo(() => {
    if (!logs) return null
    const xp = logs.reduce((a, l) => a + l.xpEarned, 0)
    const reviews = logs.reduce((a, l) => a + l.reviewsDone, 0)
    const mistakes = logs.reduce((a, l) => a + l.mistakes, 0)
    const seconds = logs.reduce((a, l) => a + l.timeSpentSeconds, 0)
    const accuracy = reviews > 0 ? 1 - mistakes / reviews : 0
    const activeDays = logs.filter((l) => l.reviewsDone > 0).length
    return { xp, reviews, mistakes, seconds, accuracy, activeDays }
  }, [logs])

  if (!stats || !logs || !weekly || !today || !weak) return <PageLoader />

  const hasAnyActivity = weekly.reviews > 0
  const reminderActive = !!settings && shouldRemind({ settings, stats })
  const goalPct = Math.min(
    100,
    Math.round((today.xpEarned / stats.dailyGoalXp) * 100),
  )

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ----- Greeting ----- */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
          Welcome back, {stats.displayName}.
        </h1>
        <p className="text-text-muted">
          Today is a great day to push your English a little further.
        </p>
      </motion.section>

      {/* ----- Streak reminder banner ----- */}
      {reminderActive && (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card flex flex-wrap items-center justify-between gap-4 border-warning/30"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl leading-none">⏰</span>
            <div>
              <div className="font-display text-base font-semibold text-text">
                {stats.currentStreak > 0
                  ? `Your ${stats.currentStreak}-day streak needs you today.`
                  : 'A few minutes today and your streak begins.'}
              </div>
              <div className="text-sm text-text-muted">
                Even one quick session keeps the rhythm going.
              </div>
            </div>
          </div>
          <Link to="/practice" className="btn-primary">
            Practice now →
          </Link>
        </motion.section>
      )}

      {/* ----- Quick actions + slim daily goal ----- */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-muted">
            Start practicing
          </h2>
          <span className="text-sm text-text-muted">
            <strong className="text-accent">{due}</strong>{' '}
            {due === 1 ? 'card is' : 'cards are'} due
          </span>
        </div>

        {/* Slim daily goal */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="uppercase tracking-wider text-text-subtle">
              Today's goal
            </span>
            <span className="text-text-muted">
              <strong className={goalPct >= 100 ? 'text-success' : 'text-text'}>
                {today.xpEarned}
              </strong>{' '}
              / {stats.dailyGoalXp} XP
              {goalPct >= 100 && <span className="ml-1 text-success">✓</span>}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
            <motion.div
              className={`h-full rounded-full ${
                goalPct >= 100 ? 'bg-success' : 'bg-accent'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${goalPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Pinned favorites */}
        {pinnedTiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pinnedTiles.map((t) => (
              <Link
                key={t.slug}
                to={`/practice/${t.slug}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent/40 hover:text-text"
              >
                <t.Icon size={14} className="shrink-0 text-accent" />
                <span>{t.title}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link to="/practice" className="btn-primary">
            All modes →
          </Link>
          <Link to="/practice/random-words" className="btn-ghost">
            Words in context
          </Link>
          <Link to="/deck" className="btn-ghost">
            My deck
          </Link>
        </div>
      </section>

      {/* ----- Weekly activity ----- */}
      <section className="card space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-text-subtle">
              Last 7 days
            </div>
            <div className="mt-1 font-display text-xl font-semibold text-text">
              {hasAnyActivity
                ? `${weekly.activeDays} active day${weekly.activeDays === 1 ? '' : 's'}`
                : 'Nothing yet this week.'}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-4 text-sm">
            <Stat label="XP" value={`+${weekly.xp}`} />
            <Stat label="Reviews" value={String(weekly.reviews)} />
            <Stat
              label="Accuracy"
              value={
                weekly.reviews > 0
                  ? `${Math.round(weekly.accuracy * 100)}%`
                  : '—'
              }
            />
            <Stat
              label="Time"
              value={
                weekly.seconds >= 60
                  ? `${Math.round(weekly.seconds / 60)} min`
                  : `${weekly.seconds}s`
              }
            />
          </div>
        </div>
        <XpStrip logs={logs} />
      </section>

      {/* ----- Weakest words ----- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Your weakest words
            </h2>
            <p className="text-sm text-text-muted">
              Ranked by lapses — the cards you've forgotten most often.
            </p>
          </div>
          {weak.length > 0 && (
            <Link
              to="/practice/weak-words"
              className="btn-primary"
              title="Drill only these weak words in a focused session"
            >
              Drill only these →
            </Link>
          )}
        </div>

        {weak.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-subtle/40 p-8 text-center text-sm text-text-muted">
            {hasAnyActivity
              ? "No lapses yet — you recalled everything you've been shown."
              : "Run a practice session first. We'll surface your weakest words here after a few reviews."}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {weak.map((p, i) => (
                <WeakRow key={p.card.id ?? i} pair={p} rank={i + 1} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  )
}

function WeakRow({ pair, rank }: { pair: Pair; rank: number }) {
  const { word, card } = pair
  const firstExample = word.examples?.[0]
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="card flex items-start gap-4 py-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle font-display text-sm font-semibold text-text-muted">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-base font-semibold text-text">
            {word.lemma}
          </span>
          <LevelBadge level={word.level} />
          <span className="text-xs text-text-subtle">{word.partOfSpeech}</span>
        </div>
        {(word.fr || word.definitionEn) && (
          <div className="mt-0.5 text-sm text-text">
            {word.fr && <span className="text-accent">{word.fr}</span>}
            {word.fr && word.definitionEn && (
              <span className="text-text-muted"> · </span>
            )}
            {word.definitionEn && (
              <span className="text-text-muted">{word.definitionEn}</span>
            )}
          </div>
        )}
        {firstExample && (
          <div className="mt-1 text-xs italic text-text-subtle">
            "{firstExample.en}"
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end text-xs text-text-subtle">
        <span>
          <strong className="text-warning">{card.lapses}</strong> lapse
          {card.lapses === 1 ? '' : 's'}
        </span>
        <span>{easeLabel(card.ease)}</span>
      </div>
    </motion.div>
  )
}

function easeLabel(ease: number): string {
  if (ease < 1.5) return 'Very hard'
  if (ease < 2.0) return 'Hard'
  if (ease < 2.5) return 'Medium'
  if (ease < 3.0) return 'Easy'
  return 'Very easy'
}

function LevelBadge({ level }: { level: Level }) {
  const color: Record<Level, string> = {
    A1: 'bg-success/10 text-success border-success/30',
    A2: 'bg-success/10 text-success border-success/30',
    B1: 'bg-accent/10 text-accent border-accent/30',
    B2: 'bg-accent/10 text-accent border-accent/30',
    C1: 'bg-warning/10 text-warning border-warning/30',
    C2: 'bg-warning/10 text-warning border-warning/30',
  }
  return (
    <span
      className={
        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' +
        color[level]
      }
    >
      {level}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[64px]">
      <div className="text-xs uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div className="font-display text-lg font-semibold text-text">
        {value}
      </div>
    </div>
  )
}

function XpStrip({ logs }: { logs: DailyLog[] }) {
  const ordered = useMemo(() => [...logs].reverse(), [logs])
  const max = Math.max(1, ...ordered.map((l) => l.xpEarned))

  return (
    <div className="flex items-end gap-2">
      {ordered.map((l) => {
        const pct = l.xpEarned === 0 ? 0 : Math.max(12, (l.xpEarned / max) * 100)
        const day = new Date(l.date).toLocaleDateString(undefined, {
          weekday: 'short',
        })
        return (
          <div
            key={l.date}
            className="flex flex-1 flex-col items-center gap-1.5"
            title={`${l.date}: ${l.xpEarned} XP · ${l.reviewsDone} reviews`}
          >
            <div className="flex h-24 w-full items-end">
              <motion.div
                className={
                  'w-full rounded-md ' +
                  (l.xpEarned === 0
                    ? 'bg-border/40'
                    : l.goalReached
                      ? 'bg-success/80'
                      : 'bg-accent/80')
                }
                initial={{ height: 0 }}
                animate={{ height: pct === 0 ? 4 : `${pct}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-text-subtle">
              {day}
            </span>
          </div>
        )
      })}
    </div>
  )
}
