/**
 * Button — the one interactive primitive.
 *
 * Every variant meets the 48px minimum touch target (--tap-min) because the
 * app is used one-handed on a phone as often as with a mouse. The press
 * state is the design system's signature: the element slides 2px into its
 * own hard shadow (see `.press` in index.css), which costs one composited
 * transform and nothing else.
 *
 * For links that should look like buttons, use `buttonClass()` from
 * ./buttonStyles on a react-router `<Link>` rather than nesting a button
 * inside an anchor.
 */

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonStyles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Stretch to the full width of the parent — the default on mobile rows. */
  block?: boolean
  /** Icon rendered before the label. */
  leading?: ReactNode
  /** Icon rendered after the label. */
  trailing?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, leading, trailing, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      // Buttons inside forms default to `submit`, which has surprised more
      // than one "Cancel" control. Opt into submit explicitly instead.
      type={type ?? 'button'}
      className={buttonClass(variant, size, cn(block && 'w-full', className))}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  )
})
