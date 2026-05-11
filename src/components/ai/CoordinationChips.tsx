import { cn } from '@/lib/utils'
import type { CoordinationTip } from '@/types/ai-insights'

interface CoordinationChipsProps {
  insights: CoordinationTip[]
  onAction: (insight: CoordinationTip) => void
  onDismiss: (id: string) => void
  className?: string
}

export function CoordinationChips({
  insights,
  onAction,
  onDismiss,
  className,
}: CoordinationChipsProps) {
  if (insights.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {insights.map((insight) => (
        <CoordinationChip
          key={insight.id}
          insight={insight}
          onAction={() => onAction(insight)}
          onDismiss={() => onDismiss(insight.id)}
        />
      ))}
    </div>
  )
}

interface CoordinationChipProps {
  insight: CoordinationTip
  onAction: () => void
  onDismiss: () => void
}

function CoordinationChip({ insight, onAction, onDismiss }: CoordinationChipProps) {
  const { actionType, extractedData } = insight.metadata

  const config = actionConfig[actionType]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        'pl-3 pr-1 py-1.5 rounded-full',
        'bg-surface-tertiary border border-border-light',
        'hover:border-border hover:shadow-sm',
        'transition-all group'
      )}
    >
      {/* Icon */}
      <span className={cn('text-sm', config.iconColor)}>
        {config.icon}
      </span>

      {/* Label */}
      <button
        onClick={onAction}
        className="text-sm font-medium text-content-primary hover:text-primary-600 transition-colors"
      >
        {config.label}
        {extractedData.title && (
          <span className="text-content-secondary font-normal ml-1">
            "{extractedData.title}"
          </span>
        )}
      </button>

      {/* Dismiss */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        className={cn(
          'p-1 rounded-full',
          'text-content-tertiary hover:text-content-secondary',
          'hover:bg-surface-sunken',
          'opacity-0 group-hover:opacity-100',
          'transition-all'
        )}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

const actionConfig: Record<CoordinationTip['metadata']['actionType'], {
  label: string
  icon: string
  iconColor: string
}> = {
  add_to_calendar: {
    label: 'Add to calendar',
    icon: '📅',
    iconColor: 'text-blue-500',
  },
  create_reminder: {
    label: 'Create reminder',
    icon: '⏰',
    iconColor: 'text-amber-500',
  },
  save_to_vault: {
    label: 'Save to vault',
    icon: '🔒',
    iconColor: 'text-purple-500',
  },
  create_list: {
    label: 'Create list',
    icon: '📝',
    iconColor: 'text-teal-500',
  },
}

// Standalone chip for single actions
interface QuickActionChipProps {
  icon: string
  label: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'success'
  className?: string
}

export function QuickActionChip({
  icon,
  label,
  onClick,
  variant = 'default',
  className,
}: QuickActionChipProps) {
  const variantClasses = {
    default: 'bg-surface-tertiary border-border-light hover:border-border text-content-primary',
    primary: 'bg-primary-50 border-primary-200 hover:border-primary-300 text-primary-700',
    success: 'bg-success-50 border-success-200 hover:border-success-300 text-success-700',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-3 py-1.5 rounded-full',
        'border',
        'text-sm font-medium',
        'hover:shadow-sm',
        'transition-all',
        variantClasses[variant],
        className
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default CoordinationChips
