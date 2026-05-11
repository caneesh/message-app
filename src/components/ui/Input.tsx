import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, ...props }, ref) => {
    const baseStyles = `
      w-full px-4 py-3
      bg-surface-tertiary
      border border-border rounded-lg
      text-base text-content-primary
      placeholder:text-content-tertiary
      transition-all duration-200
      focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const errorStyles = error
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : ''

    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              baseStyles,
              errorStyles,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary">
              {rightIcon}
            </div>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        className={cn(baseStyles, errorStyles, className)}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const baseStyles = `
      w-full px-4 py-3
      bg-surface-tertiary
      border border-border rounded-lg
      text-base text-content-primary
      placeholder:text-content-tertiary
      font-inherit resize-y
      transition-all duration-200
      focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const errorStyles = error
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : ''

    return (
      <textarea
        ref={ref}
        className={cn(baseStyles, errorStyles, className)}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    const baseStyles = `
      w-full px-4 py-3
      bg-surface-tertiary
      border border-border rounded-lg
      text-base text-content-primary
      cursor-pointer
      transition-all duration-200
      focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const errorStyles = error
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : ''

    return (
      <select
        ref={ref}
        className={cn(baseStyles, errorStyles, className)}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'

export { Input, Textarea, Select }
