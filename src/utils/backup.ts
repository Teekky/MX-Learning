/**
 * Export / import of the full local database, plus a rolling auto-snapshot.
 *
 * Why this exists
 * ---------------
 * Everything the user has ever learned lives in one IndexedDB database in one
 * browser profile. Clearing site data, a profile reset, or a bad migration
 * wipes it with no recourse. This module is the safety net:
 *
 *   1. `exportSnapshot()` serialises every table into a single JSON document.
 *   2. `downloadBackup()` hands that document to the user as a file.
 *   3. `autoSnapshot()` keeps the last few snapshots in a SEPARATE IndexedDB
 *      database, so a corrupted/wiped main DB doesn't take the backups down
 *      with it. It runs once per app load and is deliberately cheap.
 *   4. `importSnapshot()` reads a document back with strict validation.
 *
 * Import threat model
 * -------------------
 * A backup file is untrusted input — the user may re-import a file that was
 * edited by hand, truncated, or produced by a different app version. We
 * therefore validate *every* record and silently drop anything that doesn't
 * match the schema, rather than letting malformed rows reach the UI. Strings
 * are length-capped and stripped of control/bidi characters. We never render
 * imported text as HTML (no `dangerouslySetInnerHTML` anywhere in the app),
 * and the CSP in index.html blocks inline execution, so a `<script>` in a
 * field is inert text — but we still refuse absurd payloads early.
 */

import Dexie, { type Table } from 'dexie'
import { db } from '@/db/database'
import type {
  Achievement,
  DailyLog,
  ExerciseType,
  Level,
  PartOfSpeech,
  Quality,
  Review,
  Settings,
  SRSCard,
  Tag,
  UserStats,
  Word,
} from '@/types'

/* ------------------------------------------------------------------ */
/*  Format                                                             */
/* ------------------------------------------------------------------ */

export const BACKUP_FORMAT = 'mx-learning.backup'
export const BACKUP_VERSION = 1

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  /** ISO timestamp of the export. */
  exportedAt: string
  /** Which database this came from — `mx-learning` or `mx-learning-demo`. */
  sourceDb: string
  words: Word[]
  cards: SRSCard[]
  reviews: Review[]
  userStats: UserStats[]
  dailyLogs: DailyLog[]
  achievements: Achievement[]
  tags: Tag[]
  settings: Settings[]
}

/** Result of an import — what landed, what was refused. */
export interface ImportReport {
  ok: boolean
  /** Human-readable reason when `ok` is false. */
  error?: string
  accepted: Record<string, number>
  /** Records dropped because they failed validation. */
  rejected: Record<string, number>
}

/* ------------------------------------------------------------------ */
/*  Limits — refuse absurd payloads before parsing them into memory    */
/* ------------------------------------------------------------------ */

/** Hard cap on the raw JSON text. ~20 MB covers a deck of 100k+ words. */
const MAX_BYTES = 20 * 1024 * 1024
/** Per-table row caps. Anything past this is truncated, not an error. */
const MAX_ROWS: Record<string, number> = {
  words: 100_000,
  cards: 200_000,
  reviews: 500_000,
  userStats: 1,
  dailyLogs: 20_000,
  achievements: 1_000,
  tags: 5_000,
  settings: 1,
}
/** Longest accepted string in any text field. */
const MAX_STR = 2_000
/** Longest accepted array in any list field (tags, examples). */
const MAX_ARR = 100

/* ------------------------------------------------------------------ */
/*  Primitive validators                                               */
/* ------------------------------------------------------------------ */

const LEVELS: readonly Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const PARTS: readonly PartOfSpeech[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'pronoun',
  'determiner',
  'interjection',
  'phrase',
  'idiom',
  'other',
]
const EXERCISES: readonly ExerciseType[] = [
  'flashcard',
  'fill-in-blank',
  'random-words-context',
  'time-attack',
  'writing-conversation',
  'audio-conversation',
  'image-description',
  'interview-simulator',
  'learn-from-text',
  'listening-dictation',
  'pronunciation',
  'grammar',
  'tenses',
  'conjugation',
]
const SOURCES: readonly Word['source'][] = ['seed', 'mistral', 'user', 'session']
const REGISTERS: readonly NonNullable<Word['register']>[] = [
  'informal',
  'neutral',
  'formal',
]
const VARIANTS: readonly NonNullable<Word['variant']>[] = ['BrE', 'AmE', 'both']

/**
 * Normalise an untrusted string: drop control characters and bidi overrides
 * (which can be used to make text render differently from what it contains),
 * collapse whitespace, and cap the length.
 */
export function sanitizeText(value: unknown, max = MAX_STR): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    // C0/C1 control characters. Matching control characters is the entire
    // point here, so the rule that flags them does not apply.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Zero-width characters and bidi overrides — these let a string render
    // differently from what it actually contains.
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length === 0) return null
  return cleaned.slice(0, max)
}

function str(value: unknown, max = MAX_STR): string | undefined {
  return sanitizeText(value, max) ?? undefined
}

function num(value: unknown, opts: { min?: number; max?: number } = {}): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (opts.min != null && value < opts.min) return undefined
  if (opts.max != null && value > opts.max) return undefined
  return value
}

function int(value: unknown, opts: { min?: number; max?: number } = {}): number | undefined {
  const n = num(value, opts)
  return n == null ? undefined : Math.round(n)
}

function bool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

function strArray(value: unknown, max = MAX_ARR): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value.slice(0, max)) {
    const s = sanitizeText(item, 120)
    if (s) out.push(s)
  }
  return out
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/* ------------------------------------------------------------------ */
/*  Record validators — each returns null when the row is unusable     */
/* ------------------------------------------------------------------ */

export function validateWord(raw: unknown): Word | null {
  if (!isRecord(raw)) return null
  const lemma = str(raw.lemma, 200)
  if (!lemma) return null
  const level = oneOf(raw.level, LEVELS)
  const partOfSpeech = oneOf(raw.partOfSpeech, PARTS)
  if (!level || !partOfSpeech) return null

  const examples: Word['examples'] = []
  if (Array.isArray(raw.examples)) {
    for (const ex of raw.examples.slice(0, MAX_ARR)) {
      if (!isRecord(ex)) continue
      const en = str(ex.en)
      if (!en) continue
      const fr = str(ex.fr)
      examples.push(fr ? { en, fr } : { en })
    }
  }

  const word: Word = {
    lemma,
    partOfSpeech,
    level,
    tags: strArray(raw.tags),
    examples,
    addedAt: int(raw.addedAt, { min: 0 }) ?? Date.now(),
    source: oneOf(raw.source, SOURCES) ?? 'user',
  }
  const id = int(raw.id, { min: 1 })
  if (id != null) word.id = id
  const ipa = str(raw.ipa, 200)
  if (ipa) word.ipa = ipa
  const fr = str(raw.fr, 400)
  if (fr) word.fr = fr
  const definitionEn = str(raw.definitionEn)
  if (definitionEn) word.definitionEn = definitionEn
  const frequencyRank = int(raw.frequencyRank, { min: 0 })
  if (frequencyRank != null) word.frequencyRank = frequencyRank
  const register = oneOf(raw.register, REGISTERS)
  if (register) word.register = register
  const variant = oneOf(raw.variant, VARIANTS)
  if (variant) word.variant = variant
  const literal = str(raw.literal, 400)
  if (literal) word.literal = literal

  return word
}

export function validateCard(raw: unknown): SRSCard | null {
  if (!isRecord(raw)) return null
  const wordId = int(raw.wordId, { min: 1 })
  const due = int(raw.due, { min: 0 })
  if (wordId == null || due == null) return null

  const card: SRSCard = {
    wordId,
    due,
    ease: num(raw.ease, { min: 1.3, max: 5 }) ?? 2.5,
    intervalDays: int(raw.intervalDays, { min: 0, max: 36_500 }) ?? 0,
    repetition: int(raw.repetition, { min: 0, max: 100_000 }) ?? 0,
    lapses: int(raw.lapses, { min: 0, max: 100_000 }) ?? 0,
    difficultyScore: num(raw.difficultyScore, { min: 0, max: 1 }) ?? 0.3,
  }
  const id = int(raw.id, { min: 1 })
  if (id != null) card.id = id
  const lastReviewed = int(raw.lastReviewed, { min: 0 })
  if (lastReviewed != null) card.lastReviewed = lastReviewed
  const preferred = oneOf(raw.preferredExercise, EXERCISES)
  if (preferred) card.preferredExercise = preferred
  return card
}

export function validateReview(raw: unknown): Review | null {
  if (!isRecord(raw)) return null
  const cardId = int(raw.cardId, { min: 1 })
  const wordId = int(raw.wordId, { min: 1 })
  const timestamp = int(raw.timestamp, { min: 0 })
  const quality = int(raw.quality, { min: 0, max: 5 })
  const exerciseType = oneOf(raw.exerciseType, EXERCISES)
  if (
    cardId == null ||
    wordId == null ||
    timestamp == null ||
    quality == null ||
    !exerciseType
  ) {
    return null
  }
  const review: Review = {
    cardId,
    wordId,
    timestamp,
    quality: quality as Quality,
    responseTimeMs: int(raw.responseTimeMs, { min: 0, max: 3_600_000 }) ?? 0,
    exerciseType,
    wasCorrect: bool(raw.wasCorrect) ?? quality >= 3,
  }
  const id = int(raw.id, { min: 1 })
  if (id != null) review.id = id
  const userInput = str(raw.userInput)
  if (userInput) review.userInput = userInput
  return review
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function validateDailyLog(raw: unknown): DailyLog | null {
  if (!isRecord(raw)) return null
  const date = str(raw.date, 10)
  if (!date || !ISO_DATE.test(date)) return null
  return {
    date,
    xpEarned: int(raw.xpEarned, { min: 0, max: 10_000_000 }) ?? 0,
    reviewsDone: int(raw.reviewsDone, { min: 0, max: 1_000_000 }) ?? 0,
    timeSpentSeconds: int(raw.timeSpentSeconds, { min: 0, max: 86_400 }) ?? 0,
    mistakes: int(raw.mistakes, { min: 0, max: 1_000_000 }) ?? 0,
    goalReached: bool(raw.goalReached) ?? false,
  }
}

export function validateUserStats(raw: unknown): UserStats | null {
  if (!isRecord(raw)) return null
  const lastActiveDay = str(raw.lastActiveDay, 10)
  const lastShieldDay = str(raw.lastShieldGrantedDay, 10)
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: 1,
    xp: int(raw.xp, { min: 0, max: 100_000_000 }) ?? 0,
    level: int(raw.level, { min: 0, max: 1_000 }) ?? 0,
    currentStreak: int(raw.currentStreak, { min: 0, max: 100_000 }) ?? 0,
    longestStreak: int(raw.longestStreak, { min: 0, max: 100_000 }) ?? 0,
    totalReviews: int(raw.totalReviews, { min: 0, max: 10_000_000 }) ?? 0,
    dailyGoalXp: int(raw.dailyGoalXp, { min: 1, max: 100_000 }) ?? 20,
    lastActiveDay:
      lastActiveDay && ISO_DATE.test(lastActiveDay) ? lastActiveDay : today,
    createdAt: int(raw.createdAt, { min: 0 }) ?? Date.now(),
    cefrLevel: oneOf(raw.cefrLevel, LEVELS) ?? 'B1',
    displayName: str(raw.displayName, 60) ?? 'Learner',
    streakShields: int(raw.streakShields, { min: 0, max: 100 }) ?? 1,
    lastShieldGrantedDay:
      lastShieldDay && ISO_DATE.test(lastShieldDay) ? lastShieldDay : today,
  }
}

export function validateAchievement(raw: unknown): Achievement | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id, 80)
  const name = str(raw.name, 120)
  const description = str(raw.description, 400)
  if (!id || !name || !description) return null
  const achievement: Achievement = {
    id,
    name,
    description,
    icon: str(raw.icon, 16) ?? '★',
  }
  const unlockedAt = int(raw.unlockedAt, { min: 0 })
  if (unlockedAt != null) achievement.unlockedAt = unlockedAt
  return achievement
}

/** `#rgb`, `#rrggbb`, or a bare CSS colour keyword — nothing that can escape a style value. */
const SAFE_COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20})$/

export function validateTag(raw: unknown): Tag | null {
  if (!isRecord(raw)) return null
  const name = str(raw.name, 60)
  if (!name) return null
  const rawColor = str(raw.color, 24)
  const tag: Tag = {
    name,
    color: rawColor && SAFE_COLOR.test(rawColor) ? rawColor : 'currentColor',
  }
  const id = int(raw.id, { min: 1 })
  if (id != null) tag.id = id
  const parentId = int(raw.parentId, { min: 1 })
  if (parentId != null) tag.parentId = parentId
  return tag
}

export function validateSettings(raw: unknown): Settings | null {
  if (!isRecord(raw)) return null
  const settings: Settings = {
    id: 1,
    theme: oneOf(raw.theme, ['dark', 'light'] as const) ?? 'dark',
    soundEnabled: bool(raw.soundEnabled) ?? true,
    vibrationsEnabled: bool(raw.vibrationsEnabled) ?? true,
    voiceRate: num(raw.voiceRate, { min: 0.5, max: 2 }) ?? 1,
    voicePitch: num(raw.voicePitch, { min: 0, max: 2 }) ?? 1,
    difficultyOffset: int(raw.difficultyOffset, { min: -2, max: 2 }) ?? 0,
  }
  const voiceURI = str(raw.voiceURI, 200)
  if (voiceURI) settings.voiceURI = voiceURI
  const onboardingComplete = bool(raw.onboardingComplete)
  if (onboardingComplete != null) settings.onboardingComplete = onboardingComplete
  const reminderEnabled = bool(raw.reminderEnabled)
  if (reminderEnabled != null) settings.reminderEnabled = reminderEnabled
  const reminderHour = int(raw.reminderHour, { min: 0, max: 23 })
  if (reminderHour != null) settings.reminderHour = reminderHour
  return settings
}

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

/** Read every table into a single plain object. */
export async function exportSnapshot(): Promise<BackupFile> {
  const [words, cards, reviews, userStats, dailyLogs, achievements, tags, settings] =
    await Promise.all([
      db.words.toArray(),
      db.cards.toArray(),
      db.reviews.toArray(),
      db.userStats.toArray(),
      db.dailyLogs.toArray(),
      db.achievements.toArray(),
      db.tags.toArray(),
      db.settings.toArray(),
    ])

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    sourceDb: db.name,
    words,
    cards,
    reviews,
    userStats,
    dailyLogs,
    achievements,
    tags,
    settings,
  }
}

/** Filename for a snapshot: `mx-learning-backup-2026-08-10-1432.json`. */
export function backupFilename(source = db.name): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  return `${source}-backup-${stamp}.json`
}

/** Export and hand the file to the user via a temporary object URL. */
export async function downloadBackup(): Promise<{ filename: string; bytes: number }> {
  const snapshot = await exportSnapshot()
  const json = JSON.stringify(snapshot)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const filename = backupFilename(snapshot.sourceDb)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return { filename, bytes: blob.size }
}

/* ------------------------------------------------------------------ */
/*  Import                                                             */
/* ------------------------------------------------------------------ */

export type ImportMode = 'merge' | 'replace'

const TABLE_VALIDATORS = {
  words: validateWord,
  cards: validateCard,
  reviews: validateReview,
  userStats: validateUserStats,
  dailyLogs: validateDailyLog,
  achievements: validateAchievement,
  tags: validateTag,
  settings: validateSettings,
} as const

type TableName = keyof typeof TABLE_VALIDATORS

/**
 * Parse and validate a backup document without writing anything.
 * Returns the cleaned rows plus per-table rejection counts.
 */
export function parseBackup(text: string): {
  ok: boolean
  error?: string
  rows?: Record<TableName, unknown[]>
  rejected: Record<string, number>
  exportedAt?: string
  sourceDb?: string
} {
  const rejected: Record<string, number> = {}

  // Cheap guard first: reject oversized payloads before JSON.parse allocates.
  const bytes = new Blob([text]).size
  if (bytes > MAX_BYTES) {
    return {
      ok: false,
      error: `File is ${(bytes / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_BYTES / 1024 / 1024} MB.`,
      rejected,
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.', rejected }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Unexpected file shape — expected a JSON object.', rejected }
  }
  if (parsed.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      error: 'This is not an MX Learning backup file.',
      rejected,
    }
  }
  const version = int(parsed.version, { min: 1, max: 1_000 })
  if (version == null || version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Backup version ${String(parsed.version)} is newer than this app understands (${BACKUP_VERSION}).`,
      rejected,
    }
  }

  const rows = {} as Record<TableName, unknown[]>
  for (const table of Object.keys(TABLE_VALIDATORS) as TableName[]) {
    const validate = TABLE_VALIDATORS[table] as (raw: unknown) => unknown
    const input = parsed[table]
    if (!Array.isArray(input)) {
      rows[table] = []
      continue
    }
    const capped = input.slice(0, MAX_ROWS[table])
    const accepted: unknown[] = []
    let dropped = input.length - capped.length
    for (const raw of capped) {
      const clean = validate(raw)
      if (clean == null) dropped++
      else accepted.push(clean)
    }
    rows[table] = accepted
    if (dropped > 0) rejected[table] = dropped
  }

  return {
    ok: true,
    rows,
    rejected,
    exportedAt: str(parsed.exportedAt, 40),
    sourceDb: str(parsed.sourceDb, 80),
  }
}

/**
 * Write a validated backup into the database.
 *
 * `merge` (default) keeps existing rows and overwrites those whose primary key
 * collides — the natural choice for restoring onto a live deck.
 * `replace` clears every table first — for restoring a snapshot verbatim.
 */
export async function importSnapshot(
  text: string,
  mode: ImportMode = 'merge',
): Promise<ImportReport> {
  const parsed = parseBackup(text)
  if (!parsed.ok || !parsed.rows) {
    return {
      ok: false,
      error: parsed.error ?? 'Import failed.',
      accepted: {},
      rejected: parsed.rejected,
    }
  }

  const rows = parsed.rows
  const accepted: Record<string, number> = {}

  await db.transaction(
    'rw',
    [
      db.words,
      db.cards,
      db.reviews,
      db.userStats,
      db.dailyLogs,
      db.achievements,
      db.tags,
      db.settings,
    ],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.words.clear(),
          db.cards.clear(),
          db.reviews.clear(),
          db.dailyLogs.clear(),
          db.achievements.clear(),
          db.tags.clear(),
        ])
      }
      await db.words.bulkPut(rows.words as Word[])
      await db.cards.bulkPut(rows.cards as SRSCard[])
      await db.reviews.bulkPut(rows.reviews as Review[])
      await db.dailyLogs.bulkPut(rows.dailyLogs as DailyLog[])
      await db.achievements.bulkPut(rows.achievements as Achievement[])
      await db.tags.bulkPut(rows.tags as Tag[])
      // Singletons: only overwrite when the file actually carries one.
      if (rows.userStats.length > 0) {
        await db.userStats.put(rows.userStats[0] as UserStats)
      }
      if (rows.settings.length > 0) {
        await db.settings.put(rows.settings[0] as Settings)
      }
    },
  )

  for (const table of Object.keys(rows) as TableName[]) {
    accepted[table] = rows[table].length
  }

  return { ok: true, accepted, rejected: parsed.rejected }
}

/* ------------------------------------------------------------------ */
/*  Rolling auto-snapshot (separate database)                          */
/* ------------------------------------------------------------------ */

interface StoredSnapshot {
  id?: number
  createdAt: number
  sourceDb: string
  /** The serialised BackupFile. Stored as text so it can be re-downloaded verbatim. */
  json: string
  bytes: number
  wordCount: number
}

class BackupVault extends Dexie {
  snapshots!: Table<StoredSnapshot, number>

  constructor() {
    // Deliberately a DIFFERENT IndexedDB database from the main one, so
    // wiping/corrupting `mx-learning` doesn't take the backups with it.
    super('mx-learning-backups')
    this.version(1).stores({ snapshots: '++id, createdAt, sourceDb' })
  }
}

export const vault = new BackupVault()

/** How many snapshots to keep per source database. */
const KEEP_SNAPSHOTS = 5
/** Don't take a fresh snapshot if the newest one is younger than this. */
const SNAPSHOT_MIN_AGE_MS = 6 * 60 * 60 * 1000 // 6 h

export interface SnapshotMeta {
  id: number
  createdAt: number
  sourceDb: string
  bytes: number
  wordCount: number
}

/**
 * Take a snapshot on app load if the newest one is stale.
 *
 * Safe to call unconditionally: it never throws (a failed backup must not
 * break the app), and it self-throttles so a user who opens the app twenty
 * times a day doesn't accumulate twenty copies.
 */
export async function autoSnapshot(): Promise<SnapshotMeta | null> {
  try {
    const sourceDb = db.name
    const latest = await vault.snapshots
      .where('sourceDb')
      .equals(sourceDb)
      .reverse()
      .sortBy('createdAt')
      .then((rows) => rows[0])

    if (latest && Date.now() - latest.createdAt < SNAPSHOT_MIN_AGE_MS) return null

    const snapshot = await exportSnapshot()
    // Nothing to protect yet — skip so a fresh install doesn't store an
    // empty file that would later "win" over a real one.
    if (snapshot.words.length === 0 && snapshot.reviews.length === 0) return null

    const json = JSON.stringify(snapshot)
    const row: StoredSnapshot = {
      createdAt: Date.now(),
      sourceDb,
      json,
      bytes: new Blob([json]).size,
      wordCount: snapshot.words.length,
    }
    const id = await vault.snapshots.add(row)

    // Prune the tail.
    const all = await vault.snapshots.where('sourceDb').equals(sourceDb).sortBy('createdAt')
    const excess = all.slice(0, Math.max(0, all.length - KEEP_SNAPSHOTS))
    if (excess.length > 0) {
      await vault.snapshots.bulkDelete(excess.map((s) => s.id!).filter((x) => x != null))
    }

    return {
      id,
      createdAt: row.createdAt,
      sourceDb,
      bytes: row.bytes,
      wordCount: row.wordCount,
    }
  } catch (err) {
    console.warn('[MX Learning] auto-snapshot skipped:', err)
    return null
  }
}

/** List stored snapshots (metadata only — the JSON payload is not loaded). */
export async function listSnapshots(sourceDb = db.name): Promise<SnapshotMeta[]> {
  try {
    const rows = await vault.snapshots.where('sourceDb').equals(sourceDb).sortBy('createdAt')
    return rows
      .reverse()
      .map((r) => ({
        id: r.id!,
        createdAt: r.createdAt,
        sourceDb: r.sourceDb,
        bytes: r.bytes,
        wordCount: r.wordCount,
      }))
  } catch {
    return []
  }
}

/** Download a previously stored snapshot as a file. */
export async function downloadSnapshot(id: number): Promise<boolean> {
  const row = await vault.snapshots.get(id)
  if (!row) return false
  const blob = new Blob([row.json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFilename(row.sourceDb)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return true
}

/** Restore a stored snapshot back into the main database. */
export async function restoreSnapshot(
  id: number,
  mode: ImportMode = 'replace',
): Promise<ImportReport> {
  const row = await vault.snapshots.get(id)
  if (!row) {
    return { ok: false, error: 'Snapshot not found.', accepted: {}, rejected: {} }
  }
  return importSnapshot(row.json, mode)
}
