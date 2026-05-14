/**
 * Grammar — structural patterns: articles, conditionals, inversions,
 * subjunctive, clefts, reduced relatives. Thin wrapper around the shared
 * TopicLessonSession engine, configured with the grammar topic dataset.
 */

import { GRAMMAR_TOPICS } from '@/data/grammar'
import { TopicLessonSession } from './TopicLessonSession'

export function GrammarSession() {
  return (
    <TopicLessonSession
      config={{
        title: 'Grammar',
        blurb:
          'Pick a pattern, read the rule, drill 10 quick exercises. Each topic tracks your best score.',
        topics: GRAMMAR_TOPICS,
        storageNamespace: 'mx:grammar',
      }}
    />
  )
}
