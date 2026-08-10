/**
 * Profile — learner identity, headline stats and achievements.
 *
 * Achievements grid is hydrated from Dexie on mount and re-hydrated whenever
 * a new toast fires (cheap proxy for "something unlocked"), so newly-unlocked
 * badges appear without a manual refresh.
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { levelFromXp } from '@/utils/levels'
import { getTodayLog } from '@/utils/dailyLog'
import { displayStreak } from '@/utils/streak'
import { getDailyLogsRange } from '@/db/queries'
import {
  getAllAchievements,
  type AchievementDef,
} from '@/utils/achievements'
import { PageLoader } from '@/components/PageLoader'
import type { DailyLog } from '@/types'

type AchievementRow = AchievementDef & { unlockedAt?: number }

/** Rolling window for the long-term XP chart. */
const HISTORY_DAYS = 30
/** Rolling window for the calendar-style heatmap. */
const HEATMAP_DAYS = 91 // ~13 weeks — fits a clean 7-row grid

export function ProfilePage() {
  const stats = useAppStore((s) => s.stats)
  const sessionReviews = useAppStore((s) => s.session.reviewsDone)
  const toasts = useAppStore((s) => s.toasts)
  const [achievements, setAchievements] = useState<AchievementRow[]>([])
  const [today, setToday] = useState<DailyLog | null>(null)
  const [history, setHistory] = useState<DailyLog[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getAllAchievements().then((rows) => {
      if (!cancelled) setAchievements(rows)
    })
    return () => {
      cancelled = true
    }
    // Re-run whenever a new toast arrives — almost always signals an unlock.
  }, [toasts.length])

  /* Today's log + 90-day history — refresh as reviews come in. */
  useEffect(() => {
    let cancelled = false
    Promise.all([getTodayLog(), getDailyLogsRange(HEATMAP_DAYS)]).then(
      ([log, h]) => {
        if (cancelled) return
        setToday(log)
        setHistory(h)
      },
    )
    return () => {
      cancelled = true
    }
  }, [sessionReviews, stats?.cefrLevel])

  /* Aggregate windows for the chart + summary tiles. */
  const lifetime = useMemo(() => {
    if (!history) return null
    const last30 = history.slice(0, HISTORY_DAYS)
    const xp30 = last30.reduce((a, l) => a + l.xpEarned, 0)
    const reviews30 = last30.reduce((a, l) => a + l.reviewsDone, 0)
    const mistakes30 = last30.reduce((a, l) => a + l.mistakes, 0)
    const seconds30 = last30.reduce((a, l) => a + l.timeSpentSeconds, 0)
    const activeDays30 = last30.filter((l) => l.reviewsDone > 0).length
    const accuracy30 = reviews30 > 0 ? 1 - mistakes30 / reviews30 : 0
    const xp90 = history.reduce((a, l) => a + l.xpEarned, 0)
    const activeDays90 = history.filter((l) => l.reviewsDone > 0).length
    return {
      xp30,
      reviews30,
      seconds30,
      activeDays30,
      accuracy30,
      xp90,
      activeDays90,
    }
  }, [history])

  if (!stats || !today || !history || !lifetime) return <PageLoader />

  const lvl = levelFromXp(stats.xp)

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length

  const goalPct = Math.min(
    100,
    Math.round((today.xpEarned / stats.dailyGoalXp) * 100),
  )
  const streak = displayStreak({
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    lastActiveDay: stats.lastActiveDay,
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
          {stats.displayName}
        </h1>
        <p className="text-text-muted">
          {lvl.name} · CEFR {stats.cefrLevel} · joined{' '}
          {new Date(stats.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Level"
          value={lvl.name}
          sub={`Lvl ${lvl.level + 1} · ${stats.xp.toLocaleString()} XP`}
        />
        <StreakCard
          streak={streak}
          longest={stats.longestStreak}
          shields={stats.streakShields}
        />
        <GoalCard
          xpEarned={today.xpEarned}
          goal={stats.dailyGoalXp}
          pct={goalPct}
          reviews={today.reviewsDone}
        />
      </section>

      <section className="card grid grid-cols-2 gap-6">
        <Stat label="Total XP" value={stats.xp.toLocaleString()} />
        <Stat label="Reviews" value={stats.totalReviews.toLocaleString()} />
        <Stat label="Current streak" value={`${stats.currentStreak} days`} />
        <Stat label="Longest streak" value={`${stats.longestStreak} days`} />
      </section>

      {/* ----- Long-term activity (last 30 days chart + 90-day heatmap) ----- */}
      <section className="card space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Long-term activity
            </h2>
            <p className="text-sm text-text-muted">
              How your practice rhythm has held up over the past three months.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-4 text-sm">
            <SmallStat
              label="30-day XP"
              value={`+${lifetime.xp30.toLocaleString()}`}
            />
            <SmallStat
              label="Active days"
              value={`${lifetime.activeDays30}/${HISTORY_DAYS}`}
            />
            <SmallStat
              label="Accuracy"
              value={
                lifetime.reviews30 > 0
                  ? `${Math.round(lifetime.accuracy30 * 100)}%`
                  : '—'
              }
            />
            <SmallStat
              label="Time"
              value={
                lifetime.seconds30 >= 3600
                  ? `${Math.round(lifetime.seconds30 / 3600)}h`
                  : `${Math.round(lifetime.seconds30 / 60)} min`
              }
            />
          </div>
        </div>

        <XpHistoryChart logs={history.slice(0, HISTORY_DAYS)} />

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
              Last {HEATMAP_DAYS} days
            </h3>
            <span className="text-[11px] text-text-subtle">
              {lifetime.activeDays90} active · {lifetime.xp90.toLocaleString()}{' '}
              XP earned
            </span>
          </div>
          <ActivityHeatmap logs={history} />
        </div>
      </section>

      <section className="card">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Achievements</h2>
          <span className="text-xs uppercase tracking-wider text-text-subtle">
            {unlockedCount} / {achievements.length} unlocked
          </span>
        </div>

        {achievements.length === 0 ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {achievements.map((a) => (
              <AchievementCell key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AchievementCell({ a }: { a: AchievementRow }) {
  const unlocked = !!a.unlockedAt
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
        unlocked
          ? 'border-border bg-bg-subtle'
          : 'border-border-subtle bg-bg-elevated/30 opacity-60'
      }`}
      title={
        unlocked && a.unlockedAt
          ? `Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}`
          : 'Locked'
      }
    >
      <span
        className={`mt-0.5 text-2xl leading-none ${
          unlocked ? 'text-accent' : 'text-text-subtle'
        }`}
      >
        {a.icon}
      </span>
      <div className="min-w-0">
        <div
          className={`font-display text-sm font-semibold ${
            unlocked ? 'text-text' : 'text-text-muted'
          }`}
        >
          {a.name}
        </div>
        <div className="mt-0.5 text-xs text-text-muted">{a.description}</div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold text-text">
        {value}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="card transition-all">
      <div className="text-xs uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold text-text">
        {value}
      </div>
      <div className="mt-1 text-sm text-text-muted">{sub}</div>
    </motion.div>
  )
}

/**
 * Streak card with a shield indicator. Shields are surfaced inline so the
 * user always knows how many missed days they can absorb without breaking
 * their streak.
 */
function StreakCard({
  streak,
  longest,
  shields,
}: {
  streak: number
  longest: number
  shields: number
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="card transition-all">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-text-subtle">
          Streak
        </div>
        <ShieldPill count={shields} />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold text-text">
        {streak}d
      </div>
      <div className="mt-1 text-sm text-text-muted">Longest: {longest}d</div>
    </motion.div>
  )
}

/* ============================== Long-term ============================= */

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[64px]">
      <div className="text-[10px] uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div className="font-display text-base font-semibold text-text">
        {value}
      </div>
    </div>
  )
}

/**
 * 30-day XP bar chart, oldest → today.
 *
 * One bar per day. Heights are normalized against the rolling max so a
 * decent practice day still reads visually even after a peak. Day labels
 * are shown sparsely (every ~5 days + edges) to keep the axis legible at
 * narrow widths. Hover a bar to see the exact figures.
 */
function XpHistoryChart({ logs }: { logs: DailyLog[] }) {
  const ordered = useMemo(() => [...logs].reverse(), [logs])
  const max = Math.max(1, ...ordered.map((l) => l.xpEarned))
  const labelEvery = Math.max(1, Math.floor(ordered.length / 6))

  return (
    <div className="space-y-2">
      <div className="flex h-32 items-end gap-[3px]">
        {ordered.map((l) => {
          const pct = l.xpEarned === 0 ? 0 : Math.max(8, (l.xpEarned / max) * 100)
          return (
            <div
              key={l.date}
              className="group relative flex h-full flex-1 items-end"
              title={`${l.date}: ${l.xpEarned} XP · ${l.reviewsDone} reviews`}
            >
              <motion.div
                className={
                  'w-full rounded-sm transition-colors ' +
                  (l.xpEarned === 0
                    ? 'bg-border/40'
                    : l.goalReached
                      ? 'bg-success/80 group-hover:bg-success'
                      : 'bg-accent/80 group-hover:bg-accent')
                }
                initial={{ height: 0 }}
                animate={{ height: pct === 0 ? 3 : `${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-[3px]">
        {ordered.map((l, i) => {
          const isEdge = i === 0 || i === ordered.length - 1
          const showLabel = isEdge || i % labelEvery === 0
          return (
            <div
              key={l.date}
              className="flex-1 text-center text-[9px] uppercase tracking-wider text-text-subtle"
            >
              {showLabel
                ? new Date(l.date).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                  })
                : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * GitHub-style activity heatmap. 7 rows (one per weekday) × N columns
 * (one per week). Each cell is colored by XP intensity, bucketed into
 * 5 levels. Empty days get a faint baseline so the calendar grid stays
 * legible. The column for the current week is partially filled.
 */
function ActivityHeatmap({ logs }: { logs: DailyLog[] }) {
  const cells = useMemo(() => {
    // logs come newest-first → reverse to get oldest-first chronological order.
    const ordered = [...logs].reverse()
    const max = Math.max(1, ...ordered.map((l) => l.xpEarned))
    return ordered.map((l) => ({
      log: l,
      bucket: bucketize(l.xpEarned, max),
      jsDay: new Date(l.date).getDay(), // 0 = Sun
    }))
  }, [logs])

  if (cells.length === 0) return null

  // Build columns of 7 cells each, week by week. The first column may be
  // padded at the top so weekday rows align across the whole grid.
  const firstWeekday = cells[0].jsDay // 0..6 Sun..Sat
  const padded: Array<{
    log?: DailyLog
    bucket: number
    jsDay: number
  } | null> = []
  for (let i = 0; i < firstWeekday; i++) padded.push(null)
  padded.push(...cells)

  const columns: Array<typeof padded> = []
  for (let i = 0; i < padded.length; i += 7) {
    columns.push(padded.slice(i, i + 7))
  }

  // Compute month label for each column: show month name on the first column of a new month.
  const monthLabels = columns.map((col, ci) => {
    const firstDate = col.find((c) => c?.log)?.log?.date
    if (!firstDate) return null
    const month = new Date(firstDate).getMonth()
    if (ci === 0) {
      return new Date(firstDate).toLocaleDateString(undefined, { month: 'short' })
    }
    const prevCol = columns[ci - 1]
    const prevDate = prevCol.find((c) => c?.log)?.log?.date
    if (!prevDate) return null
    const prevMonth = new Date(prevDate).getMonth()
    return month !== prevMonth
      ? new Date(firstDate).toLocaleDateString(undefined, { month: 'short' })
      : null
  })

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start gap-3">
        {/* Weekday axis (Mon / Wed / Fri) */}
        <div className="flex flex-col gap-[3px] text-[9px] uppercase tracking-wider text-text-subtle">
          {/* Spacer for month labels row */}
          <div className="h-4" />
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div
              key={d}
              className="flex h-3 items-center"
              style={{ visibility: i === 1 || i === 3 || i === 5 ? 'visible' : 'hidden' }}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {/* Month label */}
              <div className="flex h-4 items-end text-[9px] uppercase tracking-wider text-text-subtle">
                {monthLabels[ci] ?? ''}
              </div>
              {Array.from({ length: 7 }).map((_, ri) => {
                const cell = col[ri] ?? null
                if (cell === null) {
                  return <div key={ri} className="h-3 w-3" aria-hidden />
                }
                if (!cell.log) {
                  return <div key={ri} className="h-3 w-3" aria-hidden />
                }
                return (
                  <div
                    key={ri}
                    className={
                      'h-3 w-3 rounded-sm ' + bucketClass(cell.bucket, !!cell.log.goalReached)
                    }
                    title={`${cell.log.date} · ${cell.log.xpEarned} XP · ${cell.log.reviewsDone} reviews`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-text-subtle">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((b) => (
          <span key={b} className={'h-3 w-3 rounded-sm ' + bucketClass(b, false)} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

function bucketize(xp: number, max: number): number {
  if (xp <= 0) return 0
  const ratio = xp / max
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.8) return 3
  return 4
}

function bucketClass(bucket: number, goalReached: boolean): string {
  if (bucket === 0) return 'bg-border/30'
  if (goalReached) {
    switch (bucket) {
      case 1:
        return 'bg-success/30'
      case 2:
        return 'bg-success/50'
      case 3:
        return 'bg-success/70'
      default:
        return 'bg-success'
    }
  }
  switch (bucket) {
    case 1:
      return 'bg-accent/25'
    case 2:
      return 'bg-accent/45'
    case 3:
      return 'bg-accent/65'
    default:
      return 'bg-accent/85'
  }
}

function ShieldPill({ count }: { count: number }) {
  const empty = count === 0
  return (
    <span
      title={
        empty
          ? 'No streak shields available — a missed day will break the streak.'
          : `${count} shield${count === 1 ? '' : 's'} — each absorbs one missed day.`
      }
      className={
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ' +
        (empty
          ? 'border-border/60 bg-bg-subtle text-text-subtle'
          : 'border-accent/40 bg-accent/10 text-accent')
      }
    >
      <span aria-hidden>🛡</span>
      <span>{count}</span>
    </span>
  )
}

function GoalCard({
  xpEarned,
  goal,
  pct,
  reviews,
}: {
  xpEarned: number
  goal: number
  pct: number
  reviews: number
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="card transition-all">
      <div className="text-xs uppercase tracking-wider text-text-subtle">
        Daily goal
      </div>
      <div className="mt-2 font-display text-3xl font-semibold text-text">
        {pct}%
      </div>
      <div className="mt-1 text-sm text-text-muted">
        {xpEarned} / {goal} XP · {reviews} review{reviews === 1 ? '' : 's'}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        <motion.div
          className={`h-full rounded-full ${
            pct >= 100 ? 'bg-success' : 'bg-accent'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </motion.div>
  )
}

