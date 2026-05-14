/**
 * Fisher-Yates shuffle — returns a new shuffled copy of the input array.
 * Used by drill modules so the same topic doesn't replay in the same
 * order each time the user comes back.
 */
export function shuffled<T>(arr: readonly T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
