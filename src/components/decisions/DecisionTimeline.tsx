import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface ChangeRecord {
  id: string
  oldDecision: string
  newDecision: string
  reason?: string
  changedBy: string
  changedAt: any
}

interface DecisionTimelineProps {
  changes: ChangeRecord[]
  currentUserId: string
  className?: string
}

export function DecisionTimeline({
  changes,
  currentUserId,
  className,
}: DecisionTimelineProps) {
  if (changes.length === 0) {
    return (
      <div className="text-center py-6 text-content-tertiary">
        No changes recorded
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h4 className="text-sm font-semibold text-content-secondary uppercase tracking-wider">
        Change History
      </h4>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border-light" />

        {changes.map((change, index) => (
          <div key={change.id} className="relative pl-10 pb-6 last:pb-0">
            <div
              className={cn(
                'absolute left-2.5 w-3 h-3 rounded-full border-2 border-surface-secondary',
                index === 0 ? 'bg-accent' : 'bg-surface-tertiary'
              )}
            />

            <div className="bg-surface-tertiary rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-content-tertiary">
                <span>
                  {change.changedBy === currentUserId ? 'You' : 'Friend'}
                </span>
                <span>•</span>
                <span>{formatDate(change.changedAt)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-danger-light text-danger text-sm rounded-lg line-through">
                  {change.oldDecision.length > 100
                    ? change.oldDecision.slice(0, 100) + '...'
                    : change.oldDecision}
                </span>
                <svg className="w-4 h-4 text-content-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="px-2 py-1 bg-success-light text-success text-sm rounded-lg">
                  {change.newDecision.length > 100
                    ? change.newDecision.slice(0, 100) + '...'
                    : change.newDecision}
                </span>
              </div>

              {change.reason && (
                <p className="text-sm text-content-secondary">
                  <span className="font-medium">Reason:</span> {change.reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DecisionTimeline
