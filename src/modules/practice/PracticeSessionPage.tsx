/**
 * Practice session dispatcher — picks the right session component
 * based on the `:mode` URL param.
 */

import { Link, useParams } from 'react-router-dom'
import { FillInBlankSession } from './FillInBlankSession'
import { TimeAttackSession } from './TimeAttackSession'
import { WordsInContextSession } from './WordsInContextSession'
import { WritingChatSession } from './WritingChatSession'
import { AudioChatSession } from './AudioChatSession'
import { ImageDescriptionSession } from './ImageDescriptionSession'
import { InterviewSimulatorSession } from './InterviewSimulatorSession'
import { ImportTextSession } from './ImportTextSession'
import { ConjugationSession } from './ConjugationSession'
import { GrammarSession } from './GrammarSession'
import { ListeningSession } from './ListeningSession'
import { PronunciationSession } from './PronunciationSession'
import { TensesSession } from './TensesSession'
import { WeakWordsSession } from './WeakWordsSession'

export function PracticeSessionPage() {
  const { mode } = useParams<{ mode: string }>()

  switch (mode) {
    case 'fill-in-blank':
      return <FillInBlankSession />
    case 'time-attack':
      return <TimeAttackSession />
    case 'random-words':
      return <WordsInContextSession />
    case 'writing':
      return <WritingChatSession />
    case 'audio':
      return <AudioChatSession />
    case 'image':
      return <ImageDescriptionSession />
    case 'interview':
      return <InterviewSimulatorSession />
    case 'import':
      return <ImportTextSession />
    case 'listening':
      return <ListeningSession />
    case 'pronunciation':
      return <PronunciationSession />
    case 'grammar':
      return <GrammarSession />
    case 'tenses':
      return <TensesSession />
    case 'conjugation':
      return <ConjugationSession />
    case 'weak-words':
      return <WeakWordsSession />
    default:
      return (
        <div className="mx-auto max-w-xl text-center">
          <h1 className="mb-2 font-display text-2xl font-semibold">
            Mode not available yet.
          </h1>
          <p className="mb-6 text-text-muted">
            This mode ships in a later sub-phase.
          </p>
          <Link to="/practice" className="btn-ghost inline-flex">
            ← Back to practice menu
          </Link>
        </div>
      )
  }
}
