/**
 * IndexedDB schema via Dexie — local-first storage for MX Learning.
 *
 * Tables:
 *   - words: vocabulary items
 *   - cards: SRS state per word
 *   - reviews: review history (analytics)
 *   - userStats: singleton — XP, level, streak
 *   - dailyLogs: per-day activity rollup
 *   - achievements: unlock state
 *   - tags: hierarchical tagging
 *   - settings: singleton — theme, sound, voice
 */

import Dexie, { type Table } from 'dexie'
import { DB_NAME, IS_DEMO } from '@/config'
import type {
  Achievement,
  DailyLog,
  Review,
  Settings,
  SRSCard,
  Tag,
  UserStats,
  Word,
} from '@/types'

class MXDatabase extends Dexie {
  words!: Table<Word, number>
  cards!: Table<SRSCard, number>
  reviews!: Table<Review, number>
  userStats!: Table<UserStats, number>
  dailyLogs!: Table<DailyLog, string>
  achievements!: Table<Achievement, string>
  tags!: Table<Tag, number>
  settings!: Table<Settings, number>

  constructor() {
    // `mx-learning` in production, `mx-learning-demo` in staging. See src/config.ts.
    super(DB_NAME)

    this.version(1).stores({
      // ++id = auto-incrementing primary key; & = unique; * = multi-entry
      words: '++id, lemma, level, *tags, frequencyRank, source, addedAt',
      cards: '++id, wordId, due, lastReviewed, repetition, lapses',
      reviews: '++id, cardId, wordId, timestamp, exerciseType, wasCorrect',
      userStats: 'id',
      dailyLogs: 'date, goalReached',
      achievements: 'id, unlockedAt',
      tags: '++id, &name, parentId',
      settings: 'id',
    })

    // v2 — index `partOfSpeech` so the idioms module can pull its slice of the
    // deck without scanning every word. Purely additive: existing rows are
    // re-indexed in place by Dexie, no data is rewritten or lost.
    this.version(2).stores({
      words: '++id, lemma, level, *tags, frequencyRank, source, addedAt, partOfSpeech',
    })
  }
}

export const db = new MXDatabase()

/* ------------------------------------------------------------------ */
/*  Singleton bootstrap — ensure userStats + settings rows exist      */
/* ------------------------------------------------------------------ */

const DEFAULT_USER_STATS: UserStats = {
  id: 1,
  xp: 0,
  level: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalReviews: 0,
  dailyGoalXp: 20,
  lastActiveDay: new Date().toISOString().slice(0, 10),
  createdAt: Date.now(),
  cefrLevel: 'B1', // safe default when onboarding is skipped — mid-range, not too easy nor too hard
  displayName: 'Learner',
  streakShields: 1, // start with one shield as a welcome buffer
  lastShieldGrantedDay: new Date().toISOString().slice(0, 10),
}

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  theme: 'dark',
  soundEnabled: true,
  vibrationsEnabled: true,
  voiceRate: 1,
  voicePitch: 1,
  difficultyOffset: 0,
  onboardingComplete: false,
  reminderEnabled: false,
  reminderHour: 20, // 8 pm — late enough to know if the user did their day, early enough to act
}

/**
 * StrictMode-safe bootstrap.
 *
 * React 19 StrictMode mounts effects twice in dev, which used to call
 * `bootstrapDatabase` twice in parallel and race on `add(id=1)` — every
 * Chromium browser threw a DexieError ("ConstraintError: key already exists")
 * the second time. We now:
 *   1) memoise the promise so it's executed exactly once per page load,
 *   2) wrap the inserts in a transaction with a count() guard for atomicity.
 */
let _bootstrapPromise: Promise<void> | null = null

export function bootstrapDatabase(): Promise<void> {
  if (!_bootstrapPromise) {
    _bootstrapPromise = doBootstrap().catch((err) => {
      // Allow retry on hard failure (e.g. user fixes a Brave shield).
      _bootstrapPromise = null
      console.error('[MX Learning] DB bootstrap failed:', err)
      throw err
    })
  }
  return _bootstrapPromise
}

async function doBootstrap(): Promise<void> {
  await db.open()
  await db.transaction('rw', [db.userStats, db.settings], async () => {
    const [statsCount, settingsCount] = await Promise.all([
      db.userStats.count(),
      db.settings.count(),
    ])
    if (statsCount === 0) await db.userStats.add(DEFAULT_USER_STATS)
    if (settingsCount === 0) {
      await db.settings.add(
        // Staging exists to look at screens, not to retake the CEFR test on
        // every fresh demo database.
        IS_DEMO
          ? { ...DEFAULT_SETTINGS, onboardingComplete: true }
          : DEFAULT_SETTINGS,
      )
    }
  })

  if (IS_DEMO) {
    // Dynamic import so the fixture never reaches a production bundle.
    const { seedDemoData } = await import('./demoSeed')
    await seedDemoData()
  }
  // NOTE: We intentionally DO NOT auto-seed vocabulary anymore.
  // The deck should reflect what the user has learned — built via
  // "Learn from anything" (paste text) and other content flows.
  // The curated seed data in `src/data/seedWords.ts` is retained for
  // future features (grammar-rules module, suggested-words starter pack)
  // but does not enter the deck without an explicit user action.
}
