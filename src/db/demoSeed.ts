/**
 * Staging-only fixture data.
 *
 * Purpose: judge the UI on realistic content. An empty deck makes every
 * screen look good; a deck with 40 words at wildly different points in their
 * SRS life is where layout problems actually show up — long lemmas, missing
 * IPA, three-line definitions, a card that lapsed nine times, a streak that
 * broke on Tuesday.
 *
 * This module is only ever called when `IS_DEMO` is true, i.e. against the
 * `mx-learning-demo` database. It can never touch the real deck.
 */

import { db } from './database'
import { isoDate } from '@/utils/dailyLog'
import type { DailyLog, ExerciseType, Quality, Review, SRSCard, Word } from '@/types'

const DAY = 86_400_000

/**
 * One demo entry = a word plus the SRS state it should be in.
 *
 * `dueInDays` is relative to now: negative = overdue, 0 = due today,
 * positive = scheduled in the future. `null` = a brand-new card.
 */
interface DemoEntry {
  word: Omit<Word, 'addedAt' | 'source'>
  srs: {
    dueInDays: number
    intervalDays: number
    repetition: number
    lapses: number
    ease: number
    /** Days ago this card was last seen; null = never reviewed. */
    lastSeenDaysAgo: number | null
  }
}

/** Compact helper so the table below stays readable. */
function srs(
  dueInDays: number,
  intervalDays: number,
  repetition: number,
  lapses: number,
  ease: number,
  lastSeenDaysAgo: number | null,
): DemoEntry['srs'] {
  return { dueInDays, intervalDays, repetition, lapses, ease, lastSeenDaysAgo }
}

const DEMO_ENTRIES: DemoEntry[] = [
  /* ---- Overdue and painful: the cards that keep slipping ---- */
  {
    word: {
      lemma: 'cumbersome',
      partOfSpeech: 'adjective',
      ipa: '/ˈkʌmbərsəm/',
      fr: 'encombrant, lourd',
      level: 'C1',
      tags: ['ux', 'writing'],
      definitionEn: 'Slow or complicated to use, carry, or deal with.',
      examples: [
        { en: 'The checkout flow is cumbersome on mobile.', fr: 'Le tunnel de paiement est lourd sur mobile.' },
      ],
    },
    srs: srs(-9, 4, 1, 6, 1.5, 9),
  },
  {
    word: {
      lemma: 'to hedge',
      partOfSpeech: 'verb',
      ipa: '/hedʒ/',
      fr: 'se couvrir, rester évasif',
      level: 'C1',
      tags: ['business'],
      definitionEn: 'To avoid committing yourself, so you are protected either way.',
      examples: [{ en: 'Stop hedging — do you want to ship it or not?' }],
    },
    srs: srs(-6, 3, 1, 5, 1.6, 6),
  },
  {
    word: {
      lemma: 'discrepancy',
      partOfSpeech: 'noun',
      ipa: '/dɪsˈkrepənsi/',
      fr: 'écart, divergence',
      level: 'C1',
      tags: ['business', 'data'],
      definitionEn: 'A difference between two things that should match.',
      examples: [{ en: "There's a discrepancy between the mock-up and the build." }],
    },
    srs: srs(-4, 6, 2, 4, 1.7, 4),
  },
  {
    word: {
      lemma: 'to nail down',
      partOfSpeech: 'phrase',
      fr: 'arrêter, fixer définitivement',
      level: 'B2',
      tags: ['business', 'meetings'],
      register: 'informal',
      variant: 'both',
      definitionEn: 'To settle something vague into a firm, agreed decision.',
      examples: [{ en: "Let's nail down the scope before Friday." }],
    },
    srs: srs(-3, 2, 1, 3, 1.8, 3),
  },
  {
    word: {
      lemma: 'thorough',
      partOfSpeech: 'adjective',
      ipa: '/ˈθʌrə/',
      fr: 'minutieux',
      level: 'B2',
      tags: ['work'],
      definitionEn: 'Done completely, with attention to every detail.',
      examples: [{ en: 'She gave the spec a thorough read before the review.' }],
    },
    srs: srs(-2, 5, 2, 2, 2.0, 2),
  },

  /* ---- Due today: the working set ---- */
  {
    word: {
      lemma: 'affordance',
      partOfSpeech: 'noun',
      ipa: '/əˈfɔːdəns/',
      fr: 'affordance',
      level: 'C1',
      tags: ['ux', 'design'],
      definitionEn: 'A property that signals how an object can be used.',
      examples: [{ en: 'A raised button has a stronger affordance than flat text.' }],
    },
    srs: srs(0, 8, 3, 1, 2.3, 8),
  },
  {
    word: {
      lemma: 'to iterate',
      partOfSpeech: 'verb',
      ipa: '/ˈɪtəreɪt/',
      fr: 'itérer',
      level: 'B2',
      tags: ['design', 'process'],
      definitionEn: 'To repeat a cycle of work, improving a little each time.',
      examples: [{ en: 'We iterated on the onboarding for three sprints.' }],
    },
    srs: srs(0, 12, 4, 0, 2.6, 12),
  },
  {
    word: {
      lemma: 'trade-off',
      partOfSpeech: 'noun',
      ipa: '/ˈtreɪd ɒf/',
      fr: 'compromis',
      level: 'B2',
      tags: ['design', 'business'],
      definitionEn: 'Something you give up in order to gain something else.',
      examples: [{ en: 'Density versus readability is the classic trade-off.' }],
    },
    srs: srs(0, 6, 2, 1, 2.4, 6),
  },
  {
    word: {
      lemma: 'to bite the bullet',
      partOfSpeech: 'idiom',
      fr: 'prendre son mal en patience, se lancer',
      level: 'B2',
      tags: ['idiom', 'decisions'],
      register: 'neutral',
      variant: 'both',
      literal: 'to bite a bullet',
      definitionEn: 'To force yourself to do something unpleasant you have been avoiding.',
      examples: [{ en: 'We bit the bullet and rewrote the design system.' }],
    },
    srs: srs(0, 3, 1, 2, 2.1, 3),
  },
  {
    word: {
      lemma: 'leverage',
      partOfSpeech: 'noun',
      ipa: '/ˈliːvərɪdʒ/',
      fr: 'levier',
      level: 'C1',
      tags: ['business'],
      definitionEn: 'Power to influence a situation to your advantage.',
      examples: [{ en: 'Shipping early gave us leverage in the negotiation.' }],
    },
    srs: srs(0, 15, 4, 1, 2.5, 15),
  },
  {
    word: {
      lemma: 'to onboard',
      partOfSpeech: 'verb',
      fr: 'intégrer (un nouvel utilisateur)',
      level: 'B2',
      tags: ['ux', 'product'],
      definitionEn: 'To guide someone through their first experience of a product.',
      examples: [{ en: 'We onboard new users in under ninety seconds.' }],
    },
    srs: srs(0, 4, 2, 0, 2.5, 4),
  },
  {
    word: {
      lemma: 'granular',
      partOfSpeech: 'adjective',
      ipa: '/ˈɡrænjʊlə/',
      fr: 'granulaire, fin',
      level: 'C1',
      tags: ['data', 'design'],
      definitionEn: 'Broken into very small, individually controllable parts.',
      examples: [{ en: 'Give me granular control over the spacing scale.' }],
    },
    srs: srs(0, 9, 3, 0, 2.7, 9),
  },

  /* ---- Comfortably scheduled: proof the UI handles healthy cards ---- */
  {
    word: {
      lemma: 'seamless',
      partOfSpeech: 'adjective',
      ipa: '/ˈsiːmləs/',
      fr: 'fluide, sans couture',
      level: 'B2',
      tags: ['ux'],
      definitionEn: 'Happening without any noticeable break or friction.',
      examples: [{ en: 'The hand-off between design and code felt seamless.' }],
    },
    srs: srs(3, 21, 5, 0, 2.8, 18),
  },
  {
    word: {
      lemma: 'to advocate for',
      partOfSpeech: 'phrase',
      fr: 'plaider pour',
      level: 'C1',
      tags: ['work', 'meetings'],
      register: 'formal',
      variant: 'both',
      definitionEn: 'To argue publicly in favour of something or someone.',
      examples: [{ en: 'I advocated for the accessibility budget all year.' }],
    },
    srs: srs(5, 30, 6, 0, 2.9, 25),
  },
  {
    word: {
      lemma: 'compelling',
      partOfSpeech: 'adjective',
      ipa: '/kəmˈpelɪŋ/',
      fr: 'convaincant',
      level: 'B2',
      tags: ['writing', 'presentation'],
      definitionEn: 'So interesting or convincing that you cannot ignore it.',
      examples: [{ en: 'The research made a compelling case for the redesign.' }],
    },
    srs: srs(7, 24, 5, 1, 2.6, 17),
  },
  {
    word: {
      lemma: 'to push back',
      partOfSpeech: 'phrase',
      fr: 'contester, résister',
      level: 'B2',
      tags: ['work', 'meetings'],
      register: 'informal',
      variant: 'both',
      definitionEn: 'To disagree with a request instead of accepting it.',
      examples: [{ en: 'I pushed back on the deadline and they moved it.' }],
    },
    srs: srs(11, 40, 6, 1, 2.7, 29),
  },
  {
    word: {
      lemma: 'scope creep',
      partOfSpeech: 'noun',
      fr: 'dérive du périmètre',
      level: 'C1',
      tags: ['product', 'process'],
      definitionEn: 'The slow growth of a project beyond what was agreed.',
      examples: [{ en: 'Three extra screens later, this is textbook scope creep.' }],
    },
    srs: srs(14, 45, 7, 0, 3.0, 31),
  },
  {
    word: {
      lemma: 'to be on the same page',
      partOfSpeech: 'idiom',
      fr: 'être sur la même longueur d’onde',
      level: 'B1',
      tags: ['idiom', 'meetings'],
      register: 'informal',
      variant: 'both',
      definitionEn: 'To share the same understanding of a situation.',
      examples: [{ en: 'Quick sync so we are all on the same page.' }],
    },
    srs: srs(19, 60, 7, 0, 3.0, 41),
  },
  {
    word: {
      lemma: 'ballpark figure',
      partOfSpeech: 'idiom',
      fr: 'ordre de grandeur',
      level: 'B2',
      tags: ['idiom', 'business'],
      register: 'informal',
      variant: 'AmE',
      definitionEn: 'A rough estimate, close enough to be useful.',
      examples: [{ en: 'Give me a ballpark figure — two weeks or two months?' }],
    },
    srs: srs(23, 55, 6, 1, 2.8, 32),
  },
  {
    word: {
      lemma: 'to touch base',
      partOfSpeech: 'idiom',
      fr: 'prendre contact, faire un point',
      level: 'B2',
      tags: ['idiom', 'meetings'],
      register: 'informal',
      variant: 'AmE',
      definitionEn: 'To make brief contact to check how things are going.',
      examples: [{ en: "Let's touch base on Thursday before the review." }],
    },
    srs: srs(28, 70, 8, 0, 3.1, 42),
  },

  /* ---- Brand-new: never reviewed, the "fresh import" look ---- */
  {
    word: {
      lemma: 'perfunctory',
      partOfSpeech: 'adjective',
      ipa: '/pəˈfʌŋktəri/',
      fr: 'expéditif, fait sans conviction',
      level: 'C2',
      tags: ['writing'],
      definitionEn: 'Done quickly and without real care, just to get it over with.',
      examples: [{ en: 'He gave the deck a perfunctory glance and approved it.' }],
    },
    srs: srs(0, 0, 0, 0, 2.5, null),
  },
  {
    word: {
      lemma: 'to belabour',
      partOfSpeech: 'verb',
      ipa: '/bɪˈleɪbə/',
      fr: 'insister lourdement sur',
      level: 'C2',
      tags: ['writing', 'meetings'],
      variant: 'BrE',
      definitionEn: 'To keep explaining something long after everyone has understood.',
      examples: [{ en: "I won't belabour the point — the data speaks." }],
    },
    srs: srs(0, 0, 0, 0, 2.5, null),
  },
  {
    word: {
      lemma: 'ostensibly',
      partOfSpeech: 'adverb',
      ipa: '/ɒsˈtensɪbli/',
      fr: 'en apparence, officiellement',
      level: 'C2',
      tags: ['writing'],
      definitionEn: 'According to what is claimed, though possibly not truly.',
      examples: [{ en: 'The change was ostensibly about performance.' }],
    },
    srs: srs(0, 0, 0, 0, 2.5, null),
  },
  {
    word: {
      lemma: 'to gloss over',
      partOfSpeech: 'phrase',
      fr: 'passer sous silence',
      level: 'C1',
      tags: ['writing', 'meetings'],
      register: 'neutral',
      variant: 'both',
      definitionEn: 'To mention something briefly to avoid dealing with it.',
      examples: [{ en: 'The report glosses over the drop in retention.' }],
    },
    srs: srs(0, 0, 0, 0, 2.5, null),
  },
  {
    word: {
      lemma: 'to move the needle',
      partOfSpeech: 'idiom',
      fr: 'faire bouger les lignes',
      level: 'C1',
      tags: ['idiom', 'business'],
      register: 'informal',
      variant: 'AmE',
      definitionEn: 'To make a difference big enough to show up in the numbers.',
      examples: [{ en: 'Nice polish, but it will not move the needle.' }],
    },
    srs: srs(0, 0, 0, 0, 2.5, null),
  },
  {
    word: {
      lemma: 'a red herring',
      partOfSpeech: 'idiom',
      fr: 'fausse piste',
      level: 'C1',
      tags: ['idiom', 'analysis'],
      register: 'neutral',
      variant: 'both',
      literal: 'a herring that is red',
      definitionEn: 'A detail that looks important but leads you away from the real issue.',
      examples: [{ en: 'The font size was a red herring — the contrast was the bug.' }],
    },
    srs: srs(0, 0, 0, 0, 2.5, null),
  },

  /* ---- Mid-life, mixed quality ---- */
  {
    word: {
      lemma: 'concise',
      partOfSpeech: 'adjective',
      ipa: '/kənˈsaɪs/',
      fr: 'concis',
      level: 'B2',
      tags: ['writing'],
      definitionEn: 'Saying what is needed in few words.',
      examples: [{ en: 'Keep the empty state concise — one line, one action.' }],
    },
    srs: srs(1, 10, 3, 1, 2.4, 9),
  },
  {
    word: {
      lemma: 'ambiguous',
      partOfSpeech: 'adjective',
      ipa: '/æmˈbɪɡjuəs/',
      fr: 'ambigu',
      level: 'B2',
      tags: ['writing', 'ux'],
      definitionEn: 'Open to more than one interpretation.',
      examples: [{ en: 'That icon is ambiguous without a label.' }],
    },
    srs: srs(-1, 7, 2, 2, 2.2, 8),
  },
  {
    word: {
      lemma: 'to defer',
      partOfSpeech: 'verb',
      ipa: '/dɪˈfɜː/',
      fr: 'reporter, s’en remettre à',
      level: 'C1',
      tags: ['work'],
      definitionEn: 'To postpone something, or to let someone else decide.',
      examples: [{ en: "We deferred the animation work to next quarter." }],
    },
    srs: srs(2, 13, 4, 1, 2.5, 11),
  },
  {
    word: {
      lemma: 'consistency',
      partOfSpeech: 'noun',
      ipa: '/kənˈsɪstənsi/',
      fr: 'cohérence',
      level: 'B1',
      tags: ['design'],
      definitionEn: 'The quality of always behaving or looking the same way.',
      examples: [{ en: 'Consistency beats novelty in a design system.' }],
    },
    srs: srs(4, 18, 5, 0, 2.7, 14),
  },
  {
    word: {
      lemma: 'to streamline',
      partOfSpeech: 'verb',
      ipa: '/ˈstriːmlaɪn/',
      fr: 'rationaliser, simplifier',
      level: 'B2',
      tags: ['process', 'ux'],
      definitionEn: 'To make a process simpler and more efficient.',
      examples: [{ en: 'We streamlined signup from five steps to two.' }],
    },
    srs: srs(6, 20, 5, 0, 2.6, 14),
  },
  {
    word: {
      lemma: 'friction',
      partOfSpeech: 'noun',
      ipa: '/ˈfrɪkʃən/',
      fr: 'friction',
      level: 'B2',
      tags: ['ux'],
      definitionEn: 'Anything that makes a task feel harder than it should.',
      examples: [{ en: 'Every extra field adds friction.' }],
    },
    srs: srs(-5, 8, 2, 3, 1.9, 5),
  },
  {
    word: {
      lemma: 'to reconcile',
      partOfSpeech: 'verb',
      ipa: '/ˈrekənsaɪl/',
      fr: 'concilier, réconcilier',
      level: 'C1',
      tags: ['business', 'data'],
      definitionEn: 'To make two conflicting things agree with each other.',
      examples: [{ en: 'We need to reconcile the research with the roadmap.' }],
    },
    srs: srs(9, 26, 5, 1, 2.6, 17),
  },
  {
    word: {
      lemma: 'to circle back',
      partOfSpeech: 'idiom',
      fr: 'y revenir plus tard',
      level: 'B2',
      tags: ['idiom', 'meetings'],
      register: 'informal',
      variant: 'AmE',
      definitionEn: 'To return to a topic later instead of resolving it now.',
      examples: [{ en: "Let's circle back on pricing after the demo." }],
    },
    srs: srs(-7, 5, 1, 4, 1.7, 7),
  },
  {
    word: {
      lemma: 'to take something with a pinch of salt',
      partOfSpeech: 'idiom',
      fr: 'prendre avec des pincettes',
      level: 'C1',
      tags: ['idiom', 'analysis'],
      register: 'informal',
      variant: 'BrE',
      definitionEn: 'To treat a claim as probably exaggerated.',
      examples: [{ en: 'Take that benchmark with a pinch of salt.' }],
    },
    srs: srs(16, 35, 6, 0, 2.9, 19),
  },
  {
    word: {
      lemma: 'plausible',
      partOfSpeech: 'adjective',
      ipa: '/ˈplɔːzəbl/',
      fr: 'plausible',
      level: 'B2',
      tags: ['analysis'],
      definitionEn: 'Believable enough to be worth considering.',
      examples: [{ en: 'That is a plausible explanation for the drop-off.' }],
    },
    srs: srs(1, 11, 3, 1, 2.5, 10),
  },
  {
    word: {
      lemma: 'to underpin',
      partOfSpeech: 'verb',
      ipa: '/ʌndəˈpɪn/',
      fr: 'sous-tendre, étayer',
      level: 'C1',
      tags: ['writing', 'design'],
      definitionEn: 'To form the foundation that something else rests on.',
      examples: [{ en: 'Four tokens underpin the whole spacing scale.' }],
    },
    srs: srs(-11, 3, 1, 7, 1.4, 11),
  },
  {
    word: {
      lemma: 'to go the extra mile',
      partOfSpeech: 'idiom',
      fr: 'faire un effort supplémentaire',
      level: 'B1',
      tags: ['idiom', 'work'],
      register: 'neutral',
      variant: 'both',
      definitionEn: 'To do more than is strictly required.',
      examples: [{ en: 'She went the extra mile on the empty states.' }],
    },
    srs: srs(12, 32, 6, 0, 2.8, 20),
  },
  {
    word: {
      lemma: 'stakeholder',
      partOfSpeech: 'noun',
      ipa: '/ˈsteɪkhəʊldə/',
      fr: 'partie prenante',
      level: 'B2',
      tags: ['business'],
      definitionEn: 'Anyone with an interest in the outcome of a project.',
      examples: [{ en: 'Every stakeholder wants a different first screen.' }],
    },
    srs: srs(0, 5, 2, 2, 2.3, 5),
  },
  {
    word: {
      lemma: 'to reach out',
      partOfSpeech: 'phrase',
      fr: 'contacter',
      level: 'B1',
      tags: ['work'],
      register: 'neutral',
      variant: 'both',
      definitionEn: 'To contact someone, usually to offer or ask for something.',
      examples: [{ en: 'Reach out if the spec is unclear.' }],
    },
    srs: srs(21, 50, 7, 0, 3.0, 29),
  },
  {
    word: {
      lemma: 'meticulous',
      partOfSpeech: 'adjective',
      ipa: '/məˈtɪkjələs/',
      fr: 'méticuleux',
      level: 'C1',
      tags: ['work', 'design'],
      definitionEn: 'Extremely careful about small details.',
      examples: [{ en: 'His redlines are meticulous to the half-pixel.' }],
    },
    srs: srs(-8, 6, 2, 5, 1.6, 8),
  },
]

/**
 * Demo activity history — a deliberately imperfect fortnight so the streak,
 * goal, and weekly-chart states all have something real to render.
 * Index 0 is today.
 */
const DEMO_ACTIVITY: Array<Pick<DailyLog, 'xpEarned' | 'reviewsDone' | 'timeSpentSeconds' | 'mistakes'>> = [
  { xpEarned: 14, reviewsDone: 9, timeSpentSeconds: 260, mistakes: 2 }, // today, goal not yet reached
  { xpEarned: 32, reviewsDone: 19, timeSpentSeconds: 540, mistakes: 3 },
  { xpEarned: 26, reviewsDone: 15, timeSpentSeconds: 430, mistakes: 5 },
  { xpEarned: 0, reviewsDone: 0, timeSpentSeconds: 0, mistakes: 0 }, // a missed day
  { xpEarned: 41, reviewsDone: 24, timeSpentSeconds: 700, mistakes: 4 },
  { xpEarned: 22, reviewsDone: 13, timeSpentSeconds: 380, mistakes: 1 },
  { xpEarned: 35, reviewsDone: 20, timeSpentSeconds: 600, mistakes: 6 },
  { xpEarned: 18, reviewsDone: 11, timeSpentSeconds: 300, mistakes: 2 },
  { xpEarned: 0, reviewsDone: 0, timeSpentSeconds: 0, mistakes: 0 },
  { xpEarned: 29, reviewsDone: 17, timeSpentSeconds: 500, mistakes: 3 },
  { xpEarned: 24, reviewsDone: 14, timeSpentSeconds: 410, mistakes: 4 },
  { xpEarned: 38, reviewsDone: 22, timeSpentSeconds: 650, mistakes: 2 },
  { xpEarned: 20, reviewsDone: 12, timeSpentSeconds: 340, mistakes: 3 },
  { xpEarned: 27, reviewsDone: 16, timeSpentSeconds: 470, mistakes: 5 },
]

const DEMO_GOAL_XP = 20

/** Rotated through when fabricating review history, so the mix looks used. */
const DEMO_EXERCISES: ExerciseType[] = [
  'flashcard',
  'flashcard',
  'fill-in-blank',
  'random-words-context',
  'listening-dictation',
  'time-attack',
  'pronunciation',
]

/**
 * Bump this whenever the fixture below changes. A staging database built
 * from an older fixture is wiped and rebuilt on next load, so you are never
 * looking at last week's demo data and wondering why the new field is
 * missing. Production never reads this — `seedDemoData` is only called
 * behind `IS_DEMO`.
 */
const FIXTURE_VERSION = 2
const FIXTURE_KEY = 'mx:demo-fixture-version'

/**
 * Fill the demo database. Idempotent within a fixture version: reloading
 * staging does not multiply the deck, but editing the fixture does rebuild
 * it from scratch.
 */
export async function seedDemoData(): Promise<void> {
  const existing = await db.words.count()
  let storedVersion: string | null = null
  try {
    storedVersion = localStorage.getItem(FIXTURE_KEY)
  } catch {
    /* Storage blocked — fall through and treat it as a first run. */
  }

  if (existing > 0 && storedVersion === String(FIXTURE_VERSION)) return

  if (existing > 0) {
    // Stale fixture: start clean rather than layering new rows on old ones.
    await db.transaction(
      'rw',
      [db.words, db.cards, db.reviews, db.dailyLogs],
      async () => {
        await Promise.all([
          db.words.clear(),
          db.cards.clear(),
          db.reviews.clear(),
          db.dailyLogs.clear(),
        ])
      },
    )
  }

  const now = Date.now()

  await db.transaction(
    'rw',
    [db.words, db.cards, db.dailyLogs, db.userStats, db.reviews],
    async () => {
      const wordIds: number[] = []
      const cardIds: number[] = []
      for (let i = 0; i < DEMO_ENTRIES.length; i++) {
        const entry = DEMO_ENTRIES[i]
        const word: Word = {
          ...entry.word,
          // Spread the "added" dates over the last two months so the deck
          // sorts into something that looks lived-in.
          addedAt: now - Math.round(Math.random() * 60) * DAY,
          // A realistic mix of provenance — the deck page shows a breakdown,
          // and an all-one-source deck would hide that row entirely. Nothing
          // is marked `seed`: that source triggers the legacy-cleanup banner.
          source: i % 4 === 0 ? 'mistral' : i % 7 === 0 ? 'session' : 'user',
        }
        const wordId = (await db.words.add(word)) as number
        const s = entry.srs
        const card: SRSCard = {
          wordId,
          due: now + s.dueInDays * DAY,
          ease: s.ease,
          intervalDays: s.intervalDays,
          repetition: s.repetition,
          lapses: s.lapses,
          // Rough inverse of ease, so the weakest cards also read as hardest.
          difficultyScore: Math.min(1, Math.max(0, (3 - s.ease) / 1.7)),
        }
        if (s.lastSeenDaysAgo != null) {
          card.lastReviewed = now - s.lastSeenDaysAgo * DAY
        }
        const cardId = (await db.cards.add(card)) as number
        wordIds.push(wordId)
        cardIds.push(cardId)
      }

      const today = new Date()
      for (let i = 0; i < DEMO_ACTIVITY.length; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const a = DEMO_ACTIVITY[i]
        await db.dailyLogs.put({
          date: isoDate(d),
          ...a,
          goalReached: a.xpEarned >= DEMO_GOAL_XP,
        })

        /* A review row per logged review, so retention, the history chart
           and the per-exercise analytics all have something real to read.
           Without these the dashboard shows "—" for retention, which is
           precisely the state we would fail to notice was broken. */
        const dayStart = now - i * DAY
        for (let n = 0; n < a.reviewsDone; n++) {
          const wrong = n < a.mistakes
          const quality: Quality = wrong ? (n % 2 === 0 ? 1 : 2) : n % 3 === 0 ? 5 : 4
          const idx = (i * 7 + n) % wordIds.length
          await db.reviews.add({
            cardId: cardIds[idx],
            wordId: wordIds[idx],
            // Spread across a plausible evening session.
            timestamp: dayStart - n * 45_000,
            quality,
            responseTimeMs: 2_500 + ((n * 911) % 6_000),
            exerciseType: DEMO_EXERCISES[(i + n) % DEMO_EXERCISES.length],
            wasCorrect: !wrong,
          } satisfies Review)
        }
      }

      const totalReviews = DEMO_ACTIVITY.reduce((sum, a) => sum + a.reviewsDone, 0)
      const totalXp = DEMO_ACTIVITY.reduce((sum, a) => sum + a.xpEarned, 0)
      const stats = await db.userStats.get(1)
      if (stats) {
        await db.userStats.put({
          ...stats,
          displayName: 'Teekky',
          cefrLevel: 'C1',
          xp: totalXp + 640, // pre-existing history before the visible fortnight
          currentStreak: 3, // matches the three active days at the head of the log
          longestStreak: 11,
          totalReviews: totalReviews + 380,
          dailyGoalXp: DEMO_GOAL_XP,
          streakShields: 2,
        })
      }
    },
  )

  try {
    localStorage.setItem(FIXTURE_KEY, String(FIXTURE_VERSION))
  } catch {
    /* Without storage the fixture is rebuilt on every load — noisy but
       harmless, and only ever in staging. */
  }
}
