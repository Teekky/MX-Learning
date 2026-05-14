import {
  AlignLeft,
  BookOpen,
  BookText,
  Briefcase,
  Clock,
  Headphones,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  PenLine,
  Sparkles,
  Timer,
  Volume2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ExerciseType } from '@/types'

export const LS_FAVORITES = 'mx:practice-favorites'

export interface ExerciseTile {
  type: ExerciseType
  slug: string
  title: string
  blurb: string
  Icon: LucideIcon
  ready: boolean
}

export const TILES: ExerciseTile[] = [
  {
    type: 'fill-in-blank',
    slug: 'fill-in-blank',
    title: 'Fill in the blank',
    blurb: 'Type the missing word in a real sentence.',
    Icon: PenLine,
    ready: true,
  },
  {
    type: 'random-words-context',
    slug: 'random-words',
    title: 'Words in context',
    blurb: 'A random word, used in a real sentence.',
    Icon: BookOpen,
    ready: true,
  },
  {
    type: 'time-attack',
    slug: 'time-attack',
    title: 'Time-Attack · 60 s',
    blurb: 'How many translations can you nail in a minute?',
    Icon: Timer,
    ready: true,
  },
  {
    type: 'writing-conversation',
    slug: 'writing',
    title: 'Writing chat',
    blurb: 'Free conversation with your AI tutor.',
    Icon: MessageSquare,
    ready: true,
  },
  {
    type: 'audio-conversation',
    slug: 'audio',
    title: 'Speaking chat',
    blurb: 'Talk out loud — get coached on the fly.',
    Icon: Mic,
    ready: true,
  },
  {
    type: 'image-description',
    slug: 'image',
    title: 'Describe an image',
    blurb: 'Paint the picture with words.',
    Icon: ImageIcon,
    ready: true,
  },
  {
    type: 'interview-simulator',
    slug: 'interview',
    title: 'Interview simulator',
    blurb: 'Pick a role, rehearse the real thing.',
    Icon: Briefcase,
    ready: true,
  },
  {
    type: 'learn-from-text',
    slug: 'import',
    title: 'Learn from anything',
    blurb: 'Paste a word or text — teach and drill in one go.',
    Icon: Sparkles,
    ready: true,
  },
  {
    type: 'listening-dictation',
    slug: 'listening',
    title: 'Listening dictation',
    blurb: 'Listen and type what you hear — train your ear.',
    Icon: Headphones,
    ready: true,
  },
  {
    type: 'pronunciation',
    slug: 'pronunciation',
    title: 'Pronunciation',
    blurb: 'Read aloud — your transcript scored against the target.',
    Icon: Volume2,
    ready: true,
  },
  {
    type: 'grammar',
    slug: 'grammar',
    title: 'Grammar',
    blurb: 'Articles, conditionals, inversions, clefts — 10 drills per topic.',
    Icon: BookText,
    ready: true,
  },
  {
    type: 'tenses',
    slug: 'tenses',
    title: 'Tenses',
    blurb: 'Past simple vs present perfect, will vs going to, and friends.',
    Icon: Clock,
    ready: true,
  },
  {
    type: 'conjugation',
    slug: 'conjugation',
    title: 'Conjugation',
    blurb: 'Irregular verbs: 5 forms, 10 sentences, zero guessing.',
    Icon: AlignLeft,
    ready: true,
  },
]
