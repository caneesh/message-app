import { cn } from '@/lib/utils'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { Avatar, AvatarGroup } from '@/components/ui'
import type { DecisionWithMeta, DecisionStatus } from '@/types/decisions'

interface DecisionListViewProps {
  decisions: DecisionWithMeta[]
  currentUserId: string
  onView: (id: string) => void
  onEdit: (id: string) => void
  onConfirm: (id: string) => void
}

export function DecisionListView({
  decisions,
  currentUserId,
  onView,
  onEdit,
  onConfirm,
}: DecisionListViewProps) {
  return (
    <div className="p-6 space-y-3">
      {decisions.map((decision) => (
        <DecisionListCard
          key={decision.id}
          decision={decision}
          currentUserId={currentUserId}
          onView={() => onView(decision.id)}
          onEdit={() => onEdit(decision.id)}
          onConfirm={() => onConfirm(decision.id)}
        />
      ))}
    </div>
  )
}

interface DecisionListCardProps {
  decision: DecisionWithMeta
  currentUserId: string
  onView: () => void
  onEdit: () => void
  onConfirm: () => void
}

function DecisionListCard({
  decision,
  currentUserId,
  onView,
  onEdit,
  onConfirm,
}: DecisionListCardProps) {
  const needsMyConfirmation =
    decision.status === 'proposed' &&
    decision.myConfirmation?.status !== 'confirmed'

  const isOwn = decision.createdBy === currentUserId

  return (
    <article
      onClick={onView}
      className={cn(
        'group relative',
        'bg-surface-secondary rounded-2xl',
        'border border-border-light',
        'p-5 cursor-pointer',
        'transition-all duration-200',
        'hover:border-border hover:shadow-md',
        decision.status === 'cancelled' && 'opacity-60'
      )}
    >
      {/* Status indicator line */}
      <div
        className={cn(
          'absolute left-0 top-4 bottom-4 w-1 rounded-r-full',
          statusLineColors[decision.status]
        )}
      />

      <div className="pl-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={decision.status} />
              {decision.changeCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-50 text-info-700 text-xs font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {decision.changeCount} revision{decision.changeCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-content-primary leading-snug">
              {decision.title}
            </h3>
          </div>

          {/* Confirmation status */}
          <div className="flex-shrink-0">
            <ConfirmationIndicator
              myStatus={decision.myConfirmation?.status}
              partnerStatus={decision.partnerConfirmation?.status}
            />
          </div>
        </div>

        {/* Decision content */}
        <div className={cn(
          'p-4 rounded-xl mb-4',
          'bg-gradient-to-br from-surface-tertiary to-surface-primary',
          'border border-border-light'
        )}>
          <p className="text-base text-content-primary leading-relaxed">
            "{decision.decision}"
          </p>
        </div>

        {/* Reason */}
        {decision.reason && (
          <div className="flex items-start gap-2 mb-4 text-sm">
            <span className="text-content-tertiary font-medium">Why:</span>
            <span className="text-content-secondary">{decision.reason}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border-light">
          <div className="flex items-center gap-4 text-sm text-content-tertiary">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {isOwn ? 'You' : 'Partner'}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatRelativeTime(decision.updatedAt)}
            </span>
            {decision.linkedConversations.length > 0 && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {decision.linkedConversations.length} linked
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {needsMyConfirmation && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm()
                }}
                className={cn(
                  'px-4 py-2 rounded-lg',
                  'bg-primary-500 text-white text-sm font-medium',
                  'hover:bg-primary-600 active:bg-primary-700',
                  'transition-colors'
                )}
              >
                Confirm
              </button>
            )}
            {decision.status === 'active' && isOwn && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className={cn(
                  'px-3 py-2 rounded-lg',
                  'bg-surface-tertiary text-content-secondary text-sm font-medium',
                  'hover:bg-surface-sunken hover:text-content-primary',
                  'transition-colors'
                )}
              >
                Edit
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onView()
              }}
              className={cn(
                'p-2 rounded-lg',
                'text-content-tertiary',
                'hover:bg-surface-tertiary hover:text-content-primary',
                'transition-colors'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

// Status badge component
function StatusBadge({ status }: { status: DecisionStatus }) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-xs font-semibold uppercase tracking-wide',
        config.className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

// Confirmation indicator (two circles)
function ConfirmationIndicator({
  myStatus,
  partnerStatus,
}: {
  myStatus?: string
  partnerStatus?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center',
          'text-xs font-medium',
          myStatus === 'confirmed'
            ? 'bg-success-100 text-success-600'
            : myStatus === 'disputed'
            ? 'bg-danger-100 text-danger-600'
            : 'bg-neutral-100 text-neutral-400'
        )}
        title={myStatus === 'confirmed' ? 'You confirmed' : 'Your confirmation pending'}
      >
        {myStatus === 'confirmed' ? '✓' : myStatus === 'disputed' ? '!' : '?'}
      </div>
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center',
          'text-xs font-medium',
          partnerStatus === 'confirmed'
            ? 'bg-success-100 text-success-600'
            : partnerStatus === 'disputed'
            ? 'bg-danger-100 text-danger-600'
            : 'bg-neutral-100 text-neutral-400'
        )}
        title={partnerStatus === 'confirmed' ? 'Partner confirmed' : 'Partner confirmation pending'}
      >
        {partnerStatus === 'confirmed' ? '✓' : partnerStatus === 'disputed' ? '!' : '?'}
      </div>
    </div>
  )
}

// Status configurations
const statusConfig: Record<DecisionStatus, { label: string; icon: JSX.Element; className: string }> = {
  draft: {
    label: 'Draft',
    icon: <span className="w-1.5 h-1.5 rounded-full bg-current" />,
    className: 'bg-neutral-100 text-neutral-600',
  },
  proposed: {
    label: 'Proposed',
    icon: <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />,
    className: 'bg-warning-50 text-warning-700',
  },
  active: {
    label: 'Active',
    icon: <span className="w-1.5 h-1.5 rounded-full bg-current" />,
    className: 'bg-primary-50 text-primary-700',
  },
  changed: {
    label: 'Changed',
    icon: <span className="w-1.5 h-1.5 rounded-full bg-current" />,
    className: 'bg-info-50 text-info-700',
  },
  completed: {
    label: 'Completed',
    icon: <span className="w-1.5 h-1.5 rounded-full bg-current" />,
    className: 'bg-success-50 text-success-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <span className="w-1.5 h-1.5 rounded-full bg-current" />,
    className: 'bg-neutral-100 text-neutral-500',
  },
}

const statusLineColors: Record<DecisionStatus, string> = {
  draft: 'bg-neutral-300',
  proposed: 'bg-warning-400',
  active: 'bg-primary-500',
  changed: 'bg-info-500',
  completed: 'bg-success-500',
  cancelled: 'bg-neutral-300',
}

export default DecisionListView
