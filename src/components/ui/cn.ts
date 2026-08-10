/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately tiny — the UI kit only ever needs conditional concatenation,
 * not the conflict-resolution that `tailwind-merge` provides. Variant maps
 * in this folder are written so that no two branches emit the same
 * property, which is what would have required merging.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
