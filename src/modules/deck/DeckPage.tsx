/**
 * My Deck — every word the learner has reviewed at least once, plus their
 * SRS state. The deck is a journal: it grows when you actually engage
 * with a word, never silently.
 *
 * Sections:
 *   - Header + summary (total + per-source counts).
 *   - Optional curated-words cleanup banner (legacy installs only).
 *   - Filter chips (level + clickable tag chips).
 *   - Search + source filter + sort dropdown.
 *   - Bulk action bar (visible when at least one row is selected).
 *   - Word list — grouped by added-date band when sorted by recency,
 *     flat when sorted by difficulty.
 *
 * Per-row, the user sees: lemma, level, POS, source pill, FR, definition,
 * an example, tags, and a tiny SRS strip ("Due in 3 days · ease 2.4 ·
 * 1 lapse"). The SRS strip is what turns the deck from a flat list into
 * an actual learning journal.
 *
 * Perf note: the deck is small (hundreds of words), so we load words +
 * cards into memory and filter/sort client-side. No virtualisation yet.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteWord,
  deleteWordsByIds,
  deleteWordsBySource,
  getAllCardsByWordId,
  getAllWords,
} from '@/db/queries'
import { PageLoader } from '@/components/PageLoader'
import type { Level, SRSCard, Word } from '@/types'

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

type SourceFilter = 'all' | 'user' | 'mistral'
type SortKey = 'recent' | 'oldest' | 'hardest' | 'most-forgotten'

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Newest first',
  oldest: 'Oldest first',
  hardest: 'Hardest first',
  'most-forgotten': 'Most forgotten',
}

/** When sorted by date, group rows into these temporal bands. */
type DateBand = 'today' | 'recent' | 'older'
const BAND_LABEL: Record<DateBand, string> = {
  today: 'Today',
  recent: 'Last 7 days',
  older: 'Older',
}

export function DeckPage() {
  const [words, setWords] = useState<Word[] | null>(null)
  const [cardsByWord, setCardsByWord] = useState<Map<number, SRSCard>>(new Map())
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<Set<Level>>(new Set())
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set())
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const [bulkDeleteState, setBulkDeleteState] = useState<
    'idle' | 'confirm' | 'busy'
  >('idle')
  const [clearingSeed, setClearingSeed] = useState<'idle' | 'confirm' | 'busy'>(
    'idle',
  )

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    const [list, cards] = await Promise.all([
      getAllWords(),
      getAllCardsByWordId(),
    ])
    setWords(list)
    setCardsByWord(cards)
  }

  async function confirmDelete(id: number) {
    await deleteWord(id)
    setPendingDelete(null)
    setSelected((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    await refresh()
  }

  async function bulkDelete() {
    if (selected.size === 0) return
    setBulkDeleteState('busy')
    await deleteWordsByIds(Array.from(selected))
    setSelected(new Set())
    setBulkDeleteState('idle')
    await refresh()
  }

  async function clearAllSeed() {
    setClearingSeed('busy')
    await deleteWordsBySource('seed')
    await refresh()
    setClearingSeed('idle')
  }

  /* ----------------------- Tag list (for chip row) ---------------------- */
  const allTags = useMemo(() => {
    const set = new Set<string>()
    if (words) for (const w of words) for (const t of w.tags) set.add(t)
    return Array.from(set).sort()
  }, [words])

  /* --------------------------- Filter pipeline -------------------------- */
  const filtered = useMemo(() => {
    if (!words) return []
    const q = search.trim().toLowerCase()
    return words.filter((w) => {
      if (levelFilter.size > 0 && !levelFilter.has(w.level)) return false
      if (sourceFilter !== 'all' && w.source !== sourceFilter) return false
      if (tagFilter.size > 0 && !w.tags.some((t) => tagFilter.has(t))) {
        return false
      }
      if (!q) return true

      // Search across every text field the user might remember the word by.
      if (w.lemma.toLowerCase().includes(q)) return true
      if (w.fr && w.fr.toLowerCase().includes(q)) return true
      if (w.definitionEn && w.definitionEn.toLowerCase().includes(q))
        return true
      if (w.partOfSpeech.toLowerCase().includes(q)) return true
      if (w.level.toLowerCase() === q) return true
      if (w.tags.some((t) => t.toLowerCase().includes(q))) return true
      if (
        w.examples.some(
          (ex) =>
            ex.en.toLowerCase().includes(q) ||
            (ex.fr && ex.fr.toLowerCase().includes(q)),
        )
      )
        return true
      return false
    })
  }, [words, search, levelFilter, sourceFilter, tagFilter])

  /* ------------------------------ Sorting ------------------------------ */
  const sorted = useMemo(() => {
    const list = filtered.slice()
    switch (sort) {
      case 'recent':
        list.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
        break
      case 'oldest':
        list.sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))
        break
      case 'hardest':
        // Highest difficultyScore first; cards without an SRS row drop to bottom.
        list.sort((a, b) => {
          const ca = a.id != null ? cardsByWord.get(a.id) : undefined
          const cb = b.id != null ? cardsByWord.get(b.id) : undefined
          const da = ca?.difficultyScore ?? -1
          const db = cb?.difficultyScore ?? -1
          if (db !== da) return db - da
          // Tiebreak: lower ease = harder.
          return (ca?.ease ?? Infinity) - (cb?.ease ?? Infinity)
        })
        break
      case 'most-forgotten':
        list.sort((a, b) => {
          const ca = a.id != null ? cardsByWord.get(a.id) : undefined
          const cb = b.id != null ? cardsByWord.get(b.id) : undefined
          return (cb?.lapses ?? 0) - (ca?.lapses ?? 0)
        })
        break
    }
    return list
  }, [filtered, sort, cardsByWord])

  /* ----------- Optional grouping by date band when sort = date ---------- */
  const grouped = useMemo<Array<{ band: DateBand; items: Word[] }> | null>(() => {
    if (sort !== 'recent' && sort !== 'oldest') return null
    const today = startOfToday()
    const sevenDaysAgo = today - 6 * 24 * 60 * 60 * 1000 // include today
    const groups: Record<DateBand, Word[]> = {
      today: [],
      recent: [],
      older: [],
    }
    for (const w of sorted) {
      const t = w.addedAt ?? 0
      if (t >= today) groups.today.push(w)
      else if (t >= sevenDaysAgo) groups.recent.push(w)
      else groups.older.push(w)
    }
    const order: DateBand[] = sort === 'recent'
      ? ['today', 'recent', 'older']
      : ['older', 'recent', 'today']
    return order
      .map((b) => ({ band: b, items: groups[b] }))
      .filter((g) => g.items.length > 0)
  }, [sorted, sort])

  /* ----------------------------- Counts -------------------------------- */
  const byLevel = useMemo(() => {
    const out: Record<Level, number> = {
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
      C1: 0,
      C2: 0,
    }
    if (words) for (const w of words) out[w.level]++
    return out
  }, [words])

  const bySource = useMemo(() => {
    const out = { seed: 0, user: 0, mistral: 0, session: 0 } as Record<
      Word['source'],
      number
    >
    if (words) for (const w of words) out[w.source] = (out[w.source] ?? 0) + 1
    return out
  }, [words])

  function toggleLevel(level: Level) {
    setLevelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  function toggleTag(tag: string) {
    setTagFilter((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    const ids = sorted.map((w) => w.id).filter((id): id is number => id != null)
    setSelected(new Set(ids))
  }

  function clearSelection() {
    setSelected(new Set())
    if (bulkDeleteState !== 'busy') setBulkDeleteState('idle')
  }

  /* ------------------------------ Render ------------------------------- */

  if (words === null) {
    return <PageLoader label="Loading your deck…" />
  }

  if (words.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle">
          <span className="text-2xl text-accent">◈</span>
        </div>
        <h1 className="font-display text-2xl font-semibold">
          Your deck is empty.
        </h1>
        <p className="text-text-muted">
          Your deck grows as you learn. Try{' '}
          <strong className="text-text">Learn from anything</strong> to teach
          yourself a single word, or paste a piece of text and drill the
          vocabulary worth keeping. Anything you review lands here.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/practice/import" className="btn-primary">
            Learn from anything
          </Link>
          <Link to="/practice" className="btn-ghost">
            Browse all modes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
            My deck
          </h1>
          <p className="text-text-muted">
            Every word stored locally on this device.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <Summary label="Total" value={words.length} />
          {bySource.user > 0 && (
            <Summary label="Imported" value={bySource.user} />
          )}
          {bySource.mistral > 0 && (
            <Summary label="AI" value={bySource.mistral} />
          )}
        </div>
      </header>

      {/* Curated-words cleanup banner (legacy installs only) */}
      {bySource.seed > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-bg-subtle/60 px-4 py-3 text-sm">
          <div className="text-text-muted">
            <strong className="text-text">{bySource.seed} curated words</strong>{' '}
            from an earlier app version are still in your deck. You can remove
            them all — your own imported words stay safe.
          </div>
          {clearingSeed === 'idle' ? (
            <button
              type="button"
              onClick={() => setClearingSeed('confirm')}
              className="btn-ghost text-xs"
            >
              Remove curated words
            </button>
          ) : clearingSeed === 'confirm' ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearAllSeed}
                className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-medium text-warning hover:bg-warning/20"
              >
                Confirm — remove {bySource.seed}
              </button>
              <button
                type="button"
                onClick={() => setClearingSeed('idle')}
                className="text-[11px] text-text-subtle hover:text-text"
              >
                Cancel
              </button>
            </div>
          ) : (
            <span className="text-xs text-text-subtle">Removing…</span>
          )}
        </div>
      )}

      {/* Per-level breakdown chips */}
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((lv) => {
          const count = byLevel[lv]
          const active = levelFilter.has(lv)
          const disabled = count === 0
          return (
            <button
              key={lv}
              type="button"
              onClick={() => !disabled && toggleLevel(lv)}
              disabled={disabled}
              className={
                'flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ' +
                (disabled
                  ? 'cursor-not-allowed border-border/40 text-text-subtle opacity-60'
                  : active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-accent/40 hover:text-text')
              }
            >
              <span className="font-semibold">{lv}</span>
              <span className="text-text-subtle">{count}</span>
            </button>
          )
        })}
        {levelFilter.size > 0 && (
          <button
            type="button"
            onClick={() => setLevelFilter(new Set())}
            className="rounded-full border border-transparent px-3 py-1 text-xs text-text-subtle hover:text-text"
          >
            Clear levels
          </button>
        )}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-text-subtle">
            Tags
          </span>
          {allTags.map((t) => {
            const active = tagFilter.has(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={
                  'rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider transition ' +
                  (active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border/60 bg-bg-subtle text-text-subtle hover:border-accent/40 hover:text-text')
                }
              >
                {t}
              </button>
            )
          })}
          {tagFilter.size > 0 && (
            <button
              type="button"
              onClick={() => setTagFilter(new Set())}
              className="text-[10px] uppercase tracking-wider text-text-subtle hover:text-text"
            >
              Clear tags
            </button>
          )}
        </div>
      )}

      {/* Search + source filter + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search words, translation, definition, example…"
          className="input flex-1 min-w-[220px]"
        />
        <div className="flex gap-1 rounded-xl border border-border bg-bg p-1">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'user', label: 'Imported' },
              { key: 'mistral', label: 'AI-generated' },
            ] as Array<{ key: SourceFilter; label: string }>
          ).map((opt) => {
            if (
              opt.key !== 'all' &&
              (bySource[opt.key as Word['source']] ?? 0) === 0
            ) {
              return null
            }
            const active = sourceFilter === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSourceFilter(opt.key)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs transition ' +
                  (active
                    ? 'bg-accent-subtle text-text'
                    : 'text-text-muted hover:text-text')
                }
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <SortDropdown value={sort} onChange={setSort} />
      </div>

      {/* Result count + bulk action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-text-subtle">
          {sorted.length === words.length
            ? `${words.length} words`
            : `${sorted.length} of ${words.length} words`}
        </div>
        {selected.size > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs">
            <span className="font-medium text-text">
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={selectAllVisible}
              className="text-text-subtle hover:text-text"
            >
              Select all visible
            </button>
            <span className="text-text-subtle">·</span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-text-subtle hover:text-text"
            >
              Clear
            </button>
            <span className="text-text-subtle">·</span>
            {bulkDeleteState === 'idle' ? (
              <button
                type="button"
                onClick={() => setBulkDeleteState('confirm')}
                className="font-medium text-warning hover:text-warning"
              >
                Delete {selected.size}
              </button>
            ) : bulkDeleteState === 'confirm' ? (
              <>
                <button
                  type="button"
                  onClick={bulkDelete}
                  className="rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning hover:bg-warning/20"
                >
                  Confirm — delete {selected.size}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDeleteState('idle')}
                  className="text-text-subtle hover:text-text"
                >
                  Cancel
                </button>
              </>
            ) : (
              <span className="text-text-subtle">Deleting…</span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={selectAllVisible}
            className="text-[11px] text-text-subtle hover:text-text"
          >
            Select all visible
          </button>
        )}
      </div>

      {/* Word list — grouped by date band when sort is by recency */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-subtle/40 p-8 text-center text-sm text-text-muted">
          No words match these filters.
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.band} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  {BAND_LABEL[g.band]}
                </h3>
                <span className="text-[11px] text-text-subtle">
                  {g.items.length} word{g.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {g.items.map((w) => (
                    <WordRow
                      key={w.id}
                      word={w}
                      card={w.id != null ? cardsByWord.get(w.id) : undefined}
                      selected={w.id != null && selected.has(w.id)}
                      onToggleSelect={() => {
                        if (w.id != null) toggleSelect(w.id)
                      }}
                      pendingDelete={pendingDelete === w.id}
                      onAskDelete={() => setPendingDelete(w.id ?? null)}
                      onCancelDelete={() => setPendingDelete(null)}
                      onConfirmDelete={() => {
                        if (w.id != null) void confirmDelete(w.id)
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map((w) => (
              <WordRow
                key={w.id}
                word={w}
                card={w.id != null ? cardsByWord.get(w.id) : undefined}
                selected={w.id != null && selected.has(w.id)}
                onToggleSelect={() => {
                  if (w.id != null) toggleSelect(w.id)
                }}
                pendingDelete={pendingDelete === w.id}
                onAskDelete={() => setPendingDelete(w.id ?? null)}
                onCancelDelete={() => setPendingDelete(null)}
                onConfirmDelete={() => {
                  if (w.id != null) void confirmDelete(w.id)
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Link to="/practice/import" className="btn-ghost">
          + Learn another word
        </Link>
      </div>
    </div>
  )
}

/* =============================== Word row =============================== */

function WordRow({
  word,
  card,
  selected,
  onToggleSelect,
  pendingDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  word: Word
  card: SRSCard | undefined
  selected: boolean
  onToggleSelect: () => void
  pendingDelete: boolean
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const firstExample = word.examples?.[0]
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      className={
        'card flex items-start gap-3 py-3 transition-colors ' +
        (selected ? 'border-accent/60 bg-accent/5' : '')
      }
    >
      <label className="flex shrink-0 cursor-pointer items-center pt-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${word.lemma}`}
          className="h-4 w-4 cursor-pointer rounded border-border accent-accent"
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-base font-semibold text-text">
            {word.lemma}
          </span>
          <LevelBadge level={word.level} />
          <span className="text-xs text-text-subtle">{word.partOfSpeech}</span>
          <SourcePill source={word.source} />
        </div>
        {(word.fr || word.definitionEn) && (
          <div className="mt-0.5 text-sm text-text">
            {word.fr && <span className="text-accent">{word.fr}</span>}
            {word.fr && word.definitionEn && (
              <span className="text-text-muted"> · </span>
            )}
            {word.definitionEn && (
              <span className="text-text-muted">{word.definitionEn}</span>
            )}
          </div>
        )}
        {firstExample && (
          <div className="mt-1 text-xs italic text-text-subtle">
            "{firstExample.en}"
          </div>
        )}
        {word.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {word.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border/60 bg-bg-subtle px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-subtle"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <SrsStrip card={card} />
      </div>

      {pendingDelete ? (
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={onConfirmDelete}
            className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-medium text-warning hover:bg-warning/20"
            title="Confirm deletion"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="text-[11px] text-text-subtle hover:text-text"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAskDelete}
          aria-label={`Remove ${word.lemma} from deck`}
          title="Remove from deck"
          className="shrink-0 rounded-lg p-2 text-text-subtle transition hover:bg-bg-subtle hover:text-warning"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}

/* ------------------------------ SRS strip ------------------------------ */

/**
 * Tiny per-row strip showing the FSRS state of a card. Designed to make
 * the deck feel like a journal: at a glance you see how well you know
 * each word and when it's coming back.
 */
function SrsStrip({ card }: { card: SRSCard | undefined }) {
  if (!card) return null

  const reviewedAtLeastOnce = (card.lastReviewed ?? 0) > 0
  if (!reviewedAtLeastOnce) {
    return (
      <div className="mt-1.5 text-[11px] uppercase tracking-wider text-text-subtle">
        New · not yet reviewed
      </div>
    )
  }

  const dueLabel = formatDue(card.due)
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-text-subtle">
      <span className="text-text-muted">{dueLabel}</span>
      <span>·</span>
      <span>{easeLabel(card.ease)}</span>
      {card.lapses > 0 && (
        <>
          <span>·</span>
          <span className="text-warning">
            {card.lapses} lapse{card.lapses === 1 ? '' : 's'}
          </span>
        </>
      )}
    </div>
  )
}

function easeLabel(ease: number): string {
  if (ease < 1.5) return 'Very hard'
  if (ease < 2.0) return 'Hard'
  if (ease < 2.5) return 'Medium'
  if (ease < 3.0) return 'Easy'
  return 'Very easy'
}

function formatDue(due: number): string {
  const now = Date.now()
  const diffMs = due - now
  const day = 24 * 60 * 60 * 1000
  if (diffMs <= 0) return 'Due now'
  const days = Math.round(diffMs / day)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days < 30) return `Due in ${days} days`
  const months = Math.round(days / 30)
  return `Due in ${months} month${months === 1 ? '' : 's'}`
}

/* ------------------------------- Pills --------------------------------- */

function LevelBadge({ level }: { level: Level }) {
  const color: Record<Level, string> = {
    A1: 'bg-success/10 text-success border-success/30',
    A2: 'bg-success/10 text-success border-success/30',
    B1: 'bg-accent/10 text-accent border-accent/30',
    B2: 'bg-accent/10 text-accent border-accent/30',
    C1: 'bg-warning/10 text-warning border-warning/30',
    C2: 'bg-warning/10 text-warning border-warning/30',
  }
  return (
    <span
      className={
        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' +
        color[level]
      }
    >
      {level}
    </span>
  )
}

function SourcePill({ source }: { source: Word['source'] }) {
  const labels: Record<Word['source'], string> = {
    seed: 'Seed',
    user: 'Imported',
    mistral: 'AI',
    session: 'Session',
  }
  const styles: Record<Word['source'], string> = {
    seed: 'bg-bg-subtle text-text-subtle',
    user: 'bg-accent/10 text-accent',
    mistral: 'bg-accent/10 text-accent',
    session: 'bg-bg-subtle text-text-subtle',
  }
  return (
    <span
      className={
        'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ' +
        styles[source]
      }
    >
      {labels[source]}
    </span>
  )
}

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey
  onChange: (v: SortKey) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative min-w-[170px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full items-center justify-between gap-2 py-2 text-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{SORT_LABELS[value]}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-text-subtle transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-full overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-lg">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              role="option"
              aria-selected={value === k}
              onClick={() => {
                onChange(k)
                setOpen(false)
              }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                value === k
                  ? 'bg-accent-subtle text-text'
                  : 'text-text-muted hover:bg-bg-subtle hover:text-text'
              }`}
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div className="font-display text-xl font-semibold text-text">{value}</div>
    </div>
  )
}

/* ------------------------------ helpers -------------------------------- */

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
