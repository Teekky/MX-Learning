/**
 * Add or edit one vocabulary entry.
 *
 * Optimised for the common case: type a word, type what it means, done.
 * Everything else — phonetics, register, regional variant, a French gloss —
 * is behind a "More detail" disclosure, because a form that asks for eleven
 * fields is a form nobody fills in twice.
 *
 * Validation runs on submit rather than on every keystroke: telling someone
 * their half-typed word is invalid is noise, not help.
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Button,
  Field,
  Input,
  Notice,
  Select,
  Textarea,
} from '@/components/ui'
import { addWordToDeck, updateWord, type NewWord } from '@/db/words'
import type { Level, PartOfSpeech, Word } from '@/types'

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const PARTS: PartOfSpeech[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'idiom',
  'preposition',
  'conjunction',
  'pronoun',
  'determiner',
  'interjection',
  'other',
]

/** Longest a single field may be — mirrors the backup importer's caps. */
const MAX_LEMMA = 200
const MAX_TEXT = 2000

export interface WordFormProps {
  /** Pass a word to edit it; omit to create a new one. */
  word?: Word
  /** Prefill for a new entry (used by the idiom library). */
  initial?: Partial<NewWord>
  onSaved: (result: { wordId: number; status: 'added' | 'updated' | 'duplicate' }) => void
  onCancel?: () => void
}

interface FormState {
  lemma: string
  definitionEn: string
  exampleEn: string
  fr: string
  ipa: string
  literal: string
  level: Level
  partOfSpeech: PartOfSpeech
  register: '' | NonNullable<Word['register']>
  variant: '' | NonNullable<Word['variant']>
  tags: string
}

function toState(word?: Word, initial?: Partial<NewWord>): FormState {
  const src = word ?? initial
  return {
    lemma: src?.lemma ?? '',
    definitionEn: src?.definitionEn ?? '',
    exampleEn: src?.examples?.[0]?.en ?? '',
    fr: src?.fr ?? '',
    ipa: src?.ipa ?? '',
    literal: src?.literal ?? '',
    level: src?.level ?? 'B2',
    partOfSpeech: src?.partOfSpeech ?? 'noun',
    register: src?.register ?? '',
    variant: src?.variant ?? '',
    tags: (src?.tags ?? []).filter((t) => t !== 'idiom').join(', '),
  }
}

type Errors = Partial<Record<keyof FormState, string>>

function validate(state: FormState): Errors {
  const errors: Errors = {}
  const lemma = state.lemma.trim()
  if (!lemma) errors.lemma = 'A word or expression is required.'
  else if (lemma.length > MAX_LEMMA) errors.lemma = `Keep it under ${MAX_LEMMA} characters.`

  const definition = state.definitionEn.trim()
  if (!definition) {
    errors.definitionEn = 'Write what it means — this is the answer side of the card.'
  } else if (definition.length > MAX_TEXT) {
    errors.definitionEn = `Keep it under ${MAX_TEXT} characters.`
  }

  if (state.exampleEn.trim().length > MAX_TEXT) {
    errors.exampleEn = `Keep it under ${MAX_TEXT} characters.`
  }
  return errors
}

export function WordForm({ word, initial, onSaved, onCancel }: WordFormProps) {
  const [state, setState] = useState<FormState>(() => toState(word, initial))
  const [errors, setErrors] = useState<Errors>({})
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate(state)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    setFailure(null)
    try {
      const payload: NewWord = {
        lemma: state.lemma.trim(),
        partOfSpeech: state.partOfSpeech,
        level: state.level,
        definitionEn: state.definitionEn.trim(),
        examples: state.exampleEn.trim() ? [{ en: state.exampleEn.trim() }] : [],
        tags: state.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        ...(state.fr.trim() ? { fr: state.fr.trim() } : {}),
        ...(state.ipa.trim() ? { ipa: state.ipa.trim() } : {}),
        ...(state.literal.trim() ? { literal: state.literal.trim() } : {}),
        ...(state.register ? { register: state.register } : {}),
        ...(state.variant ? { variant: state.variant } : {}),
      }

      if (word?.id != null) {
        await updateWord(word.id, payload)
        onSaved({ wordId: word.id, status: 'updated' })
      } else {
        const result = await addWordToDeck(payload)
        onSaved({ wordId: result.wordId, status: result.status })
      }
    } catch (err) {
      setFailure(
        err instanceof Error ? err.message : 'Could not save. Try again in a moment.',
      )
    } finally {
      setSaving(false)
    }
  }

  const isExpression =
    state.partOfSpeech === 'idiom' || state.partOfSpeech === 'phrase'

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {failure && <Notice tone="danger">{failure}</Notice>}

      <Field label="Word or expression" error={errors.lemma} required>
        {(a) => (
          <Input
            {...a}
            value={state.lemma}
            onChange={(e) => set('lemma', e.target.value)}
            placeholder="to bite the bullet"
            maxLength={MAX_LEMMA}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            invalid={a.invalid}
          />
        )}
      </Field>

      <Field
        label="What it means"
        error={errors.definitionEn}
        hint="In English — staying in the language is the point."
        required
      >
        {(a) => (
          <Textarea
            {...a}
            value={state.definitionEn}
            onChange={(e) => set('definitionEn', e.target.value)}
            placeholder="To force yourself to do something unpleasant you have been avoiding."
            maxLength={MAX_TEXT}
            rows={3}
            invalid={a.invalid}
          />
        )}
      </Field>

      <Field label="Example sentence" error={errors.exampleEn} hint="Optional, but it is what makes a word stick.">
        {(a) => (
          <Textarea
            {...a}
            value={state.exampleEn}
            onChange={(e) => set('exampleEn', e.target.value)}
            placeholder="We bit the bullet and rewrote the design system."
            maxLength={MAX_TEXT}
            rows={2}
            invalid={a.invalid}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Level">
          {(a) => (
            <Select
              {...a}
              value={state.level}
              onChange={(e) => set('level', e.target.value as Level)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Type">
          {(a) => (
            <Select
              {...a}
              value={state.partOfSpeech}
              onChange={(e) => set('partOfSpeech', e.target.value as PartOfSpeech)}
            >
              {PARTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* ---- Everything optional lives behind this ------------------- */}
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="btn-quiet -ml-4"
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-fast ${expanded ? 'rotate-180' : ''}`}
          />
          {expanded ? 'Less detail' : 'More detail'}
        </button>

        {expanded && (
          <div className="mt-4 space-y-5">
            <Field label="French" hint="Used only when explaining a mistake.">
              {(a) => (
                <Input
                  {...a}
                  value={state.fr}
                  onChange={(e) => set('fr', e.target.value)}
                  placeholder="prendre son mal en patience"
                />
              )}
            </Field>

            <Field label="Phonetics" hint="IPA, if you want it on the card.">
              {(a) => (
                <Input
                  {...a}
                  value={state.ipa}
                  onChange={(e) => set('ipa', e.target.value)}
                  placeholder="/ˈrɛzɪljənt/"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Register">
                {(a) => (
                  <Select
                    {...a}
                    value={state.register}
                    onChange={(e) =>
                      set('register', e.target.value as FormState['register'])
                    }
                  >
                    <option value="">—</option>
                    <option value="informal">informal</option>
                    <option value="neutral">neutral</option>
                    <option value="formal">formal</option>
                  </Select>
                )}
              </Field>
              <Field label="Variant">
                {(a) => (
                  <Select
                    {...a}
                    value={state.variant}
                    onChange={(e) =>
                      set('variant', e.target.value as FormState['variant'])
                    }
                  >
                    <option value="">—</option>
                    <option value="both">both</option>
                    <option value="BrE">British</option>
                    <option value="AmE">American</option>
                  </Select>
                )}
              </Field>
            </div>

            {isExpression && (
              <Field
                label="Literal reading"
                hint="Only when the surface meaning misleads."
              >
                {(a) => (
                  <Input
                    {...a}
                    value={state.literal}
                    onChange={(e) => set('literal', e.target.value)}
                    placeholder="to bite a bullet"
                  />
                )}
              </Field>
            )}

            <Field label="Tags" hint="Comma separated — business, ux, interview…">
              {(a) => (
                <Input
                  {...a}
                  value={state.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="business, meetings"
                  autoCapitalize="none"
                />
              )}
            </Field>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        {onCancel && (
          <Button variant="quiet" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : word ? 'Save changes' : 'Add to deck'}
        </Button>
      </div>
    </form>
  )
}
