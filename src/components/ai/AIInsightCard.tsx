import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import type { AIInsight, AIInsightType } from '@/types/ai-insights'

interface AIInsightCardProps {
  insight: AIInsight
  onAccept?: () => void
  onDismiss?: () => void
  onViewDetails?: () => void
  className?: string
  compact?: boolean
}

export function AIInsightCard({
  insight,
  onAccept,
  onDismiss,
  onViewDetails,
  className,
  compact = false,
}: AIInsightCardProps) {
  const [isExiting, setIsExiting] = useState(false)

  const config = insightConfig[insight.type]

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss?.(), 200)
  }

  const handleAccept = () => {
    setIsExiting(true)
    setTimeout(() => onAccept?.(), 200)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'rounded-2xl border',
        'transition-all duration-200',
        isExiting && 'opacity-0 scale-95',
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      {/* Accent stripe */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', config.accentColor)} />

      <div className={cn('p-4', compact ? 'py-3' : 'py-4')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg',
              'flex items-center justify-center',
              config.iconBg
            )}>
              {config.icon}
            </div>
            <div>
              <span className={cn('text-xs font-medium uppercase tracking-wider', config.labelColor)}>
                {config.label}
              </span>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 p-1.5 rounded-lg',
              'text-content-tertiary hover:text-content-secondary',
              'hover:bg-surface-tertiary',
              'transition-colors'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="pl-10">
          <p className={cn(
            'font-medium text-content-primary',
            compact ? 'text-sm' : 'text-base'
          )}>
            {insight.title}
          </p>
          <p className={cn(
            'text-content-secondary mt-1',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {insight.message}
          </p>

          {insight.context && !compact && (
            <div className={cn(
              'mt-3 p-3 rounded-lg',
              'bg-surface-tertiary/50',
              'border border-border-light'
            )}>
              <p className="text-sm text-content-secondary italic">
                "{insight.context}"
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {(onAccept || onViewDetails) && (
          <div className="flex items-center gap-2 mt-4 pl-10">
            {onAccept && (
              <button
                onClick={handleAccept}
                className={cn(
                  'px-4 py-2 rounded-lg',
                  'text-sm font-medium',
                  'transition-colors',
                  config.primaryButtonBg,
                  config.primaryButtonText
                )}
              >
                {config.acceptLabel}
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className={cn(
                  'px-4 py-2 rounded-lg',
                  'text-sm font-medium',
                  'text-content-secondary',
                  'hover:bg-surface-tertiary',
                  'transition-colors'
                )}
              >
                View details
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const insightConfig: Record<AIInsightType, {
  label: string
  icon: JSX.Element
  iconBg: string
  bgColor: string
  borderColor: string
  accentColor: string
  labelColor: string
  acceptLabel: string
  primaryButtonBg: string
  primaryButtonText: string
}> = {
  agreement_reminder: {
    label: 'Agreement',
    icon: (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    iconBg: 'bg-primary-100',
    bgColor: 'bg-primary-50/50',
    borderColor: 'border-primary-100',
    accentColor: 'bg-primary-500',
    labelColor: 'text-primary-600',
    acceptLabel: 'Got it',
    primaryButtonBg: 'bg-primary-500 hover:bg-primary-600',
    primaryButtonText: 'text-white',
  },
  memory_resurface: {
    label: 'Memory',
    icon: (
      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    iconBg: 'bg-amber-100',
    bgColor: 'bg-amber-50/50',
    borderColor: 'border-amber-100',
    accentColor: 'bg-amber-500',
    labelColor: 'text-amber-600',
    acceptLabel: 'View memory',
    primaryButtonBg: 'bg-amber-500 hover:bg-amber-600',
    primaryButtonText: 'text-white',
  },
  conflict_signal: {
    label: 'To Revisit',
    icon: (
      <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    iconBg: 'bg-rose-100',
    bgColor: 'bg-rose-50/50',
    borderColor: 'border-rose-100',
    accentColor: 'bg-rose-400',
    labelColor: 'text-rose-600',
    acceptLabel: 'Revisit this',
    primaryButtonBg: 'bg-rose-500 hover:bg-rose-600',
    primaryButtonText: 'text-white',
  },
  promise_nudge: {
    label: 'Promise',
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-blue-100',
    bgColor: 'bg-blue-50/50',
    borderColor: 'border-blue-100',
    accentColor: 'bg-blue-500',
    labelColor: 'text-blue-600',
    acceptLabel: 'Mark done',
    primaryButtonBg: 'bg-blue-500 hover:bg-blue-600',
    primaryButtonText: 'text-white',
  },
  coordination_tip: {
    label: 'Quick Action',
    icon: (
      <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    iconBg: 'bg-teal-100',
    bgColor: 'bg-teal-50/50',
    borderColor: 'border-teal-100',
    accentColor: 'bg-teal-500',
    labelColor: 'text-teal-600',
    acceptLabel: 'Do this',
    primaryButtonBg: 'bg-teal-500 hover:bg-teal-600',
    primaryButtonText: 'text-white',
  },
  emotional_clarity: {
    label: 'Tone',
    icon: (
      <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-violet-100',
    bgColor: 'bg-violet-50/50',
    borderColor: 'border-violet-100',
    accentColor: 'bg-violet-500',
    labelColor: 'text-violet-600',
    acceptLabel: 'Use suggestion',
    primaryButtonBg: 'bg-violet-500 hover:bg-violet-600',
    primaryButtonText: 'text-white',
  },
  workload_awareness: {
    label: 'Teamwork',
    icon: (
      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    iconBg: 'bg-emerald-100',
    bgColor: 'bg-emerald-50/50',
    borderColor: 'border-emerald-100',
    accentColor: 'bg-emerald-500',
    labelColor: 'text-emerald-600',
    acceptLabel: 'View details',
    primaryButtonBg: 'bg-emerald-500 hover:bg-emerald-600',
    primaryButtonText: 'text-white',
  },
}

export default AIInsightCard
