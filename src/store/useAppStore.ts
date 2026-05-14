/**
 * App-wide reactive state (Zustand).
 *
 * Holds:
 *   - cached UserStats + Settings (kept in sync with Dexie)
 *   - in-memory combo tracker (resets on error / on session end)
 *   - current session metadata (start time, reviews done)
 *   - transient toast queue (achievements, etc.)
 */

import { create } from 'zustand'
import { db } from '@/db/database'
import { bumpStreak, maybeGrantShields } from '@/utils/streak'
import { isoDate } from '@/utils/dailyLog'
import { levelFromXp } from '@/utils/levels'
import {
  checkAndUnlockAchievements,
  type AchievementDef,
} from '@/utils/achievements'
import type { DailyLog, Settings, UserStats } from '@/types'

interface ComboState {
  count: number
  lastCorrectAt: number
  multiplierActive: boolean // true if 10 correct in <2min
}

interface SessionState {
  startedAt: number
  reviewsDone: number
}

export type ToastKind = 'achievement' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  icon?: string
  title: string
  body?: string
  createdAt: number
}

interface AppStore {
  ready: boolean
  stats: UserStats | null
  settings: Settings | null
  combo: ComboState
  session: SessionState
  toasts: Toast[]

  /** Load persisted state from Dexie. */
  hydrate: () => Promise<void>

  /** Add XP and persist; auto-level-up handled by levels util on read. */
  addXp: (amount: number) => Promise<void>

  /** Register a correct review for combo tracking. */
  registerCorrect: () => void
  /** Register a wrong review — resets combo. */
  registerWrong: () => void

  /** Increment review counter for the current session. */
  incrementReviews: () => void

  /** Update settings (partial). */
  updateSettings: (patch: Partial<Settings>) => Promise<void>

  /** Push a toast onto the queue. */
  pushToast: (t: Omit<Toast, 'id' | 'createdAt'>) => void
  /** Remove a toast by id. */
  dismissToast: (id: number) => void

  /**
   * Called by practice sessions after they persist today's daily log, so we
   * can evaluate daily-goal achievements (which depend on the freshly-saved
   * log). Stats-based achievements are checked automatically on addXp.
   */
  notifyDailyLog: (dailyLog: DailyLog) => Promise<void>
}

const COMBO_WINDOW_MS = 2 * 60 * 1000 // 2 minutes
const COMBO_THRESHOLD = 10

let _toastSeq = 1

export const useAppStore = create<AppStore>((set, get) => ({
  ready: false,
  stats: null,
  settings: null,
  combo: { count: 0, lastCorrectAt: 0, multiplierActive: false },
  session: { startedAt: Date.now(), reviewsDone: 0 },
  toasts: [],

  async hydrate() {
    const [statsRaw, settings] = await Promise.all([
      db.userStats.get(1),
      db.settings.get(1),
    ])

    let stats = statsRaw ?? null

    // Backfill streak-shield fields on installs that pre-date the feature.
    // Adding via `put` is safe because the userStats table keys on `id` only.
    if (stats && (stats.streakShields == null || stats.lastShieldGrantedDay == null)) {
      stats = {
        ...stats,
        streakShields: stats.streakShields ?? 1,
        lastShieldGrantedDay: stats.lastShieldGrantedDay ?? isoDate(),
      }
      await db.userStats.put(stats)
    }

    // Drip-grant any shields the user has earned while away.
    if (stats) {
      const grant = maybeGrantShields({
        streakShields: stats.streakShields,
        lastShieldGrantedDay: stats.lastShieldGrantedDay,
      })
      if (
        grant.streakShields !== stats.streakShields ||
        grant.lastShieldGrantedDay !== stats.lastShieldGrantedDay
      ) {
        stats = {
          ...stats,
          streakShields: grant.streakShields,
          lastShieldGrantedDay: grant.lastShieldGrantedDay,
        }
        await db.userStats.put(stats)
        if (grant.granted > 0) {
          // Defer toast slightly so the dashboard mounts first.
          setTimeout(() => {
            useAppStore.getState().pushToast({
              kind: 'info',
              icon: '🛡',
              title:
                grant.granted === 1
                  ? 'Streak shield restored'
                  : `${grant.granted} streak shields restored`,
              body:
                'Each shield absorbs one missed day so your streak stays alive.',
            })
          }, 600)
        }

        // Drip-grant could push shields to the cap → check `shield-cap` etc.
        const unlocked = await checkAndUnlockAchievements({ stats })
        for (const def of unlocked) pushAchievement(get, def)
      }
    }

    set({ stats, settings: settings ?? null, ready: true })
  },

  async addXp(amount) {
    const { stats, combo } = get()
    if (!stats) return
    const multiplier = combo.multiplierActive ? 2 : 1
    const gained = amount * multiplier
    // Bump the streak on first XP-earning activity of the day.
    // bumpStreak may consume a shield to bridge a 1-day gap.
    const bump = bumpStreak({
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      lastActiveDay: stats.lastActiveDay,
      streakShields: stats.streakShields,
    })
    const newXp = stats.xp + gained
    const updated: UserStats = {
      ...stats,
      xp: newXp,
      // Keep stats.level in sync with the XP-derived level so achievement
      // predicates that gate on level can fire reliably.
      level: levelFromXp(newXp).level,
      totalReviews: stats.totalReviews + 1,
      currentStreak: bump.currentStreak,
      longestStreak: bump.longestStreak,
      lastActiveDay: bump.lastActiveDay,
      streakShields: bump.streakShields,
    }
    await db.userStats.put(updated)
    set({ stats: updated })

    // Surface shield consumption — the user wants to know the streak survived.
    if (bump.shieldUsed) {
      get().pushToast({
        kind: 'info',
        icon: '🛡',
        title: `Streak shield used — your ${bump.currentStreak}-day streak is safe`,
        body: `${bump.streakShields} shield${bump.streakShields === 1 ? '' : 's'} left.`,
      })
    }

    // Surface a streak break so the user gets honest feedback rather than
    // a silent reset. Only fired when there was a meaningful streak to lose.
    if (bump.streakBroken) {
      get().pushToast({
        kind: 'info',
        icon: '◌',
        title: `Your ${bump.previousStreak}-day streak ended`,
        body: 'Day 1 of the next one starts now — no judgement, just rhythm.',
      })
    }

    // Fire achievement checks using the FRESH stats (review/xp/streak).
    const unlocked = await checkAndUnlockAchievements({
      stats: updated,
      comboCount: get().combo.count,
    })
    for (const def of unlocked) pushAchievement(get, def)
  },

  registerCorrect() {
    const now = Date.now()
    const { combo, stats } = get()
    const withinWindow = now - combo.lastCorrectAt <= COMBO_WINDOW_MS
    const nextCount = withinWindow ? combo.count + 1 : 1
    set({
      combo: {
        count: nextCount,
        lastCorrectAt: now,
        multiplierActive: nextCount >= COMBO_THRESHOLD,
      },
    })
    // Combo-10 is the only predicate that needs the live count.
    if (stats && nextCount >= COMBO_THRESHOLD) {
      void checkAndUnlockAchievements({
        stats,
        comboCount: nextCount,
      }).then((unlocked) => {
        for (const def of unlocked) pushAchievement(get, def)
      })
    }
  },

  registerWrong() {
    set({
      combo: { count: 0, lastCorrectAt: 0, multiplierActive: false },
    })
  },

  incrementReviews() {
    const { session } = get()
    set({ session: { ...session, reviewsDone: session.reviewsDone + 1 } })
  },

  async updateSettings(patch) {
    const { settings } = get()
    if (!settings) return
    const updated = { ...settings, ...patch }
    await db.settings.put(updated)
    set({ settings: updated })
  },

  pushToast(t) {
    const id = _toastSeq++
    const toast: Toast = { ...t, id, createdAt: Date.now() }
    set({ toasts: [...get().toasts, toast] })
  },

  dismissToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },

  async notifyDailyLog(dailyLog) {
    const { stats } = get()
    if (!stats) return
    const unlocked = await checkAndUnlockAchievements({
      stats,
      dailyLog,
      comboCount: get().combo.count,
    })
    for (const def of unlocked) pushAchievement(get, def)
  },
}))

function pushAchievement(get: () => AppStore, def: AchievementDef) {
  get().pushToast({
    kind: 'achievement',
    icon: def.icon,
    title: `Achievement unlocked — ${def.name}`,
    body: def.description,
  })
}
