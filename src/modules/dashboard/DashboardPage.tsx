/**
 * Dashboard — answers one question first: *is there anything to do right now?*
 *
 * The hero is the review call to action, sized and coloured so it cannot be
 * missed. Statistics come second, because numbers about your learning are
 * only interesting once the learning has happened. Weakest words come last,
 * as a reason to come back.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Plus, Quote, Target, Zap } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import {
  getDailyLogsRange,
  getDeckSummary,
  getRetention,
  getWeakPairs,
  type DeckSummary,
} from '@/db/queries'
import { getTodayLog } from '@/utils/dailyLog'
import { shouldRemind } from '@/utils/streakReminder'
import { allowedLevelsFor } from '@/utils/levelFilter'
import {
  Badge,
  buttonClass,
  Card,
  EmptyState,
  LevelBadge,
  Meter,
  PageLoader,
  Stat,
} from '@/components/ui'
import { TILES, LS_FAVORITES } from '@/modules/practice/practiceTiles'
import type { DailyLog, SRSCard, Word } from '@/types'

const WEAK_LIMIT = 5
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

  const [deck, setDeck] = useState<DeckSummary | null>(null)
  const [retention, setRetention] = useState<number | null | undefined>(undefined)
  const [logs, setLogs] = useState<DailyLog[] | null>(null)
  const [today, setToday] = useState<DailyLog | null>(null)
  const [weak, setWeak] = useState<Pair[] | null>(null)

  const [pinnedTiles] = useState(() => {
    const favs = readFavorites()
    return TILES.filter((t) => favs.has(t.slug))
  })

  useEffect(() => {
    const levels = stats?.cefrLevel ? allowedLevelsFor(stats.cefrLevel) : undefined
    Promise.all([
      getDeckSummary(),
      getRetention(30),
      getDailyLogsRange(7),
      getTodayLog(),
      getWeakPairs(WEAK_LIMIT, levels),
    ]).then(([d, r, l, t, w]) => {
      setDeck(d)
      setRetention(r)
      setLogs(l)
      setToday(t)
      setWeak(w)
    })
  }, [sessionReviews, stats?.cefrLevel])

  const weekly = useMemo(() => {
    if (!logs) return null
    const xp = logs.reduce((a, l) => a + l.xpEarned, 0)
    const reviews = logs.reduce((a, l) => a + l.reviewsDone, 0)
    const seconds = logs.reduce((a, l) => a + l.timeSpentSeconds, 0)
    const activeDays = logs.filter((l) => l.reviewsDone > 0).length
    return { xp, reviews, seconds, activeDays }
  }, [logs])

  if (!stats || !deck || !logs || !weekly || !today || !weak || retention === undefined) {
    return <PageLoader label="Reading your progress…" />
  }

  const firstName = stats.displayName.split(' ')[0]
  const reminderActive = !!settings && shouldRemind({ settings, stats })
  const emptyDeck = deck.total === 0

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ---- Greeting -------------------------------------------------- */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-display text-3xl font-semibold tracking-display text-text">
          {greeting()}, {firstName}.
        </h1>
        <p className="mt-1 text-text-muted">
          {emptyDeck
            ? 'Your deck is empty — let’s put something in it.'
            : deck.due > 0
              ? `${deck.due} card${deck.due === 1 ? '' : 's'} waiting. Five minutes is enough.`
              : 'Nothing due. A good day to add something new.'}
        </p>
      </motion.header>

      {/* ---- The one thing to do --------------------------------------- */}
      {emptyDeck ? (
        <EmptyState
          icon={<Plus size={26} />}
          title="Add your first word"
          body="Type one in by hand, pull a native expression from the idiom library, or paste a whole article and let the tutor pick the words out."
        >
          <Link to="/deck" className={buttonClass('primary', 'lg')}>
            Add a word
          </Link>
          <Link to="/idioms" className={buttonClass('ghost', 'lg')}>
            Browse idioms
          </Link>
        </EmptyState>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card weight="ink" className="flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold tabular-nums text-text">
                  {deck.due}
                </span>
                <span className="text-text-muted">
                  card{deck.due === 1 ? '' : 's'} due
                </span>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {deck.due > 0
                  ? 'Spaced repetition works when it is boring and daily.'
                  : 'The schedule is clear — come back tomorrow.'}
              </p>
            </div>
            <Link
              to="/review"
              className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}
            >
              <Zap size={20} />
              {deck.due > 0 ? 'Start reviewing' : 'Review anyway'}
            </Link>
          </Card>
        </motion.section>
      )}

      {/* ---- Streak nudge ---------------------------------------------- */}
      {reminderActive && !emptyDeck && (
        <Card padding="sm" className="flex flex-wrap items-center justify-between gap-4 border-warning/40">
          <div className="flex items-start gap-3">
            <Flame size={20} className="mt-0.5 shrink-0 text-warning" />
            <div>
              <div className="font-display text-base font-semibold text-text">
                {stats.currentStreak > 0
                  ? `Your ${stats.currentStreak}-day streak needs today.`
                  : 'A few minutes today and the streak begins.'}
              </div>
              <div className="text-sm text-text-muted">
                One session is enough to keep the rhythm.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ---- Today's goal ---------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-2xs font-semibold uppercase tracking-wider text-text-subtle">
            Today’s goal
          </h2>
          <span className="font-mono text-sm tabular-nums text-text-muted">
            <strong
              className={today.xpEarned >= stats.dailyGoalXp ? 'text-success' : 'text-text'}
            >
              {today.xpEarned}
            </strong>
            <span className="text-text-subtle"> / {stats.dailyGoalXp} XP</span>
          </span>
        </div>
        <Meter
          value={today.xpEarned}
          max={stats.dailyGoalXp}
          tone={today.xpEarned >= stats.dailyGoalXp ? 'success' : 'accent'}
          label="Daily XP goal"
        />
      </section>

      {/* ---- The numbers ------------------------------------------------ */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Words learned"
          value={deck.learned}
          detail={`of ${deck.total} in your deck`}
          icon={<Target size={16} />}
        />
        <Stat
          label="Streak"
          value={`${stats.currentStreak}d`}
          detail={
            stats.longestStreak > stats.currentStreak
              ? `best ${stats.longestStreak}d`
              : 'personal best'
          }
          tone={stats.currentStreak > 0 ? 'warning' : 'default'}
          icon={<Flame size={16} />}
        />
        <Stat
          label="Retention"
          value={retention == null ? '—' : `${Math.round(retention * 100)}%`}
          detail="last 30 days"
          tone={
            retention == null
              ? 'default'
              : retention >= 0.85
                ? 'success'
                : retention >= 0.7
                  ? 'default'
                  : 'warning'
          }
        />
        <Stat
          label="This week"
          value={`+${weekly.xp}`}
          detail={`${weekly.activeDays}/7 active days`}
          tone="accent"
        />
      </section>

      {/* ---- Weekly rhythm ---------------------------------------------- */}
      <Card
        title="Last 7 days"
        subtitle={
          weekly.reviews > 0
            ? `${weekly.reviews} reviews · ${
                weekly.seconds >= 60 ? `${Math.round(weekly.seconds / 60)} min` : `${weekly.seconds}s`
              }`
            : 'Nothing yet this week.'
        }
      >
        <XpStrip logs={logs} />
      </Card>

      {/* ---- Weakest words ----------------------------------------------- */}
      {!emptyDeck && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-display">
                Your weakest words
              </h2>
              <p className="text-sm text-text-muted">
                Ranked by lapses — the ones you keep forgetting.
              </p>
            </div>
            {weak.length > 0 && (
              <Link to="/practice/weak-words" className={buttonClass('ghost')}>
                Drill only these
              </Link>
            )}
          </div>

          {weak.length === 0 ? (
            <Card weight="sunken" padding="sm">
              <p className="py-4 text-center text-sm text-text-muted">
                {weekly.reviews > 0
                  ? 'No lapses yet — you have recalled everything you have been shown.'
                  : 'Run one review session and your problem words will surface here.'}
              </p>
            </Card>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {weak.map((p, i) => (
                  <WeakRow key={p.card.id ?? i} pair={p} rank={i + 1} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      )}

      {/* ---- Secondary actions, at the bottom where the thumb is --------- */}
      <section className="space-y-3">
        {pinnedTiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pinnedTiles.map((t) => (
              <Link
                key={t.slug}
                to={`/practice/${t.slug}`}
                className={buttonClass('ghost')}
              >
                <t.Icon size={16} className="text-accent" />
                {t.title}
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/practice" className={buttonClass('ghost', 'md', 'flex-1')}>
            <Zap size={18} /> All practice modes
          </Link>
          <Link to="/idioms" className={buttonClass('ghost', 'md', 'flex-1')}>
            <Quote size={18} /> Idiom library
          </Link>
          <Link to="/deck" className={buttonClass('ghost', 'md', 'flex-1')}>
            <Plus size={18} /> Add a word
          </Link>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function WeakRow({ pair, rank }: { pair: Pair; rank: number }) {
  const { word, card } = pair
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card padding="sm" className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle font-mono text-xs font-semibold text-text-muted"
          aria-hidden
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-semibold text-text">
              {word.lemma}
            </span>
            <LevelBadge level={word.level} />
          </div>
          {(word.fr || word.definitionEn) && (
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {word.definitionEn ?? word.fr}
            </p>
          )}
        </div>
        <Badge tone={card.lapses >= 5 ? 'danger' : 'warning'}>
          {card.lapses} lapse{card.lapses === 1 ? '' : 's'}
        </Badge>
      </Card>
    </motion.li>
  )
}

/**
 * Seven-day XP bars. Heights animate with `scaleY` from the bottom, so the
 * whole strip is one composited transform per bar instead of seven layouts.
 */
function XpStrip({ logs }: { logs: DailyLog[] }) {
  const ordered = useMemo(() => [...logs].reverse(), [logs])
  const max = Math.max(1, ...ordered.map((l) => l.xpEarned))

  return (
    <div className="flex items-end gap-2">
      {ordered.map((l, i) => {
        const ratio = l.xpEarned === 0 ? 0 : Math.max(0.08, l.xpEarned / max)
        /* Forced to English rather than the system locale: the whole point
           of this app is immersion, and a French "mar." in an otherwise
           English interface breaks it. */
        const day = new Date(l.date).toLocaleDateString('en-GB', { weekday: 'short' })
        return (
          <div key={l.date} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end">
              <motion.div
                className={`w-full origin-bottom rounded-sm ${
                  l.xpEarned === 0
                    ? 'bg-border'
                    : l.goalReached
                      ? 'bg-success'
                      : 'bg-accent'
                }`}
                style={{ height: '100%' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: l.xpEarned === 0 ? 0.03 : ratio }}
                transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                title={`${l.date}: ${l.xpEarned} XP · ${l.reviewsDone} reviews`}
              />
            </div>
            <span className="font-mono text-2xs uppercase tracking-wider text-text-subtle">
              {day}
            </span>
          </div>
        )
      })}
    </div>
  )
}
