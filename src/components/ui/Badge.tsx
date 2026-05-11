import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'muted'
  size?: 'sm' | 'md' | 'lg'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-semibold uppercase tracking-wide
      rounded-full whitespace-nowrap
    `

    const variants = {
      default: 'bg-surface-tertiary text-content-primary',
      success: 'bg-success-light text-success',
      warning: 'bg-warning-light text-amber-700 dark:text-amber-500',
      danger: 'bg-danger-light text-danger',
      info: 'bg-info-light text-info',
      accent: 'bg-accent-light text-accent',
      muted: 'bg-surface-tertiary text-content-tertiary',
    }

    const sizes = {
      sm: 'text-2xs px-1.5 py-0.5',
      md: 'text-xs px-2 py-0.5',
      lg: 'text-sm px-3 py-1',
    }

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: 'active' | 'pending' | 'done' | 'cancelled' | 'changed' | 'resolved' | 'open'
}

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const statusConfig = {
      active: { variant: 'success' as const, label: 'Active' },
      pending: { variant: 'warning' as const, label: 'Pending' },
      done: { variant: 'success' as const, label: 'Done' },
      cancelled: { variant: 'muted' as const, label: 'Cancelled' },
      changed: { variant: 'warning' as const, label: 'Changed' },
      resolved: { variant: 'success' as const, label: 'Resolved' },
      open: { variant: 'accent' as const, label: 'Open' },
    }

    const config = statusConfig[status]

    return (
      <Badge ref={ref} variant={config.variant} className={className} {...props}>
        {config.label}
      </Badge>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

export { StatusBadge }
