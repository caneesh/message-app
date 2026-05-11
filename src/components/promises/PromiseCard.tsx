import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, IconButton } from '@/components/ui'
import { CommitmentIndicator } from './CommitmentIndicator'
import type { Promise } from '@/types'

interface PromiseCardProps {
  promise: Promise
  currentUserId: string
  onMarkDone?: () => void
  onCancel?: () => void
  onDelete?: () => void
  className?: string
}

export function PromiseCard({
  promise,
  currentUserId,
  onMarkDone,
  onCancel,
  onDelete,
  className,
}: PromiseCardProps) {
  const isOwn = promise.ownerUid === currentUserId
  const isPending = promise.status === 'pending'
  const isDone = promise.status === 'done'
  const isCancelled = promise.status === 'cancelled'

  const statusColors = {
    pending: 'border-l-warning',
    done: 'border-l-success bg-success-light/30',
    cancelled: 'border-l-content-tertiary opacity-60',
  }

  return (
    <Card
      className={cn(
        'border-l-4 transition-all duration-200',
        statusColors[promise.status],
        className
      )}
    >
      <CardContent className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3
              className={cn(
                'text-base font-medium text-content-primary',
                isCancelled && 'line-through'
              )}
            >
              {promise.title}
            </h3>
            <CommitmentIndicator status={promise.status} size="sm" />
          </div>

          {promise.description && (
            <p className="text-sm text-content-secondary mb-2">
              {promise.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={cn(
                'font-medium',
                isOwn ? 'text-accent' : 'text-accent-secondary'
              )}
            >
              {isOwn ? 'You' : 'Friend'} promised
            </span>

            {promise.dueAt && (
              <span className="text-warning">
                Due: {formatDate(promise.dueAt)}
              </span>
            )}

            {isDone && promise.completedAt && (
              <span className="text-success">
                Completed: {formatDate(promise.completedAt)}
              </span>
            )}
          </div>

          {promise.sourceMessageTextPreview && (
            <div className="mt-2 px-3 py-2 bg-surface-tertiary rounded-lg border-l-2 border-border">
              <p className="text-sm text-content-tertiary italic">
                "{promise.sourceMessageTextPreview}"
              </p>
            </div>
          )}
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2">
            {onMarkDone && (
              <IconButton
                variant="accent"
                size="sm"
                label="Mark done"
                onClick={onMarkDone}
                className="bg-success-light text-success hover:bg-success hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </IconButton>
            )}
            {onCancel && (
              <IconButton
                variant="ghost"
                size="sm"
                label="Cancel"
                onClick={onCancel}
                className="bg-warning-light text-amber-700 hover:bg-warning hover:text-amber-900"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            )}
          </div>
        ) : (
          onDelete && (
            <IconButton
              variant="ghost"
              size="sm"
              label="Delete"
              onClick={onDelete}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconButton>
          )
        )}
      </CardContent>
    </Card>
  )
}

export default PromiseCard
