import { cn } from '@/lib/utils'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { DecisionWithMeta, DecisionStatus } from '@/types/decisions'

interface DecisionTimelineViewProps {
  decisions: DecisionWithMeta[]
  currentUserId: string
  onView: (id: string) => void
}

export function DecisionTimelineView({
  decisions,
  currentUserId,
  onView,
}: DecisionTimelineViewProps) {
  // Group decisions by month
  const groupedByMonth = groupByMonth(decisions)

  return (
    <div className="p-6">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-200 via-border-light to-transparent" />

        {/* Month groups */}
        {Object.entries(groupedByMonth).map(([monthKey, monthDecisions]) => (
          <div key={monthKey} className="mb-8 last:mb-0">
            {/* Month header */}
            <div className="relative flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 border-4 border-surface-secondary flex items-center justify-center z-10">
                <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-content-primary">
                {monthKey}
              </h3>
            </div>

            {/* Decisions in this month */}
            <div className="ml-5 pl-9 space-y-4 border-l-2 border-border-light">
              {monthDecisions.map((decision) => (
                <TimelineCard
                  key={decision.id}
                  decision={decision}
                  currentUserId={currentUserId}
                  onClick={() => onView(decision.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TimelineCardProps {
  decision: DecisionWithMeta
  currentUserId: string
  onClick: () => void
}

function TimelineCard({ decision, currentUserId, onClick }: TimelineCardProps) {
  const isOwn = decision.createdBy === currentUserId

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group cursor-pointer',
        'bg-surface-secondary rounded-xl',
        'border border-border-light',
        'p-4',
        'transition-all duration-200',
        'hover:border-border hover:shadow-sm',
        decision.status === 'cancelled' && 'opacity-60'
      )}
    >
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute -left-[calc(2.25rem+1px)] top-5',
          'w-3 h-3 rounded-full border-2 border-surface-secondary',
          timelineDotColors[decision.status]
        )}
      />

      {/* Date badge */}
      <div className="absolute -left-[5.5rem] top-4 w-16 text-right">
        <span className="text-xs font-medium text-content-tertiary">
          {formatDate(decision.createdAt, 'short')}
        </span>
      </div>

      {/* Content */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            statusIconBg[decision.status]
          )}
        >
          {statusIcons[decision.status]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              statusBadgeColors[decision.status]
            )}>
              {statusLabels[decision.status]}
            </span>
            {decision.changeCount > 0 && (
              <span className="text-xs text-content-tertiary">
                · {decision.changeCount} change{decision.changeCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <h4 className="text-base font-medium text-content-primary mb-1 line-clamp-1">
            {decision.title}
          </h4>

          <p className="text-sm text-content-secondary line-clamp-2">
            {decision.decision}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-content-tertiary">
            <span>{isOwn ? 'You' : 'Partner'}</span>
            <span>·</span>
            <span>{formatRelativeTime(decision.updatedAt)}</span>
            {decision.isFullyConfirmed && (
              <>
                <span>·</span>
                <span className="text-success-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Both confirmed
                </span>
              </>
            )}
          </div>
        </div>

        <svg
          className="w-5 h-5 text-content-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

// Helper function to group by month
function groupByMonth(decisions: DecisionWithMeta[]): Record<string, DecisionWithMeta[]> {
  const groups: Record<string, DecisionWithMeta[]> = {}

  decisions.forEach((decision) => {
    const date = decision.createdAt.toDate()
    const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    if (!groups[monthKey]) {
      groups[monthKey] = []
    }
    groups[monthKey].push(decision)
  })

  return groups
}

const statusLabels: Record<DecisionStatus, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  active: 'Active',
  changed: 'Changed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const timelineDotColors: Record<DecisionStatus, string> = {
  draft: 'bg-neutral-300',
  proposed: 'bg-warning-400',
  active: 'bg-primary-500',
  changed: 'bg-info-500',
  completed: 'bg-success-500',
  cancelled: 'bg-neutral-300',
}

const statusIconBg: Record<DecisionStatus, string> = {
  draft: 'bg-neutral-100',
  proposed: 'bg-warning-50',
  active: 'bg-primary-50',
  changed: 'bg-info-50',
  completed: 'bg-success-50',
  cancelled: 'bg-neutral-100',
}

const statusBadgeColors: Record<DecisionStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  proposed: 'bg-warning-50 text-warning-700',
  active: 'bg-primary-50 text-primary-700',
  changed: 'bg-info-50 text-info-700',
  completed: 'bg-success-50 text-success-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
}

const statusIcons: Record<DecisionStatus, JSX.Element> = {
  draft: (
    <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  proposed: (
    <svg className="w-4 h-4 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  active: (
    <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  changed: (
    <svg className="w-4 h-4 text-info-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  completed: (
    <svg className="w-4 h-4 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  cancelled: (
    <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

export default DecisionTimelineView
