import { cn } from '@/lib/utils'

type PromiseStatus = 'pending' | 'done' | 'cancelled'

interface CommitmentIndicatorProps {
  status: PromiseStatus
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const statusConfig = {
  pending: {
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Pending',
    bgColor: 'bg-warning-light',
    textColor: 'text-warning',
    ringColor: 'ring-warning/30',
  },
  done: {
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Completed',
    bgColor: 'bg-success-light',
    textColor: 'text-success',
    ringColor: 'ring-success/30',
  },
  cancelled: {
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Cancelled',
    bgColor: 'bg-surface-tertiary',
    textColor: 'text-content-tertiary',
    ringColor: 'ring-border/30',
  },
}

const sizeConfig = {
  sm: {
    container: 'w-6 h-6',
    icon: 'w-4 h-4',
    text: 'text-xs',
    gap: 'gap-1',
  },
  md: {
    container: 'w-8 h-8',
    icon: 'w-5 h-5',
    text: 'text-sm',
    gap: 'gap-1.5',
  },
  lg: {
    container: 'w-10 h-10',
    icon: 'w-6 h-6',
    text: 'text-base',
    gap: 'gap-2',
  },
}

export function CommitmentIndicator({
  status,
  size = 'md',
  showLabel = false,
  className,
}: CommitmentIndicatorProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]

  return (
    <div className={cn('flex items-center', sizes.gap, className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full ring-2',
          sizes.container,
          config.bgColor,
          config.textColor,
          config.ringColor
        )}
      >
        <div className={sizes.icon}>{config.icon}</div>
      </div>
      {showLabel && (
        <span className={cn('font-medium', sizes.text, config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  )
}

export default CommitmentIndicator
