/**
 * "Is the user typing right now?"
 *
 * On a phone the software keyboard eats roughly half the screen, and with
 * `interactive-widget=resizes-content` (see index.html) Chrome shrinks the
 * layout viewport, which parks our fixed bottom bar directly on top of the
 * keyboard. The bar is then both useless — you are mid-answer, not mid-
 * navigation — and expensive: 60px of the little room left.
 *
 * Detection is by focus, not by viewport arithmetic. Measuring the keyboard
 * means guessing a baseline height that the URL bar, the split-screen
 * divider and pinch-zoom all move underneath you; "a text field has focus"
 * is the thing we actually care about and the browser tells us directly.
 *
 * The `false` edge is delayed a beat so that tabbing between two fields, or
 * the blur that fires just before a Submit click, does not flash the bar
 * back in for one frame.
 */

import { useEffect, useState } from 'react'

/** Input types that summon a keyboard. Everything else (range, checkbox,
 *  color, date pickers…) opens its own widget or none at all. */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
])

function isTextEntry(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === 'TEXTAREA') return true
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type.toLowerCase()
    return TEXT_INPUT_TYPES.has(type)
  }
  return false
}

const SETTLE_MS = 150

export function useTextEntryFocus(): boolean {
  /* Seeded from the live focus rather than from `false`, so a field that was
     already focused when this mounts does not flash the bar back in. */
  const [typing, setTyping] = useState(() =>
    typeof document === 'undefined' ? false : isTextEntry(document.activeElement),
  )

  useEffect(() => {
    let timer: number | undefined

    const settle = (next: boolean) => {
      window.clearTimeout(timer)
      if (next) {
        setTyping(true)
      } else {
        /* Re-read the active element when the timer fires: by then focus has
           landed on whatever comes next, so field-to-field moves are silent. */
        timer = window.setTimeout(() => {
          setTyping(isTextEntry(document.activeElement))
        }, SETTLE_MS)
      }
    }

    const onFocusIn = (e: FocusEvent) => settle(isTextEntry(e.target as Element))
    const onFocusOut = () => settle(false)

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  return typing
}
