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

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'border-ink border-stroke bg-accent text-on-accent shadow-md hover:bg-accent-hover',
  ghost: 'border-ink border-stroke bg-bg-elevated text-text shadow-md hover:bg-bg-subtle',
  quiet: 'border-hair border-transparent text-text-muted hover:bg-bg-subtle hover:text-text',
  danger: 'border-ink border-stroke bg-danger text-on-accent shadow-md',
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
    'press no-select inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
    'disabled:pointer-events-none disabled:opacity-40',
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    extra,
  )
}
