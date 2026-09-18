/** Persistence for Aussie-module domain progress — separate from the main deck. */

import { db } from '@/db/database'
import type { AussieDomainSkill, AussiePartResult, AussieProgress } from '@/types'

/** All recorded progress, keyed by domain id. */
export async function getAllAussieProgress(): Promise<Record<string, AussieProgress>> {
  const rows = await db.aussieProgress.toArray()
  return Object.fromEntries(rows.map((r) => [r.domainId, r]))
}

export async function getAussieProgress(domainId: string): Promise<AussieProgress | undefined> {
  return db.aussieProgress.get(domainId)
}

/** "Learn the words" was opened and browsed through to the end. */
export async function markAussieTaught(domainId: string): Promise<void> {
  const existing = await db.aussieProgress.get(domainId)
  await db.aussieProgress.put({
    domainId,
    quizParts: existing?.quizParts ?? {},
    contextParts: existing?.contextParts ?? {},
    taughtAt: Date.now(),
  })
}

function bump(prev: AussiePartResult | undefined, score: number): AussiePartResult {
  return {
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    timesCompleted: (prev?.timesCompleted ?? 0) + 1,
    lastPracticedAt: Date.now(),
  }
}

/** A part was completed in the given skill — keep its best score. */
export async function recordAussiePartResult(
  domainId: string,
  skill: AussieDomainSkill,
  partIndex: number,
  score: number,
): Promise<void> {
  const existing = await db.aussieProgress.get(domainId)
  const bucket = skill === 'quiz' ? existing?.quizParts : existing?.contextParts
  const updatedBucket = { ...(bucket ?? {}), [partIndex]: bump(bucket?.[partIndex], score) }
  await db.aussieProgress.put({
    domainId,
    taughtAt: existing?.taughtAt,
    quizParts: skill === 'quiz' ? updatedBucket : existing?.quizParts ?? {},
    contextParts: skill === 'context' ? updatedBucket : existing?.contextParts ?? {},
  })
}
