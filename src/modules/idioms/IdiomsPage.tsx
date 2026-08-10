/**
 * The idiom library.
 *
 * A browsable, filterable view over the bundled corpus (src/data/idioms.ts),
 * plus a way to write your own. Nothing here is added to the deck by
 * default: a library you *choose* from beats a deck someone else filled.
 *
 * The register and variant badges are the reason this module exists as
 * something separate from the deck. "Spill the beans" and "disclose" mean
 * the same thing and belong in completely different rooms.
 */

import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search, Volume2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LevelBadge,
  Notice,
  PageLoader,
  RegisterBadge,
  Sheet,
  VariantBadge,
  cn,
} from '@/components/ui'
import { WordForm } from '@/components/WordForm'
import { IDIOMS, idiomThemeCounts, type IdiomSeed } from '@/data/idioms'
import { addWordToDeck, existingLemmas } from '@/db/words'
import { speak } from '@/audio/tts'
import { useAppStore } from '@/store/useAppStore'
import type { Word } from '@/types'

type RegisterFilter = 'all' | NonNullable<Word['register']>

export function IdiomsPage() {
  const pushToast = useAppStore((s) => s.pushToast)

  const [inDeck, setInDeck] = useState<Set<string> | null>(null)
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<string | null>(null)
  const [register, setRegister] = useState<RegisterFilter>('all')
  const [composerOpen, setComposerOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const themes = useMemo(() => idiomThemeCounts(), [])

  /* Which corpus entries the user already owns, so the list can show state
     rather than letting them add the same idiom four times. */
  useEffect(() => {
    existingLemmas(IDIOMS.map((i) => i.lemma)).then(setInDeck)
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return IDIOMS.filter((item) => {
      if (theme && !item.tags.includes(theme)) return false
      if (register !== 'all' && item.register !== register) return false
      if (!needle) return true
      return (
        item.lemma.toLowerCase().includes(needle) ||
        (item.definitionEn ?? '').toLowerCase().includes(needle) ||
        (item.fr ?? '').toLowerCase().includes(needle)
      )
    })
  }, [query, theme, register])

  async function handleAdd(item: IdiomSeed) {
    setBusy(item.lemma)
    try {
      // `user`, not `seed`: the deck page treats `seed` as leftovers from an
      // older app version and offers to bulk-delete them. An expression you
      // deliberately picked from the library is yours.
      const result = await addWordToDeck({ ...item, source: 'user' })
      setInDeck((prev) => new Set([...(prev ?? []), item.lemma.toLowerCase()]))
      pushToast({
        kind: 'info',
        icon: result.status === 'added' ? '✦' : '·',
        title:
          result.status === 'added'
            ? `“${item.lemma}” added to your deck`
            : `“${item.lemma}” was already in your deck`,
        body:
          result.status === 'added'
            ? 'It is due immediately — you will see it in your next review.'
            : undefined,
      })
    } finally {
      setBusy(null)
    }
  }

  if (!inDeck) return <PageLoader label="Opening the library…" />

  const ownedCount = inDeck.size

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      {/* ---- Header ---------------------------------------------------- */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-display text-text">
            Idioms
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {IDIOMS.length} native expressions, with the register and the side of
            the Atlantic they belong to. {ownedCount} in your deck.
          </p>
        </div>
        <Button leading={<Plus size={18} />} onClick={() => setComposerOpen(true)}>
          Add your own
        </Button>
      </header>

      {/* ---- Filters --------------------------------------------------- */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meaning or expression…"
            aria-label="Search idioms"
            className="pl-11"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip active={theme === null} onClick={() => setTheme(null)}>
            All themes
          </Chip>
          {themes.map((t) => (
            <Chip
              key={t.theme}
              active={theme === t.theme}
              onClick={() => setTheme(theme === t.theme ? null : t.theme)}
            >
              {t.theme}
              <span className="ml-1 opacity-50">{t.count}</span>
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'informal', 'neutral', 'formal'] as const).map((r) => (
            <Chip key={r} active={register === r} onClick={() => setRegister(r)}>
              {r === 'all' ? 'Any register' : r}
            </Chip>
          ))}
        </div>
      </div>

      {/* ---- Results --------------------------------------------------- */}
      {visible.length === 0 ? (
        <EmptyState
          icon="⌕"
          title="Nothing matches that"
          body="Try a broader theme, or clear the search. If the expression you want is missing, add it — the library is yours to extend."
        >
          <Button variant="ghost" onClick={() => { setQuery(''); setTheme(null); setRegister('all') }}>
            Clear filters
          </Button>
          <Button onClick={() => setComposerOpen(true)}>Add your own</Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <IdiomRow
              key={item.lemma}
              item={item}
              owned={inDeck.has(item.lemma.toLowerCase())}
              busy={busy === item.lemma}
              onAdd={() => void handleAdd(item)}
            />
          ))}
        </ul>
      )}

      {/* ---- Composer -------------------------------------------------- */}
      <Sheet
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Add an expression"
        description="It goes straight into your deck and is due on your next review."
      >
        <Notice tone="info">
          Register and variant live under <strong>More detail</strong> — they are
          what turn a definition into something you can actually use.
        </Notice>
        <div className="mt-5">
          <WordForm
            initial={{ partOfSpeech: 'idiom', tags: ['idiom'], register: 'informal', variant: 'both' }}
            onSaved={(r) => {
              setComposerOpen(false)
              pushToast({
                kind: 'info',
                icon: r.status === 'duplicate' ? '·' : '✦',
                title:
                  r.status === 'duplicate'
                    ? 'That expression is already in your deck'
                    : 'Expression added',
              })
            }}
            onCancel={() => setComposerOpen(false)}
          />
        </div>
      </Sheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'press rounded-full border-hair px-3 py-2 text-sm font-medium capitalize',
        active
          ? 'border-stroke bg-accent text-on-accent'
          : 'border-border bg-bg-elevated text-text-muted hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

function IdiomRow({
  item,
  owned,
  busy,
  onAdd,
}: {
  item: IdiomSeed
  owned: boolean
  busy: boolean
  onAdd: () => void
}) {
  const example = item.examples[0]
  return (
    <li>
      <Card padding="sm" className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-text">
              {item.lemma}
            </h2>
            <LevelBadge level={item.level} />
            {item.register && <RegisterBadge register={item.register} />}
            {item.variant && <VariantBadge variant={item.variant} />}
          </div>

          <p className="mt-1.5 text-sm text-text">{item.definitionEn}</p>

          {item.literal && (
            <p className="mt-1 text-xs text-text-subtle">
              Literally: <span className="italic">{item.literal}</span>
            </p>
          )}

          {example && (
            <p className="mt-2 text-sm italic text-text-muted">“{example.en}”</p>
          )}

          {item.fr && (
            <p className="mt-1.5 text-xs text-text-subtle">
              <Badge tone="neutral" className="mr-1.5">fr</Badge>
              {item.fr}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void speak(item.lemma)}
            aria-label={`Hear “${item.lemma}” pronounced`}
            className="press flex h-tap w-tap items-center justify-center rounded-full border-hair border-border text-text-muted hover:bg-bg-subtle hover:text-text"
          >
            <Volume2 size={18} />
          </button>

          {owned ? (
            <span
              className="flex h-tap w-tap items-center justify-center rounded-full border-hair border-success/40 bg-success/10 text-success"
              title="Already in your deck"
            >
              <Check size={18} />
              <span className="sr-only">In your deck</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={busy}
              aria-label={`Add “${item.lemma}” to your deck`}
              className="press flex h-tap w-tap items-center justify-center rounded-full border-ink border-stroke bg-accent text-on-accent shadow-sm disabled:opacity-50"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </Card>
    </li>
  )
}
