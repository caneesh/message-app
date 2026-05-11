import { cn } from '@/lib/utils'
import type { DecisionStats } from '@/types/decisions'

interface DecisionStatsBarProps {
  stats: DecisionStats
  className?: string
}

export function DecisionStatsBar({ stats, className }: DecisionStatsBarProps) {
  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0

  return (
    <div className={cn('flex items-stretch gap-3', className)}>
      {/* Main stat */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3',
        'bg-gradient-to-r from-primary-50 to-primary-100/50',
        'rounded-xl border border-primary-100'
      )}>
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-primary-700">{stats.active}</p>
          <p className="text-xs font-medium text-primary-600">Active Decisions</p>
        </div>
      </div>

      {/* Secondary stats */}
      <div className={cn(
        'flex-1 grid grid-cols-4 gap-px',
        'bg-border-light rounded-xl overflow-hidden'
      )}>
        <StatCell
          value={stats.proposed}
          label="Pending"
          color="warning"
        />
        <StatCell
          value={stats.changed}
          label="Changed"
          color="info"
        />
        <StatCell
          value={stats.completed}
          label="Completed"
          color="success"
        />
        <StatCell
          value={`${completionRate}%`}
          label="Success Rate"
          color="neutral"
        />
      </div>
    </div>
  )
}

interface StatCellProps {
  value: number | string
  label: string
  color: 'primary' | 'success' | 'warning' | 'info' | 'neutral'
}

function StatCell({ value, label, color }: StatCellProps) {
  const colorClasses = {
    primary: 'text-primary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    info: 'text-info-600',
    neutral: 'text-content-primary',
  }

  return (
    <div className="bg-surface-secondary px-3 py-2.5 text-center">
      <p className={cn('text-lg font-semibold', colorClasses[color])}>
        {value}
      </p>
      <p className="text-xs text-content-tertiary">{label}</p>
    </div>
  )
}

export default DecisionStatsBar
