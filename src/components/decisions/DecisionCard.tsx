import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, StatusBadge, IconButton, Avatar, AvatarGroup } from '@/components/ui'
import type { Decision } from '@/types'

interface DecisionCardProps {
  decision: Decision
  currentUserId: string
  participants?: { uid: string; name?: string }[]
  changeCount?: number
  onEdit?: () => void
  onDelete?: () => void
  onViewHistory?: () => void
  className?: string
}

export function DecisionCard({
  decision,
  currentUserId,
  participants = [],
  changeCount = 0,
  onEdit,
  onDelete,
  onViewHistory,
  className,
}: DecisionCardProps) {
  const isOwn = decision.createdBy === currentUserId

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        decision.status === 'cancelled' && 'opacity-60',
        className
      )}
      hoverable
    >
      <CardContent>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-content-primary truncate">
              {decision.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={decision.status} />
              <span className="text-xs text-content-tertiary">
                {formatDate(decision.createdAt)}
              </span>
            </div>
          </div>

          {participants.length > 0 && (
            <AvatarGroup max={3}>
              {participants.map((p) => (
                <Avatar key={p.uid} fallback={p.name || 'U'} size="sm" />
              ))}
            </AvatarGroup>
          )}
        </div>

        <div className="p-4 bg-surface-tertiary rounded-xl mb-3">
          <p className="text-base text-content-primary leading-relaxed">
            {decision.decision}
          </p>
        </div>

        {decision.reason && (
          <div className="mb-3">
            <span className="text-sm font-medium text-content-secondary">Why: </span>
            <span className="text-sm text-content-secondary">{decision.reason}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border-light">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  'bg-surface-tertiary text-content-primary',
                  'border border-border',
                  'hover:border-accent hover:text-accent',
                  'transition-all duration-200'
                )}
              >
                Edit
              </button>
            )}
            {changeCount > 0 && onViewHistory && (
              <button
                onClick={onViewHistory}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  'bg-info-light text-info',
                  'hover:bg-info hover:text-white',
                  'transition-all duration-200'
                )}
              >
                History ({changeCount})
              </button>
            )}
          </div>

          {onDelete && (
            <IconButton
              variant="danger"
              size="sm"
              label="Delete"
              onClick={onDelete}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconButton>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ParticipantRowProps {
  participants: { uid: string; name?: string; role?: string }[]
  currentUserId: string
}

export function ParticipantRow({ participants, currentUserId }: ParticipantRowProps) {
  return (
    <div className="flex items-center gap-3">
      {participants.map((p) => (
        <div key={p.uid} className="flex items-center gap-2">
          <Avatar fallback={p.name || 'U'} size="sm" />
          <div>
            <span className="text-sm font-medium text-content-primary">
              {p.uid === currentUserId ? 'You' : p.name || 'Friend'}
            </span>
            {p.role && (
              <span className="text-xs text-content-tertiary ml-1">({p.role})</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default DecisionCard
