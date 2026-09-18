/**
 * MX Learning — core domain types.
 * Single source of truth for the data model used across DB, store, and UI.
 */

import type { LucideIcon } from 'lucide-react'

/** CEFR level. */
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

/** Part of speech. */
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'determiner'
  | 'interjection'
  | 'phrase'
  | 'idiom'
  | 'other'

/** A vocabulary unit (word, phrase, idiom). */
export interface Word {
  id?: number
  /** English lemma — display form. */
  lemma: string
  partOfSpeech: PartOfSpeech
  /** International Phonetic Alphabet, optional. */
  ipa?: string
  /** French translation (used in error explanations only). */
  fr?: string
  /** CEFR level the item belongs to. */
  level: Level
  /** Free-form tags (e.g. "business", "tech", "ux", "interview"). */
  tags: string[]
  /** Frequency rank (1 = most frequent). Lower = more common. */
  frequencyRank?: number
  /** Example sentences in EN, with optional FR translation for explanations. */
  examples: { en: string; fr?: string }[]
  /** Definition in plain English (for immersion). */
  definitionEn?: string
  /** When this word was added to the user's deck. */
  addedAt: number
  /** Whether this word came from the seed set or was added dynamically. */
  source: 'seed' | 'mistral' | 'user' | 'session'

  /* --- Idiom-specific metadata (partOfSpeech === 'idiom' | 'phrase') --- */

  /**
   * How the expression lands socially. Idioms are register-sensitive in a way
   * single words rarely are — "spill the beans" in a board meeting reads very
   * differently from "disclose". Displayed as a badge so the learner knows
   * where an expression is safe to use.
   */
  register?: 'informal' | 'neutral' | 'formal'
  /**
   * Regional variant. `both` means the expression travels; `BrE`/`AmE` warn
   * that the other side of the Atlantic will hear it as foreign.
   */
  variant?: 'BrE' | 'AmE' | 'both'
  /**
   * Literal reading, for idioms whose surface meaning is misleading
   * (e.g. "bite the bullet" → "to bite a bullet"). Purely explanatory.
   */
  literal?: string
}

/** Type of exercise — drives Dynamic Weighting. */
export type ExerciseType =
  /** The signature review screen: recall a word from its front face alone. */
  | 'flashcard'
  | 'fill-in-blank'
  | 'random-words-context'
  | 'time-attack'
  | 'writing-conversation'
  | 'audio-conversation'
  | 'image-description'
  | 'interview-simulator'
  | 'learn-from-text'
  | 'listening-dictation'
  | 'pronunciation'
  | 'grammar'
  | 'tenses'
  | 'conjugation'

/** SRS card — one per (word, exercise focus) pair. */
export interface SRSCard {
  id?: number
  wordId: number
  /** Next due timestamp (ms since epoch). */
  due: number
  /** Last reviewed timestamp. */
  lastReviewed?: number
  /** SM-2 / FSRS-style ease factor (default 2.5). */
  ease: number
  /** Current interval in days. */
  intervalDays: number
  /** Repetition count (consecutive successful reviews). */
  repetition: number
  /** Total lapses (failures on a learned card). */
  lapses: number
  /** Difficulty score [0..1] — drives Dynamic Weighting. */
  difficultyScore: number
  /** Preferred exercise type for next review (set by Dynamic Weighting). */
  preferredExercise?: ExerciseType
}

/** Quality of a recall — SM-2 standard, 0..5. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5

/** A logged review (for analytics + history). */
export interface Review {
  id?: number
  cardId: number
  wordId: number
  timestamp: number
  quality: Quality
  /** Response time in ms. */
  responseTimeMs: number
  exerciseType: ExerciseType
  /** Was the user's answer literally correct (string match)? */
  wasCorrect: boolean
  /** Optional user input (for spelling analytics). */
  userInput?: string
}

/** Single-row table — the user's persistent stats. */
export interface UserStats {
  id: 1 // singleton
  xp: number
  level: number
  /** Current learning streak in days. */
  currentStreak: number
  longestStreak: number
  totalReviews: number
  /** Daily XP goal (default 20). */
  dailyGoalXp: number
  lastActiveDay: string // ISO date YYYY-MM-DD
  createdAt: number
  /** CEFR self-assessed or detected level. */
  cefrLevel: Level
  /** Display name. */
  displayName: string
  /**
   * Streak shields available. Each shield absorbs exactly one missed day,
   * keeping the streak alive. Capped at MAX_STREAK_SHIELDS.
   */
  streakShields: number
  /**
   * ISO date of the last shield auto-grant. Used to time replenishment
   * (one new shield every SHIELD_GRANT_INTERVAL_DAYS, up to the cap).
   */
  lastShieldGrantedDay: string
}

/** Per-day rollup for history charts. */
export interface DailyLog {
  /** ISO date YYYY-MM-DD — primary key. */
  date: string
  xpEarned: number
  reviewsDone: number
  timeSpentSeconds: number
  mistakes: number
  goalReached: boolean
}

/** Achievement / badge definition. */
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string // emoji or icon key
  /** Unlock timestamp; undefined = not unlocked. */
  unlockedAt?: number
}

/** Tag for organising vocab thematically. */
export interface Tag {
  id?: number
  name: string
  color: string
  parentId?: number
}

/** One completed pass of the CEFR placement/retake test — history for progress tracking. */
export interface LevelCheck {
  id?: number
  /** When this attempt was completed (ms since epoch). */
  date: number
  cefrLevel: Level
  score: number
  maxScore: number
}

/**
 * A bundled Aussie-module word: everything a Word needs except its
 * per-install fields, plus an icon shown on its flashcard while learning.
 * The icon is a component reference — strip it before writing to Dexie.
 */
export interface AussieWordSeed extends Omit<Word, 'id' | 'addedAt' | 'source'> {
  icon: LucideIcon
}

/**
 * One workplace/life domain in the "Aussie" module — the working-holiday
 * survival vocabulary (mining, farm work, hospitality, visas, slang…).
 * Each domain teaches its own words before drilling them, so `words` lives
 * on the domain rather than in a separate lookup table.
 */
export interface AussieDomain {
  id: string
  name: string
  blurb: string
  /** Icon for the domain tile — from the same lucide-react set as the sidebar. */
  icon: LucideIcon
  /** False for a domain that only exists as a placeholder on the grid so far. */
  ready: boolean
  words: AussieWordSeed[]
}

/** The two independent drill types a domain's parts can be practiced with. */
export type AussieDomainSkill = 'quiz' | 'context'

/** Best result recorded for one quiz part. */
export interface AussiePartResult {
  bestScore: number
  timesCompleted: number
  lastPracticedAt: number
}

/**
 * Per-domain progress — tracked separately from the main FSRS deck.
 *
 * "Learn the words", "Take the quiz" and "Real-life context" are three
 * independent entry points — a learner can do any of them first, or only
 * one. Quiz and context practice are each split into fixed parts (Part 1,
 * Part 2, …) of `AUSSIE_PART_SIZE` words, taken from the domain's authored
 * word order, so each part stays the same set of words across visits and
 * can be listed and picked individually. The two skills are tracked in
 * separate buckets since a multiple-choice score and a typed-cloze score
 * aren't comparable.
 */
export interface AussieProgress {
  /** Primary key. */
  domainId: string
  /** Set once "Learn the words" has been opened and finished at least once. */
  taughtAt?: number
  /** Quiz (multiple-choice) results per part, keyed by part index (0-based). */
  quizParts: Record<number, AussiePartResult>
  /** Context (fill-in-the-blank) results per part, keyed by part index (0-based). */
  contextParts: Record<number, AussiePartResult>
}

/** App-level settings persisted across sessions. */
export interface Settings {
  id: 1 // singleton
  theme: 'dark' | 'light'
  soundEnabled: boolean
  vibrationsEnabled: boolean
  voiceURI?: string // selected TTS voice
  voiceRate: number // 0.5..2
  voicePitch: number // 0..2
  /** Manual difficulty override [-2..+2] (0 = auto). */
  difficultyOffset: number
  /** True once the user has seen / completed the onboarding test. */
  onboardingComplete?: boolean
  /**
   * Prefer an Australian-accented voice for the Aussie module's TTS.
   * Defaults to true when unset. Falls back silently to the normal voice
   * on a browser/OS with no `en-AU` voice available.
   */
  aussieAccent?: boolean
}
