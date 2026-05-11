import { cn } from '@/lib/utils'

interface PromiseStats {
  total: number
  pending: number
  done: number
  cancelled: number
}

interface PromiseStatusTrackerProps {
  stats: PromiseStats
  variant?: 'compact' | 'detailed'
  className?: string
}

export function PromiseStatusTracker({
  stats,
  variant = 'detailed',
  className,
}: PromiseStatusTrackerProps) {
  const completionRate = stats.total > 0
    ? Math.round((stats.done / stats.total) * 100)
    : 0

  const segments = [
    { key: 'done', value: stats.done, color: 'bg-success', label: 'Completed' },
    { key: 'pending', value: stats.pending, color: 'bg-warning', label: 'Pending' },
    { key: 'cancelled', value: stats.cancelled, color: 'bg-content-tertiary', label: 'Cancelled' },
  ]

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden flex">
          {segments.map((segment) => {
            const percentage = stats.total > 0 ? (segment.value / stats.total) * 100 : 0
            if (percentage === 0) return null
            return (
              <div
                key={segment.key}
                className={cn('h-full transition-all duration-300', segment.color)}
                style={{ width: `${percentage}%` }}
              />
            )
          })}
        </div>
        <span className="text-sm font-medium text-content-secondary whitespace-nowrap">
          {stats.done}/{stats.total}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('p-4 bg-surface-secondary rounded-2xl', className)}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-content-secondary uppercase tracking-wider">
          Promise Tracker
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-content-primary">{completionRate}%</span>
          <span className="text-xs text-content-tertiary">completion</span>
        </div>
      </div>

      <div className="h-3 bg-surface-tertiary rounded-full overflow-hidden flex mb-4">
        {segments.map((segment) => {
          const percentage = stats.total > 0 ? (segment.value / stats.total) * 100 : 0
          if (percentage === 0) return null
          return (
            <div
              key={segment.key}
              className={cn('h-full transition-all duration-500', segment.color)}
              style={{ width: `${percentage}%` }}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-content-tertiary">Done</span>
          </div>
          <span className="text-lg font-semibold text-success">{stats.done}</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-xs text-content-tertiary">Pending</span>
          </div>
          <span className="text-lg font-semibold text-warning">{stats.pending}</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-content-tertiary" />
            <span className="text-xs text-content-tertiary">Cancelled</span>
          </div>
          <span className="text-lg font-semibold text-content-tertiary">{stats.cancelled}</span>
        </div>
      </div>
    </div>
  )
}

export default PromiseStatusTracker
