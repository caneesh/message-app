import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import type { PromiseDetection } from '@/types/ai-insights'

interface PromiseNudgeCardProps {
  insight: PromiseDetection
  onMarkDone?: () => void
  onSendFollowUp?: () => void
  onDismiss?: () => void
  className?: string
}

export function PromiseNudgeCard({
  insight,
  onMarkDone,
  onSendFollowUp,
  onDismiss,
  className,
}: PromiseNudgeCardProps) {
  const { promiseText, daysPastDue, escalationLevel, suggestedFollowUp } = insight.metadata

  const escalationConfig = {
    1: { label: 'Gentle reminder', color: 'blue', urgent: false },
    2: { label: 'Friendly nudge', color: 'blue', urgent: false },
    3: { label: 'Time to follow up', color: 'amber', urgent: true },
    4: { label: 'Needs attention', color: 'amber', urgent: true },
  }

  const config = escalationConfig[escalationLevel]
  const isUrgent = config.urgent

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'rounded-2xl border',
        isUrgent
          ? 'bg-amber-50/50 border-amber-200'
          : 'bg-blue-50/50 border-blue-200',
        className
      )}
    >
      {/* Accent stripe */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1',
        isUrgent ? 'bg-amber-400' : 'bg-blue-400'
      )} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              isUrgent ? 'bg-amber-100' : 'bg-blue-100'
            )}>
              <svg
                className={cn('w-4 h-4', isUrgent ? 'text-amber-600' : 'text-blue-600')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                isUrgent ? 'text-amber-600' : 'text-blue-600'
              )}>
                {config.label}
              </span>
              {daysPastDue && daysPastDue > 0 && (
                <span className={cn(
                  'ml-2 text-xs',
                  isUrgent ? 'text-amber-500' : 'text-blue-500'
                )}>
                  {daysPastDue} day{daysPastDue > 1 ? 's' : ''} overdue
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onDismiss}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isUrgent
                ? 'text-amber-400 hover:text-amber-600 hover:bg-amber-100'
                : 'text-blue-400 hover:text-blue-600 hover:bg-blue-100'
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
            'font-medium mb-2',
            isUrgent ? 'text-amber-900' : 'text-blue-900'
          )}>
            {insight.title}
          </p>

          <div className={cn(
            'p-3 rounded-xl border',
            isUrgent
              ? 'bg-white/60 border-amber-100'
              : 'bg-white/60 border-blue-100'
          )}>
            <p className={cn(
              'text-sm',
              isUrgent ? 'text-amber-800' : 'text-blue-800'
            )}>
              "{promiseText}"
            </p>
          </div>

          {/* Suggested follow-up */}
          {suggestedFollowUp && escalationLevel >= 3 && (
            <div className={cn(
              'mt-3 p-3 rounded-xl',
              'bg-surface-tertiary border border-border-light'
            )}>
              <p className="text-xs font-medium text-content-tertiary mb-1">
                Suggested message:
              </p>
              <p className="text-sm text-content-secondary italic">
                "{suggestedFollowUp}"
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pl-10">
          <button
            onClick={onMarkDone}
            className={cn(
              'px-4 py-2 rounded-lg',
              'text-sm font-medium text-white',
              'transition-colors',
              isUrgent
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-blue-500 hover:bg-blue-600'
            )}
          >
            Mark done
          </button>
          {suggestedFollowUp && onSendFollowUp && (
            <button
              onClick={onSendFollowUp}
              className={cn(
                'px-4 py-2 rounded-lg',
                'text-sm font-medium',
                'transition-colors',
                isUrgent
                  ? 'text-amber-600 hover:bg-amber-100'
                  : 'text-blue-600 hover:bg-blue-100'
              )}
            >
              Send follow-up
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PromiseNudgeCard
