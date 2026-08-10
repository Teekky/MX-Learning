/**
 * Button styling, kept out of Button.tsx.
 *
 * `buttonClass` exists so a react-router `<Link>` can look like a button
 * without nesting a `<button>` inside an `<a>`. It lives in its own module
 * because a file that exports both components and plain functions breaks
 * React Fast Refresh.
 */

import { cn } from './cn'

export type ButtonVariant = 'primary' | 'ghost' | 'quiet' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

/* Flat by design: a fill or a hairline, never a drop shadow. Buttons recur
   several times per screen, and giving each its own elevation made ordinary
   controls compete with the content they act on. */
export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-on-accent hover:bg-accent-hover',
  ghost: 'border-border bg-bg-elevated text-text hover:bg-bg-subtle',
  quiet: 'border-transparent text-text-muted hover:bg-bg-subtle hover:text-text',
  danger: 'border-transparent bg-danger text-on-accent hover:brightness-95',
}

/* `sm` shrinks the visual height only; use it inside rows that are already
   tall enough to give the control a 48px touch target of its own. */
export const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-3 text-sm',
  md: 'min-h-tap px-5 text-sm',
  lg: 'min-h-[56px] px-6 text-base',
}

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return cn(
    'press no-select inline-flex items-center justify-center gap-2 rounded-lg',
    'border-hair font-semibold disabled:pointer-events-none disabled:opacity-40',
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    extra,
  )
}
