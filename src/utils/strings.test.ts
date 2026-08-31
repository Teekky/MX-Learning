import { describe, expect, it } from 'vitest'
import {
  normalize,
  levenshtein,
  compareAnswer,
  compareSentence,
  diffSentenceWords,
} from './strings'

describe('normalize', () => {
  it('lowercases, trims, collapses whitespace and strips diacritics', () => {
    expect(normalize('  Café   au  LAIT ')).toBe('cafe au lait')
  })
  it('unifies curly and straight apostrophes', () => {
    expect(normalize('don’t')).toBe(normalize("don't"))
  })
})

describe('levenshtein', () => {
  it('is zero for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0)
  })
  it('counts single edits', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('', 'abc')).toBe(3)
  })
  it('is symmetric', () => {
    expect(levenshtein('flaw', 'lawn')).toBe(levenshtein('lawn', 'flaw'))
  })
})

describe('compareAnswer', () => {
  it('accepts an exact match after normalisation', () => {
    const r = compareAnswer('  Deadline ', 'deadline')
    expect(r.isCorrect).toBe(true)
    expect(r.isTypo).toBe(false)
  })
  it('forgives one edit on words of five characters or more', () => {
    // one substitution (a→e): distance 1
    const r = compareAnswer('grammer', 'grammar')
    expect(r.isCorrect).toBe(false)
    expect(r.isTypo).toBe(true)
  })
  it('does not forgive a two-edit transposition', () => {
    // "ie" <-> "ei" is two edits in plain Levenshtein
    expect(compareAnswer('recieve', 'receive').isTypo).toBe(false)
  })
  it('does not forgive a typo on a short word', () => {
    const r = compareAnswer('ct', 'cat')
    expect(r.isTypo).toBe(false)
  })
  it('rejects a genuinely wrong answer', () => {
    const r = compareAnswer('elephant', 'receive')
    expect(r.isCorrect).toBe(false)
    expect(r.isTypo).toBe(false)
  })
})

describe('compareSentence', () => {
  it('accepts a near-perfect transcription', () => {
    const r = compareSentence(
      'the quick brown fox jumps over the lazy dog',
      'The quick brown fox jumps over the lazy dog.',
    )
    expect(r.isCorrect).toBe(true)
  })
  it('flags a roughly-right attempt as "almost"', () => {
    const r = compareSentence(
      'the quick brown fox jump over lazy dog',
      'The quick brown fox jumps over the lazy dog.',
    )
    expect(r.isCorrect).toBe(false)
    expect(r.isTypo).toBe(true)
  })
  it('rejects a mostly-wrong attempt', () => {
    const r = compareSentence('something completely different', 'the lazy dog sleeps')
    expect(r.isCorrect).toBe(false)
    expect(r.isTypo).toBe(false)
  })
})

describe('diffSentenceWords', () => {
  it('marks every word ok on an exact match', () => {
    const d = diffSentenceWords('hello there world', 'hello there world')
    expect(d.every((t) => t.status === 'ok')).toBe(true)
  })
  it('detects a missing word', () => {
    const d = diffSentenceWords('hello there world', 'hello world')
    expect(d.find((t) => t.text === 'there')?.status).toBe('missing')
  })
  it('detects an extra word', () => {
    const d = diffSentenceWords('hello world', 'hello big world')
    expect(d.find((t) => t.text === 'big')?.status).toBe('extra')
  })
  it('detects a substitution', () => {
    const d = diffSentenceWords('hello world', 'hello planet')
    expect(d.find((t) => t.text === 'planet')?.status).toBe('wrong')
  })
})
