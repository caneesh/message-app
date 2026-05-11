import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  label: string
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'default', size = 'md', label, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      rounded-lg
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-95
    `

    const variants = {
      default: `
        bg-surface-tertiary text-content-secondary
        hover:bg-surface-primary hover:text-content-primary
      `,
      ghost: `
        bg-transparent text-content-tertiary
        hover:bg-surface-tertiary hover:text-content-primary
      `,
      danger: `
        bg-transparent text-content-tertiary
        hover:bg-danger-light hover:text-danger
      `,
      accent: `
        bg-accent-light text-accent
        hover:bg-accent hover:text-white
      `,
    }

    const sizes = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        aria-label={label}
        title={label}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

export { IconButton }
