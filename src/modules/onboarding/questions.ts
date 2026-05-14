/**
 * CEFR placement test — question bank + pickers.
 *
 * The bank is wider than a single test (~55 items across A2..C2) and uses
 * four exercise types so the test can sample more dimensions of skill than
 * passive recognition:
 *
 *   - 'multiple-choice' — pick the right option (vocab, grammar, register).
 *   - 'fill-blank'      — type the missing word in a sentence (active recall).
 *   - 'spot-error'      — find the sentence with the subtle error (analysis).
 *   - 'idiom'           — choose the meaning of an English idiom (cultural fluency).
 *
 * Each draw pulls 20 items, weighted toward C1/C2 for advanced learners. The
 * curve and per-level shuffling make sure no two retakes feel the same. The
 * scoring still weights harder questions more heavily, regardless of type.
 */

import type { Level } from '@/types'

export type OnboardingQuestionType =
  | 'multiple-choice'
  | 'fill-blank'
  | 'spot-error'
  | 'idiom'

interface BaseQuestion {
  id: string
  level: Level
  /** One-line explanation shown after submit. */
  explanation: string
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice'
  prompt: string
  options: string[]
  /** Index of the correct option in `options`. */
  answer: number
}

/** Type a single English word into the blank. Accepts a small alias list. */
export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill-blank'
  /** The full sentence with `___` standing in for the answer. */
  prompt: string
  /** Canonical answer (used as the displayed correction). */
  answer: string
  /** Other accepted spellings / forms (case-insensitive). */
  acceptedAnswers?: string[]
}

/** Pick the sentence that contains a subtle error. */
export interface SpotErrorQuestion extends BaseQuestion {
  type: 'spot-error'
  /** Question stem above the options. */
  prompt: string
  options: string[]
  /** Index of the option containing the error. */
  answer: number
}

/** Pick the meaning of an idiom. */
export interface IdiomQuestion extends BaseQuestion {
  type: 'idiom'
  /** The idiom itself, e.g. "to bite the bullet". */
  idiom: string
  options: string[]
  answer: number
}

export type OnboardingQuestion =
  | MultipleChoiceQuestion
  | FillBlankQuestion
  | SpotErrorQuestion
  | IdiomQuestion

/* -------------------------------------------------------------------- */
/*  Raw bank                                                            */
/* -------------------------------------------------------------------- */

const BANK: OnboardingQuestion[] = [
  // --- A2 --------------------------------------------------------------
  {
    id: 'a2-mc-1',
    level: 'A2',
    type: 'multiple-choice',
    prompt: 'Choose the sentence that is grammatically correct.',
    options: [
      "She don't like coffee in the morning.",
      "She doesn't likes coffee in the morning.",
      "She doesn't like coffee in the morning.",
      'She not like coffee in the morning.',
    ],
    answer: 2,
    explanation: '"Doesn\'t" already carries the -s, so the verb stays in its base form.',
  },
  {
    id: 'a2-mc-2',
    level: 'A2',
    type: 'multiple-choice',
    prompt: 'Pick the correct plural form: "I have two ___ on my desk."',
    options: ['mouses', 'mice', 'mouse', 'mices'],
    answer: 1,
    explanation: 'The plural of "mouse" (the animal or device) is irregular: "mice".',
  },
  {
    id: 'a2-mc-3',
    level: 'A2',
    type: 'multiple-choice',
    prompt: 'Choose the correct preposition: "We usually meet ___ Monday."',
    options: ['at', 'in', 'on', 'to'],
    answer: 2,
    explanation: 'Use "on" with days of the week. "At" is for times, "in" for months.',
  },
  {
    id: 'a2-mc-4',
    level: 'A2',
    type: 'multiple-choice',
    prompt: 'Which sentence uses "there is / there are" correctly?',
    options: [
      'There is three chairs in the room.',
      'There are three chairs in the room.',
      'It has three chairs in the room.',
      'There have three chairs in the room.',
    ],
    answer: 1,
    explanation: 'Plural subject ("three chairs") takes "there are".',
  },
  {
    id: 'a2-mc-5',
    level: 'A2',
    type: 'multiple-choice',
    prompt: 'Pick the right form: "My sister is ___ than me."',
    options: ['more tall', 'taller', 'tallest', 'most tall'],
    answer: 1,
    explanation: 'Short adjectives form the comparative with -er: "tall → taller".',
  },
  {
    id: 'a2-fb-1',
    level: 'A2',
    type: 'fill-blank',
    prompt: 'I usually ___ to school by bus.',
    answer: 'go',
    explanation: 'Habitual present action with "I" → "go".',
  },

  // --- B1 --------------------------------------------------------------
  {
    id: 'b1-mc-1',
    level: 'B1',
    type: 'multiple-choice',
    prompt: 'Pick the correct past form: "Yesterday I ___ to the client demo."',
    options: ['go', 'went', 'gone', 'going'],
    answer: 1,
    explanation: 'Simple past of "go" is "went". "Gone" is the past participle.',
  },
  {
    id: 'b1-mc-2',
    level: 'B1',
    type: 'multiple-choice',
    prompt:
      'Which word best completes the sentence? "The meeting was postponed ___ the CEO was sick."',
    options: ['although', 'because', 'despite', 'unless'],
    answer: 1,
    explanation: '"Because" introduces a cause. "Although" and "despite" introduce contrast.',
  },
  {
    id: 'b1-mc-3',
    level: 'B1',
    type: 'multiple-choice',
    prompt: 'Choose the correct present-perfect sentence.',
    options: [
      'I have seen him yesterday.',
      'I have seen him last week.',
      'I have seen him twice this month.',
      'I did see him twice this month.',
    ],
    answer: 2,
    explanation: 'Present perfect pairs with unfinished time frames ("this month"), not "yesterday".',
  },
  {
    id: 'b1-mc-4',
    level: 'B1',
    type: 'multiple-choice',
    prompt: 'Which word fits best? "She ___ to Tokyo three times."',
    options: ['has been', 'has gone', 'is', 'was'],
    answer: 0,
    explanation: '"Has been" = has visited and returned. "Has gone" = went and is still there.',
  },
  {
    id: 'b1-mc-5',
    level: 'B1',
    type: 'multiple-choice',
    prompt: 'Pick the correct conditional: "If it ___ tomorrow, we\'ll stay in."',
    options: ['will rain', 'rains', 'rained', 'would rain'],
    answer: 1,
    explanation: 'First conditional: "if + present", "will + base verb" in the main clause.',
  },
  {
    id: 'b1-mc-6',
    level: 'B1',
    type: 'multiple-choice',
    prompt: 'Which is the most natural? "I\'m really looking forward ___ you."',
    options: ['to see', 'seeing', 'to seeing', 'for see'],
    answer: 2,
    explanation: '"Look forward to" is followed by a gerund: "to seeing".',
  },
  {
    id: 'b1-fb-1',
    level: 'B1',
    type: 'fill-blank',
    prompt: 'I have lived here ___ 2019.',
    answer: 'since',
    explanation: '"Since" with a starting point in time; "for" with a duration.',
  },
  {
    id: 'b1-fb-2',
    level: 'B1',
    type: 'fill-blank',
    prompt: 'She is taller ___ her brother.',
    answer: 'than',
    explanation: 'Comparatives are followed by "than".',
  },
  {
    id: 'b1-se-1',
    level: 'B1',
    type: 'spot-error',
    prompt: 'Which sentence contains an error?',
    options: [
      'She lives in Paris.',
      'They are come to dinner tonight.',
      'I went to the gym yesterday.',
      'We have known each other for years.',
    ],
    answer: 1,
    explanation: 'Should be "They are coming" (present continuous) or "They come" — not "are come".',
  },

  // --- B2 --------------------------------------------------------------
  {
    id: 'b2-mc-1',
    level: 'B2',
    type: 'multiple-choice',
    prompt: 'Which sentence uses the phrasal verb correctly?',
    options: [
      'We need to bring up the deadline by two weeks.',
      'We need to move up the deadline by two weeks.',
      'We need to lift up the deadline by two weeks.',
      'We need to pull up the deadline by two weeks.',
    ],
    answer: 1,
    explanation: 'To "move up a deadline" = to make it earlier. "Bring up" = mention.',
  },
  {
    id: 'b2-mc-2',
    level: 'B2',
    type: 'multiple-choice',
    prompt: 'Choose the best synonym for "to iterate" in a product context.',
    options: [
      'to argue repeatedly',
      'to refine step by step',
      'to abandon and restart',
      'to document formally',
    ],
    answer: 1,
    explanation: 'In product work, "iterate" means to improve in small, repeated passes.',
  },
  {
    id: 'b2-mc-3',
    level: 'B2',
    type: 'multiple-choice',
    prompt: 'Which sentence uses reported speech correctly?',
    options: [
      'She said me she was tired.',
      'She told that she was tired.',
      'She told me she was tired.',
      'She said me that she is tired.',
    ],
    answer: 2,
    explanation: '"Tell" takes an indirect object ("me"); "say" does not.',
  },
  {
    id: 'b2-mc-4',
    level: 'B2',
    type: 'multiple-choice',
    prompt: 'Pick the correct form: "By the time we arrived, the film ___."',
    options: ['started', 'has started', 'had started', 'was starting'],
    answer: 2,
    explanation: 'Past perfect ("had started") marks an action completed before another past action.',
  },
  {
    id: 'b2-mc-5',
    level: 'B2',
    type: 'multiple-choice',
    prompt: 'Which word best completes the sentence? "The feedback was ___, not harsh."',
    options: ['constructive', 'fabricated', 'constrictive', 'constrained'],
    answer: 0,
    explanation: '"Constructive" = helpful and building-up. The others are unrelated.',
  },
  {
    id: 'b2-mc-6',
    level: 'B2',
    type: 'multiple-choice',
    prompt: 'Choose the most idiomatic option: "Let\'s ___ the meeting until Friday."',
    options: ['push it', 'push back', 'push in', 'push at'],
    answer: 1,
    explanation: 'To "push back a meeting" = to delay it. The other phrasal verbs mean different things.',
  },
  {
    id: 'b2-fb-1',
    level: 'B2',
    type: 'fill-blank',
    prompt: 'If I ___ you, I would take the job offer.',
    answer: 'were',
    acceptedAnswers: ['was'],
    explanation: 'Second conditional uses "were" for all subjects in careful English ("was" is informal).',
  },
  {
    id: 'b2-fb-2',
    level: 'B2',
    type: 'fill-blank',
    prompt: 'The report needs to be ___ by Friday.',
    answer: 'submitted',
    acceptedAnswers: ['delivered', 'finished', 'completed'],
    explanation: 'A passive verb that fits a deadline context — "submitted" is the most natural.',
  },
  {
    id: 'b2-se-1',
    level: 'B2',
    type: 'spot-error',
    prompt: 'Which sentence contains a subtle error?',
    options: [
      'I look forward to hearing from you.',
      'She suggested to go for a walk after lunch.',
      "We've been working on this for hours.",
      'He explained the problem to the team.',
    ],
    answer: 1,
    explanation: '"Suggest" takes a gerund: "suggested going". "Suggest to do" is a common B2 mistake.',
  },
  {
    id: 'b2-id-1',
    level: 'B2',
    type: 'idiom',
    idiom: 'to call it a day',
    options: [
      'to schedule a meeting',
      'to stop working for now',
      'to celebrate a success',
      'to make a quick decision',
    ],
    answer: 1,
    explanation: '"Call it a day" = decide to stop the current activity, usually at the end of work.',
  },

  // --- C1 --------------------------------------------------------------
  {
    id: 'c1-mc-1',
    level: 'C1',
    type: 'multiple-choice',
    prompt:
      'Pick the most natural rewrite: "I think the project will probably be late."',
    options: [
      'The project will arguably come late.',
      'The project is likely to slip.',
      'The project will definitely be delayed.',
      'The project might be absolutely late.',
    ],
    answer: 1,
    explanation: '"Likely to slip" is the idiomatic, professional phrasing native speakers use.',
  },
  {
    id: 'c1-mc-2',
    level: 'C1',
    type: 'multiple-choice',
    prompt: 'Which word best fits? "The stakeholders were ___ about the new roadmap."',
    options: ['lukewarm', 'dry', 'chill', 'flat'],
    answer: 0,
    explanation: '"Lukewarm" = mildly enthusiastic at best — a classic business idiom.',
  },
  {
    id: 'c1-mc-3',
    level: 'C1',
    type: 'multiple-choice',
    prompt: 'Pick the sentence that uses "subtle" most accurately.',
    options: [
      'The poison was subtle and he died quickly.',
      'She gave him a subtle hint that she wanted to leave.',
      'The music was so subtle everyone danced.',
      'He shouted in a subtle voice across the room.',
    ],
    answer: 1,
    explanation: '"Subtle" = delicate, barely noticeable. Incompatible with loud/quick/obvious.',
  },
  {
    id: 'c1-mc-4',
    level: 'C1',
    type: 'multiple-choice',
    prompt: 'Which rewrite preserves the meaning of "We hit a wall."?',
    options: [
      'We made rapid progress.',
      'We reached an impasse.',
      'We broke through the problem.',
      'We damaged the wall.',
    ],
    answer: 1,
    explanation: '"Hit a wall" (idiom) = get stuck; "impasse" is the formal synonym.',
  },
  {
    id: 'c1-mc-5',
    level: 'C1',
    type: 'multiple-choice',
    prompt: 'Choose the best collocation: "a ___ argument"',
    options: ['heavy', 'robust', 'thick', 'deep-seated'],
    answer: 1,
    explanation: 'Native speakers say "a robust argument". "Heavy" and "thick" collocate differently.',
  },
  {
    id: 'c1-mc-6',
    level: 'C1',
    type: 'multiple-choice',
    prompt:
      'Pick the correct inversion: "Not only ___ the deadline, but she also exceeded the brief."',
    options: ['she met', 'met she', 'did she meet', 'she did meet'],
    answer: 2,
    explanation: 'After a fronted negative ("Not only"), the subject and auxiliary invert.',
  },
  {
    id: 'c1-fb-1',
    level: 'C1',
    type: 'fill-blank',
    prompt: 'Despite the setback, the team managed to ___ on schedule.',
    answer: 'deliver',
    acceptedAnswers: ['ship', 'finish'],
    explanation: 'Professional context — "deliver" is the standard verb for keeping a deadline.',
  },
  {
    id: 'c1-fb-2',
    level: 'C1',
    type: 'fill-blank',
    prompt: "Her argument was compelling, ___ a little long-winded.",
    answer: 'if',
    explanation: '"If a little X" is a polished way to add a mild concession.',
  },
  {
    id: 'c1-se-1',
    level: 'C1',
    type: 'spot-error',
    prompt: 'Which sentence has a subtle issue a native speaker would flag?',
    options: [
      'She has a flair for storytelling.',
      'I would have liked to have known sooner.',
      'They double down on what works.',
      'He raised an eyebrow at the suggestion.',
    ],
    answer: 1,
    explanation: 'Doubled-up perfect ("would have liked to have known"). Natural form: "would have liked to know".',
  },
  {
    id: 'c1-se-2',
    level: 'C1',
    type: 'spot-error',
    prompt: 'Which sentence uses register inconsistently?',
    options: [
      "I'd be grateful if you could send the file by EOD.",
      'Yo, please send the deliverable at your earliest convenience.',
      'Could you share the deck whenever you have a moment?',
      'Please find the attached document for your review.',
    ],
    answer: 1,
    explanation: '"Yo" is casual, "at your earliest convenience" is formal — they clash.',
  },
  {
    id: 'c1-id-1',
    level: 'C1',
    type: 'idiom',
    idiom: 'to bite the bullet',
    options: [
      'to interrupt someone abruptly',
      'to do something painful you have been avoiding',
      'to make a quick, careless decision',
      'to argue forcefully',
    ],
    answer: 1,
    explanation: '"Bite the bullet" = accept and do something unpleasant you can no longer avoid.',
  },
  {
    id: 'c1-id-2',
    level: 'C1',
    type: 'idiom',
    idiom: 'to move the needle',
    options: [
      'to change a minor detail',
      'to have a measurable impact',
      'to point at the truth bluntly',
      'to start a difficult conversation',
    ],
    answer: 1,
    explanation: 'Business idiom: an action that "moves the needle" produces real, measurable change.',
  },

  // --- C2 --------------------------------------------------------------
  {
    id: 'c2-mc-1',
    level: 'C2',
    type: 'multiple-choice',
    prompt: 'Identify the sentence with a subtle error native speakers would notice.',
    options: [
      'Her argument was compelling, if a little long-winded.',
      "The CEO's comment was very unique and thought-provoking.",
      'We should double down on onboarding before Q3.',
      'He has a knack for reading the room.',
    ],
    answer: 1,
    explanation: '"Unique" is an absolute — "very unique" is frowned upon in careful English.',
  },
  {
    id: 'c2-mc-2',
    level: 'C2',
    type: 'multiple-choice',
    prompt: 'Which sentence uses "begs the question" in its strict, traditional sense?',
    options: [
      'His promotion begs the question of why Sarah was passed over.',
      'Her argument begs the question by assuming what it tries to prove.',
      'The empty office begs the question of where everyone went.',
      'That hire begs the question: is remote work dying?',
    ],
    answer: 1,
    explanation:
      '"Begs the question" originally means circular reasoning. The others use the modern loose sense.',
  },
  {
    id: 'c2-mc-3',
    level: 'C2',
    type: 'multiple-choice',
    prompt: 'Pick the sentence that uses the subjunctive correctly.',
    options: [
      'I suggest that he is more careful next time.',
      'I suggest that he be more careful next time.',
      'I suggest that he was more careful next time.',
      'I suggest that he would be more careful next time.',
    ],
    answer: 1,
    explanation: 'After "suggest that", careful English uses the bare subjunctive: "he be".',
  },
  {
    id: 'c2-mc-4',
    level: 'C2',
    type: 'multiple-choice',
    prompt: 'Choose the most precise word: "Her manner was ___ — polite yet distant."',
    options: ['aloof', 'frigid', 'sullen', 'brash'],
    answer: 0,
    explanation:
      '"Aloof" = reserved and detached. "Frigid" is colder, "sullen" resentful, "brash" loud.',
  },
  {
    id: 'c2-mc-5',
    level: 'C2',
    type: 'multiple-choice',
    prompt: 'Pick the sentence that is stylistically tightest.',
    options: [
      'Due to the fact that we were late, we missed the start.',
      'Because we were late, we missed the start.',
      'Owing to the circumstance of our lateness, we missed the start.',
      'As a result of us being late, we missed the start.',
    ],
    answer: 1,
    explanation: '"Because" is direct. The others are wordier paraphrases.',
  },
  {
    id: 'c2-fb-1',
    level: 'C2',
    type: 'fill-blank',
    prompt: 'Her resignation came as no ___ — the warning signs had been there for months.',
    answer: 'surprise',
    explanation: '"Came as no surprise" is the natural collocation.',
  },
  {
    id: 'c2-fb-2',
    level: 'C2',
    type: 'fill-blank',
    prompt: 'The decision was, in ___, an admission that the strategy had failed.',
    answer: 'effect',
    explanation: '"In effect" = essentially / in practice. A tight, near-native marker.',
  },
  {
    id: 'c2-se-1',
    level: 'C2',
    type: 'spot-error',
    prompt: 'Which sentence has a stylistic flaw a careful editor would fix?',
    options: [
      'She is a writer whose prose has won several awards.',
      'The team comprised of engineers, designers, and a single PM.',
      'He spoke with the quiet authority of someone who had nothing to prove.',
      'The findings were as surprising as they were inconvenient.',
    ],
    answer: 1,
    explanation: '"Comprised of" is widely flagged. Use "comprised" or "composed of" — not the hybrid.',
  },
  {
    id: 'c2-se-2',
    level: 'C2',
    type: 'spot-error',
    prompt: 'Spot the redundancy.',
    options: [
      'She returned the book to the library.',
      'They reverted back to the original plan.',
      'He refused to elaborate further.',
      'The deadline was non-negotiable.',
    ],
    answer: 1,
    explanation: '"Revert" already means "go back". "Revert back" is a common redundancy.',
  },
  {
    id: 'c2-id-1',
    level: 'C2',
    type: 'idiom',
    idiom: 'to let the cat out of the bag',
    options: [
      'to release someone from a burden',
      'to reveal a secret accidentally',
      'to start a chaotic argument',
      'to give up on a difficult task',
    ],
    answer: 1,
    explanation: 'The canonical idiom for spilling a secret without meaning to.',
  },
  {
    id: 'c2-id-2',
    level: 'C2',
    type: 'idiom',
    idiom: 'to throw someone under the bus',
    options: [
      'to recommend someone for a promotion',
      'to force someone into a difficult role',
      'to blame someone publicly to protect yourself',
      'to give someone unwanted advice',
    ],
    answer: 2,
    explanation: 'Workplace idiom: shifting blame onto someone else to save your own skin.',
  },
  {
    id: 'c2-id-3',
    level: 'C2',
    type: 'idiom',
    idiom: 'to play devil\'s advocate',
    options: [
      'to argue an opposing view to test an idea',
      'to support someone in a courtroom',
      'to take a controversial public stance',
      'to provoke a fight on purpose',
    ],
    answer: 0,
    explanation: 'Means: take the opposite side of an argument for the sake of debate.',
  },

  /* ----- A2 (6 more) ----- */
  {
    id: 'a2-mc-6',
    level: 'A2',
    type: 'multiple-choice',
    prompt: 'Choose the correct sentence.',
    options: ['He don\'t have a car.', "He doesn't have a car.", 'He hasn\'t a car.', 'He no have a car.'],
    answer: 1,
    explanation: 'Negative present simple, third person → "doesn\'t have".',
  },
  {
    id: 'a2-mc-7',
    level: 'A2',
    type: 'multiple-choice',
    prompt: 'Pick the right answer: "Where ___ you live?"',
    options: ['do', 'are', 'does', 'is'],
    answer: 0,
    explanation: 'Question with "you" in present simple → auxiliary "do".',
  },
  {
    id: 'a2-fb-2',
    level: 'A2',
    type: 'fill-blank',
    prompt: 'There ___ five people in the room.',
    answer: 'are',
    explanation: 'Plural subject "five people" → "are".',
  },
  {
    id: 'a2-fb-3',
    level: 'A2',
    type: 'fill-blank',
    prompt: 'I am hungry. I want ___ eat.',
    answer: 'to',
    explanation: '"Want + to + base verb".',
  },
  {
    id: 'a2-mc-8',
    level: 'A2',
    type: 'multiple-choice',
    prompt: 'Choose the correct possessive: "This is ___ book."',
    options: ['me', 'my', 'I', 'mine'],
    answer: 1,
    explanation: '"My" before a noun. "Mine" replaces the noun.',
  },
  {
    id: 'a2-se-1',
    level: 'A2',
    type: 'spot-error',
    prompt: 'Which sentence has an error?',
    options: ['She lives in London.', 'They are happy.', 'I likes pizza.', 'We have a dog.'],
    answer: 2,
    explanation: 'First person → "I LIKE pizza" (no -s).',
  },

  /* ----- B1 (6 more) ----- */
  {
    id: 'b1-mc-7',
    level: 'B1',
    type: 'multiple-choice',
    prompt: 'Pick the right form: "She ___ in this office for two years."',
    options: ['works', 'has worked', 'is working', 'worked'],
    answer: 1,
    explanation: '"For two years" up to now → present perfect "has worked".',
  },
  {
    id: 'b1-mc-8',
    level: 'B1',
    type: 'multiple-choice',
    prompt: 'Choose the natural sentence.',
    options: ['I\'m good in math.', 'I\'m good at math.', 'I\'m good for math.', 'I\'m good with math.'],
    answer: 1,
    explanation: '"Good AT" + skill. "Good with" is for people/things you handle well.',
  },
  {
    id: 'b1-fb-3',
    level: 'B1',
    type: 'fill-blank',
    prompt: "I'm interested ___ learning Italian.",
    answer: 'in',
    explanation: '"Interested in + gerund" — fixed preposition.',
  },
  {
    id: 'b1-se-2',
    level: 'B1',
    type: 'spot-error',
    prompt: 'Which sentence is wrong?',
    options: ["I've been there last year.", "I went there last year.", "I've been there many times.", "I haven't been there yet."],
    answer: 0,
    explanation: '"Last year" is finished → past simple. "I went there last year".',
  },
  {
    id: 'b1-mc-9',
    level: 'B1',
    type: 'multiple-choice',
    prompt: '"___ you like some coffee?"',
    options: ['Do', 'Would', 'Are', 'Will'],
    answer: 1,
    explanation: '"Would you like" is the polite offer pattern.',
  },
  {
    id: 'b1-fb-4',
    level: 'B1',
    type: 'fill-blank',
    prompt: 'If it rains, we ___ stay home.',
    answer: 'will',
    acceptedAnswers: ["'ll"],
    explanation: 'First conditional: "if + present, will + base".',
  },

  /* ----- B2 (5 more) ----- */
  {
    id: 'b2-fb-3',
    level: 'B2',
    type: 'fill-blank',
    prompt: 'I wish I ___ (be) better at remembering names.',
    answer: 'were',
    acceptedAnswers: ['was'],
    explanation: 'After "wish" (present) → past simple. "Were" preferred for all subjects in careful English.',
  },
  {
    id: 'b2-mc-7',
    level: 'B2',
    type: 'multiple-choice',
    prompt: 'Pick the natural sentence.',
    options: ["She's used to wake up early.", "She's used to waking up early.", "She used to waking up early.", "She's using to wake up early."],
    answer: 1,
    explanation: '"Be used to + GERUND" — habituated to.',
  },
  {
    id: 'b2-se-2',
    level: 'B2',
    type: 'spot-error',
    prompt: 'Which sentence has a subtle error?',
    options: ['Despite being tired, she finished.', 'Although she was tired, she finished.', 'Despite she was tired, she finished.', 'In spite of her tiredness, she finished.'],
    answer: 2,
    explanation: '"Despite" + clause is wrong. Use "Although" + clause OR "Despite" + gerund/noun.',
  },
  {
    id: 'b2-id-2',
    level: 'B2',
    type: 'idiom',
    idiom: 'to break the ice',
    options: [
      'to argue strongly',
      'to start a friendly conversation',
      'to ruin a meeting',
      'to delay a decision',
    ],
    answer: 1,
    explanation: '"Break the ice" = ease initial tension by starting conversation.',
  },
  {
    id: 'b2-mc-8',
    level: 'B2',
    type: 'multiple-choice',
    prompt: 'Choose the correct sentence.',
    options: ['I had my hair cut yesterday.', 'I had cut my hair yesterday.', 'I cut my hair myself yesterday.', 'I had to cut hair yesterday.'],
    answer: 0,
    explanation: 'Causative "have something done": "I had my hair cut" = someone cut it for me.',
  },

  /* ----- C1 (8 more) ----- */
  {
    id: 'c1-mc-7',
    level: 'C1',
    type: 'multiple-choice',
    prompt: 'Pick the most idiomatic phrasing.',
    options: ['Let\'s touch base on this tomorrow.', 'Let\'s touch a base on this tomorrow.', 'Let\'s be touching base on this tomorrow.', 'Let\'s touched base on this tomorrow.'],
    answer: 0,
    explanation: '"Touch base" = quickly check in. Fixed business idiom.',
  },
  {
    id: 'c1-mc-8',
    level: 'C1',
    type: 'multiple-choice',
    prompt: 'Choose the most natural rewrite of "I think this is the best option."',
    options: ['This is arguably the best option.', 'This is more best option.', 'This is the most best option.', 'This is the best option arguably.'],
    answer: 0,
    explanation: '"Arguably" is the polished hedge native speakers use.',
  },
  {
    id: 'c1-fb-3',
    level: 'C1',
    type: 'fill-blank',
    prompt: 'I\'d rather you ___ (not / mention) this in the meeting.',
    answer: "didn't mention",
    acceptedAnswers: ['did not mention'],
    explanation: '"Would rather + person + past tense (negative)".',
  },
  {
    id: 'c1-se-3',
    level: 'C1',
    type: 'spot-error',
    prompt: 'Which sentence has a subtle issue?',
    options: ['She has a flair for storytelling.', 'I would have liked to have known sooner.', 'They double down on what works.', 'He raised an eyebrow at the suggestion.'],
    answer: 1,
    explanation: 'Doubled-up perfect. Natural form: "I would have liked to know sooner".',
  },
  {
    id: 'c1-id-3',
    level: 'C1',
    type: 'idiom',
    idiom: 'to throw someone under the bus',
    options: [
      'to recommend someone for a promotion',
      'to force someone into a difficult role',
      'to blame someone publicly to protect yourself',
      'to give someone unwanted advice',
    ],
    answer: 2,
    explanation: 'Workplace idiom: shifting blame to save yourself.',
  },
  {
    id: 'c1-mc-9',
    level: 'C1',
    type: 'multiple-choice',
    prompt: 'Pick the correct sentence with subjunctive.',
    options: ['It is essential that he is on time.', 'It is essential that he be on time.', 'It is essential that he was on time.', 'It is essential that he would be on time.'],
    answer: 1,
    explanation: 'After "essential that" → bare subjunctive "be".',
  },
  {
    id: 'c1-fb-4',
    level: 'C1',
    type: 'fill-blank',
    prompt: 'Rarely ___ I seen such clean code.',
    answer: 'have',
    explanation: 'Inversion after fronted "Rarely" → "have I seen".',
  },
  {
    id: 'c1-id-4',
    level: 'C1',
    type: 'idiom',
    idiom: 'to read between the lines',
    options: [
      'to read very carefully word by word',
      'to understand a hidden or implied meaning',
      'to skim through a document',
      'to find errors in a text',
    ],
    answer: 1,
    explanation: '"Read between the lines" = grasp what isn\'t explicitly said.',
  },

  /* ----- C2 (5 more) ----- */
  {
    id: 'c2-mc-6',
    level: 'C2',
    type: 'multiple-choice',
    prompt: 'Identify the most stylistically polished version.',
    options: ['Although the proposal had its merits, it was ultimately rejected.', 'Although the proposal had its merits, but it was ultimately rejected.', 'Despite the proposal had its merits, it was ultimately rejected.', 'However the proposal had merits, it was rejected.'],
    answer: 0,
    explanation: 'Clean concession with "although". "Although + but" is redundant.',
  },
  {
    id: 'c2-se-3',
    level: 'C2',
    type: 'spot-error',
    prompt: 'Spot the subtle error.',
    options: ['The data suggests a clear pattern.', 'The criteria is met.', 'The findings are surprising.', 'The phenomenon is rare.'],
    answer: 1,
    explanation: '"Criteria" is plural ("criterion" is singular). "The criteria ARE met".',
  },
  {
    id: 'c2-id-4',
    level: 'C2',
    type: 'idiom',
    idiom: 'to take with a pinch of salt',
    options: [
      'to add humour to a story',
      'to treat with mild scepticism',
      'to accept fully and quickly',
      'to remember for later use',
    ],
    answer: 1,
    explanation: 'British idiom (also "grain of salt") = doubt slightly, don\'t take literally.',
  },
  {
    id: 'c2-mc-7',
    level: 'C2',
    type: 'multiple-choice',
    prompt: 'Choose the most precise word: "Her writing has a ___ wit."',
    options: ['fast', 'sharp', 'pointy', 'severe'],
    answer: 1,
    explanation: '"Sharp wit" is the natural collocation.',
  },
  {
    id: 'c2-fb-3',
    level: 'C2',
    type: 'fill-blank',
    prompt: "Were it ___ to me, I'd take the offer.",
    answer: 'up',
    explanation: '"Were it up to me" = "if it depended on me" — formal inversion.',
  },
  { id: 'a2-mc-9', level: 'A2', type: 'multiple-choice', prompt: 'Pick the right answer: "How ___ are you?"', options: ['old', 'years', 'age', 'aged'], answer: 0, explanation: 'Standard question pattern: "How old are you?"' },
  { id: 'a2-fb-4', level: 'A2', type: 'fill-blank', prompt: 'My sister is ___ doctor.', answer: 'a', explanation: 'Profession after "is" → "a" (singular countable, first mention).' },
  { id: 'a2-mc-10', level: 'A2', type: 'multiple-choice', prompt: 'Pick the right answer: "There ___ a problem."', options: ['is', 'are', 'have', 'has'], answer: 0, explanation: 'Singular subject "a problem" → "is".' },
  { id: 'b1-mc-10', level: 'B1', type: 'multiple-choice', prompt: 'Choose the natural sentence.', options: ['I look forward to hear from you.', 'I look forward to hearing from you.', 'I look forward hear from you.', 'I look forward to hears from you.'], answer: 1, explanation: '"Look forward TO + gerund". Fixed pattern.' },
  { id: 'b1-fb-5', level: 'B1', type: 'fill-blank', prompt: 'I am tired ___ working late.', answer: 'of', explanation: '"Tired of + gerund" — fixed preposition.' },
  { id: 'b1-se-3', level: 'B1', type: 'spot-error', prompt: 'Which sentence is wrong?', options: ['She enjoys reading novels.', 'She enjoys to read novels.', "She likes to read novels.", "She loves reading novels."], answer: 1, explanation: '"Enjoy" + gerund. Use "She enjoys reading novels".' },
  { id: 'b2-fb-4', level: 'B2', type: 'fill-blank', prompt: 'I should ___ called you yesterday.', answer: 'have', explanation: '"Should have + past participle" for past regret.' },
  { id: 'b2-mc-9', level: 'B2', type: 'multiple-choice', prompt: 'Pick the natural sentence.', options: ['By the time you arrive, the meeting will start.', 'By the time you arrive, the meeting will have started.', 'By the time you arrive, the meeting starts.', 'By the time you arrive, the meeting will be started.'], answer: 1, explanation: '"By the time + clause" → future perfect "will have started".' },
  { id: 'c1-mc-10', level: 'C1', type: 'multiple-choice', prompt: 'Pick the most native phrasing.', options: ['I have got the bandwidth to take this on.', 'I have the bandwidth to take this on.', 'Both work — 1 is more British/colloquial, 2 is more universal.', 'I have got bandwidth taking this on.'], answer: 2, explanation: 'Both work; "I have" is more universal in business contexts.' },
  { id: 'c1-fb-5', level: 'C1', type: 'fill-blank', prompt: "Hardly ___ I sat down when the phone rang.", answer: 'had', explanation: 'Inversion after fronted "Hardly" + past perfect → "had I sat".' },
  { id: 'c1-id-5', level: 'C1', type: 'idiom', idiom: 'to cut corners', options: ['to take the fastest route', 'to do something cheaply or carelessly', 'to make sharp turns', 'to stop a project early'], answer: 1, explanation: '"Cut corners" = skip steps to save time/money, often at quality\'s expense.' },
  { id: 'c2-id-5', level: 'C2', type: 'idiom', idiom: 'to bury the lede', options: ['to start a story slowly', 'to forget the most important point', 'to put the most important info too late in your message', 'to refuse to speak'], answer: 2, explanation: 'Journalism idiom now common in business: hiding the key point under context.' },
]

/* -------------------------------------------------------------------- */
/*  Picking + shuffling                                                 */
/* -------------------------------------------------------------------- */

/** Pick n items at random from an array without replacement. */
function sample<T>(arr: T[], n: number): T[] {
  const pool = arr.slice()
  const out: T[] = []
  const take = Math.min(n, pool.length)
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

/** Fisher-Yates in place. */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Randomize the order of options for question types that have them, and
 * update `answer` to the new index of the correct option. Fill-blank
 * questions have no options so they pass through untouched.
 */
function shuffleOptions(q: OnboardingQuestion): OnboardingQuestion {
  if (q.type === 'fill-blank') return q
  const pairs = q.options.map((opt, i) => ({ opt, correct: i === q.answer }))
  shuffleInPlace(pairs)
  return {
    ...q,
    options: pairs.map((p) => p.opt),
    answer: pairs.findIndex((p) => p.correct),
  }
}

/**
 * Target difficulty curve for each draw (total = 20). Tilted toward C1/C2
 * so advanced learners don't waste questions on grammar they mastered
 * years ago — the test still includes a few easier items so beginners get
 * an honest read.
 */
const CURVE: Record<Level, number> = {
  A1: 0,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 6,
  C2: 5,
}

/** Monotonic difficulty index — used to order the test ramp. */
const LEVEL_ORDER: Record<Level, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
}

/**
 * Build a fresh test. Balanced by level, items sampled fresh per-draw, and
 * **always served in rising difficulty** (A2 → C2). Within a single level
 * the picked items are in random order; the option positions of each
 * question are also shuffled, so a retaker can't memorise answer slots.
 *
 * The progressive ramp matters for UX: the learner starts with an easy win
 * and only hits harder items once they've warmed up, which avoids the
 * frustration of an immediate wrong answer on question 1.
 */
export function pickQuestions(): OnboardingQuestion[] {
  const byLevel: Record<Level, OnboardingQuestion[]> = {
    A1: [],
    A2: [],
    B1: [],
    B2: [],
    C1: [],
    C2: [],
  }
  for (const q of BANK) byLevel[q.level].push(q)

  const picked: OnboardingQuestion[] = []
  ;(Object.keys(CURVE) as Level[]).forEach((lv) => {
    const need = CURVE[lv]
    if (need > 0) picked.push(...sample(byLevel[lv], need))
  })

  return picked
    .map(shuffleOptions)
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
}

/* -------------------------------------------------------------------- */
/*  Scoring                                                             */
/* -------------------------------------------------------------------- */

/** Point weights by level — harder questions count more. */
const POINTS: Record<Level, number> = {
  A1: 1,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
}

/** Max score for the current curve — constant across draws. */
export function maxScore(): number {
  return (Object.keys(CURVE) as Level[]).reduce(
    (s, lv) => s + CURVE[lv] * POINTS[lv],
    0,
  )
}

/**
 * Score a learner's answer.
 *
 * Multiple-choice / spot-error / idiom: the answer is the index of the
 * option they tapped. A correct pick yields the level's full point value.
 *
 * Fill-blank: the answer is the typed string. Match against the canonical
 * answer + any acceptedAnswers, case-insensitively, ignoring surrounding
 * whitespace. Partial credit isn't worth the complexity at this stage.
 */
export function scoreAnswer(
  q: OnboardingQuestion,
  response: number | string,
): number {
  if (q.type === 'fill-blank') {
    if (typeof response !== 'string') return 0
    const candidate = response.trim().toLowerCase()
    if (!candidate) return 0
    const accepted = [q.answer, ...(q.acceptedAnswers ?? [])].map((a) =>
      a.trim().toLowerCase(),
    )
    return accepted.includes(candidate) ? POINTS[q.level] : 0
  }
  if (typeof response !== 'number') return 0
  return response === q.answer ? POINTS[q.level] : 0
}

/**
 * Map total score to a CEFR level.
 * Same percentile thresholds as before — they generalize across draws of
 * different sizes thanks to the percentage-of-max calculation.
 */
export function levelFromScore(total: number): Level {
  const max = maxScore()
  const pct = max === 0 ? 0 : total / max
  if (pct <= 0.3) return 'A2'
  if (pct <= 0.5) return 'B1'
  if (pct <= 0.7) return 'B2'
  if (pct <= 0.88) return 'C1'
  return 'C2'
}

/** How many questions each draw contains. */
export function questionCount(): number {
  return (Object.keys(CURVE) as Level[]).reduce((s, lv) => s + CURVE[lv], 0)
}
