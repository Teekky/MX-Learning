/**
 * String utilities for answer normalization and typo tolerance.
 */

/** Normalize for comparison: lowercase, trim, collapse whitespace, strip diacritics. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[''`]/g, "'")
}

/**
 * Levenshtein distance — number of single-character edits between two strings.
 * Iterative DP, O(n·m) time, O(min(n,m)) space.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Ensure a is the shorter one for memory.
  if (a.length > b.length) [a, b] = [b, a]

  let prev = new Array(a.length + 1)
  let curr = new Array(a.length + 1)
  for (let i = 0; i <= a.length; i++) prev[i] = i

  for (let j = 1; j <= b.length; j++) {
    curr[0] = j
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[i] = Math.min(
        curr[i - 1] + 1,
        prev[i] + 1,
        prev[i - 1] + cost,
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[a.length]
}

/**
 * Compare a user's answer to the expected one.
 * Returns the edit distance and a verdict flag.
 */
export function compareAnswer(
  userAnswer: string,
  expected: string,
): { distance: number; isCorrect: boolean; isTypo: boolean } {
  const u = normalize(userAnswer)
  const e = normalize(expected)
  const distance = levenshtein(u, e)
  const isCorrect = distance === 0
  // Allow 1 edit for words ≥ 5 chars, 0 for shorter words.
  const tolerance = e.length >= 5 ? 1 : 0
  const isTypo = !isCorrect && distance <= tolerance
  return { distance, isCorrect, isTypo }
}

/** Normalize for dictée: strip punctuation + diacritics, collapse whitespace. */
function normalizeSentence(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Token-level alignment for visual diff display.
 *
 * Splits both strings into normalised words and walks them with a
 * dynamic-programming alignment (LCS-style edit script). Returns a
 * sequence the UI can render as colored chips:
 *   - 'ok'      → spoken word matched the target word at this slot
 *   - 'wrong'   → spoken word differs from the target word at this slot
 *   - 'missing' → target word the user never said
 *   - 'extra'   → spoken word the user added beyond the target
 *
 * The alignment uses the standard 3-cost edit-distance grid so it handles
 * insertions, deletions, and substitutions cleanly — no off-by-one
 * cascades when the user skips or adds a word mid-sentence.
 */
export interface DiffToken {
  /** What to render. For 'missing' it's the expected word; for the rest it's the user's. */
  text: string
  status: 'ok' | 'wrong' | 'missing' | 'extra'
}

export function diffSentenceWords(expected: string, actual: string): DiffToken[] {
  const exp = tokenize(expected)
  const act = tokenize(actual)
  const m = exp.length
  const n = act.length

  // dp[i][j] = min edits to transform exp[..i] into act[..j].
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = exp[i - 1] === act[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,        // delete from expected (= missing word)
        dp[i][j - 1] + 1,        // insert from actual   (= extra word)
        dp[i - 1][j - 1] + cost, // match or substitute
      )
    }
  }

  // Walk back to reconstruct the edit script.
  const script: DiffToken[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && exp[i - 1] === act[j - 1]) {
      script.push({ text: act[j - 1], status: 'ok' })
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      script.push({ text: act[j - 1], status: 'wrong' })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
      script.push({ text: act[j - 1], status: 'extra' })
      j--
    } else {
      script.push({ text: exp[i - 1], status: 'missing' })
      i--
    }
  }
  return script.reverse()
}

function tokenize(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Score a listening-dictation attempt.
 *
 * Uses character-level Levenshtein against the normalised expected
 * sentence, expressed as `similarity = 1 - distance / max(1, expected.length)`.
 *
 * Thresholds (loose on purpose — even natives miss a word here or there):
 *   - similarity ≥ 0.92 → correct
 *   - similarity ≥ 0.75 → "almost" (counts as a typo for SM-2: quality 2)
 *   - otherwise         → wrong
 */
export function compareSentence(
  userAnswer: string,
  expected: string,
): {
  distance: number
  similarity: number
  isCorrect: boolean
  isTypo: boolean
} {
  const u = normalizeSentence(userAnswer)
  const e = normalizeSentence(expected)
  const distance = levenshtein(u, e)
  const similarity = 1 - distance / Math.max(1, e.length)
  const isCorrect = similarity >= 0.92
  const isTypo = !isCorrect && similarity >= 0.75
  return { distance, similarity, isCorrect, isTypo }
}
