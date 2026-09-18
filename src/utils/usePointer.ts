/**
 * Is this a touch device?
 *
 * `(pointer: coarse)` asks the real question — "is the primary input a
 * finger?" — rather than guessing from viewport width. A 1024px tablet is
 * touch; a 600px desktop window is not. Keyboard hints, hover affordances
 * and Enter-to-submit instructions should key off this, not off a
 * breakpoint.
 */

import { useEffect, useState } from 'react'

const QUERY = '(pointer: coarse)'

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return coarse
}
