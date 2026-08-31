/**
 * Text inputs, selects, and the field wrapper that gives them a label,
 * a hint, and an error message wired up for screen readers.
 *
 * The 16px minimum font size on controls is not a style choice: anything
 * smaller makes Chrome on Android zoom the page when the field is focused,
 * which wrecks the layout mid-form.
 */

import { forwardRef, useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from './cn'

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                      */
/* ------------------------------------------------------------------ */

export interface FieldProps {
  label: string
  /** Explanatory text under the control. Hidden while an error is shown. */
  hint?: ReactNode
  /** Validation message. Its presence puts the control in the invalid state. */
  error?: string | null
  /** Marks the label and sets `required` semantics on the child. */
  required?: boolean
  children: (props: {
    id: string
    'aria-describedby': string | undefined
    'aria-invalid': boolean | undefined
    invalid: boolean
  }) => ReactNode
  className?: string
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('w-full', className)}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        invalid: Boolean(error),
      })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Controls                                                           */
/* ------------------------------------------------------------------ */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn('input', invalid && 'input-invalid', className)}
      {...rest}
    />
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn('input py-3 leading-relaxed', invalid && 'input-invalid', className)}
      {...rest}
    />
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn('input cursor-pointer pr-10', invalid && 'input-invalid', className)}
      {...rest}
    >
      {children}
    </select>
  )
})
