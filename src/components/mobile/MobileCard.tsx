import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileCardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  leftIcon?: ReactNode
  rightElement?: ReactNode
  status?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
  showChevron?: boolean
  onClick?: () => void
  className?: string
}

const statusStyles = {
  default: '',
  success: 'border-l-4 border-l-success',
  warning: 'border-l-4 border-l-warning',
  danger: 'border-l-4 border-l-danger',
  muted: 'opacity-60',
}

export function MobileCard({
  children,
  title,
  subtitle,
  leftIcon,
  rightElement,
  status = 'default',
  showChevron = false,
  onClick,
  className,
}: MobileCardProps) {
  const isInteractive = !!onClick

  const content = (
    <>
      {leftIcon && (
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-surface-tertiary">
          {leftIcon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-base font-medium text-content-primary truncate">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-content-secondary truncate mt-0.5">
            {subtitle}
          </p>
        )}
        {children}
      </div>

      {rightElement && (
        <div className="flex-shrink-0">{rightElement}</div>
      )}

      {showChevron && (
        <svg
          className="w-5 h-5 text-content-tertiary flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </>
  )

  const baseStyles = cn(
    'flex items-center gap-4',
    'p-4 rounded-2xl',
    'bg-surface-secondary',
    statusStyles[status],
    isInteractive && 'active:bg-surface-tertiary active:scale-[0.98] transition-all duration-150',
    className
  )

  if (isInteractive) {
    return (
      <button onClick={onClick} className={cn(baseStyles, 'w-full text-left')}>
        {content}
      </button>
    )
  }

  return <div className={baseStyles}>{content}</div>
}

interface MobileCardGroupProps {
  title?: string
  children: ReactNode
  className?: string
}

export function MobileCardGroup({
  title,
  children,
  className,
}: MobileCardGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <h2 className="text-xs font-semibold text-content-tertiary uppercase tracking-wider px-1 mb-3">
          {title}
        </h2>
      )}
      <div className="space-y-2">{children}</div>
    </div>
  )
}

interface MobileListItemProps {
  children?: ReactNode
  title: string
  subtitle?: string
  leftIcon?: ReactNode
  rightElement?: ReactNode
  showDivider?: boolean
  onClick?: () => void
  className?: string
}

export function MobileListItem({
  children,
  title,
  subtitle,
  leftIcon,
  rightElement,
  showDivider = true,
  onClick,
  className,
}: MobileListItemProps) {
  const content = (
    <>
      {leftIcon && (
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          {leftIcon}
        </div>
      )}

      <div className={cn('flex-1 min-w-0 py-3', showDivider && 'border-b border-border-light')}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base text-content-primary truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-content-tertiary truncate">{subtitle}</p>
            )}
            {children}
          </div>
          {rightElement}
        </div>
      </div>
    </>
  )

  const baseStyles = cn(
    'flex items-center gap-3 px-4',
    onClick && 'active:bg-surface-tertiary transition-colors',
    className
  )

  if (onClick) {
    return (
      <button onClick={onClick} className={cn(baseStyles, 'w-full text-left')}>
        {content}
      </button>
    )
  }

  return <div className={baseStyles}>{content}</div>
}

export default MobileCard
