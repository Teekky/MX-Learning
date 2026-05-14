/**
 * Tenses — when to use which English tense. Thin wrapper around the
 * shared TopicLessonSession engine, configured with the tenses dataset.
 */

import { TENSE_TOPICS } from '@/data/tenses'
import { TopicLessonSession } from './TopicLessonSession'

export function TensesSession() {
  return (
    <TopicLessonSession
      config={{
        title: 'Tenses',
        blurb:
          'Pick a contrast (past vs present perfect, will vs going to…), read the rule, drill 10 sentences. Tracks your best score per topic.',
        topics: TENSE_TOPICS,
        storageNamespace: 'mx:tenses',
      }}
    />
  )
}
