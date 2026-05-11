import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { RelationshipPulseData } from '@/types/ai-insights'

interface RelationshipPulseProps {
  data: RelationshipPulseData
  userName: string
  partnerName: string
  onViewDetails?: () => void
  className?: string
}

export function RelationshipPulse({
  data,
  userName,
  partnerName,
  onViewDetails,
  className,
}: RelationshipPulseProps) {
  return (
    <div className={cn(
      'rounded-2xl overflow-hidden',
      'bg-gradient-to-br from-surface-secondary to-surface-tertiary',
      'border border-border-light',
      className
    )}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-light">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-content-primary">
                Partnership Pulse
              </h3>
              <p className="text-xs text-content-tertiary">
                {formatDate(data.periodStart, 'short')} - {formatDate(data.periodEnd, 'short')}
              </p>
            </div>
          </div>
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Details
            </button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px bg-border-light">
        <StatCell
          value={data.messageCount.user + data.messageCount.partner}
          label="Messages"
          icon="💬"
          trend={data.trends.communication}
        />
        <StatCell
          value={data.decisionsCompleted}
          label="Decisions"
          icon="✓"
          trend={data.trends.accountability}
        />
        <StatCell
          value={data.memoriesCreated}
          label="Memories"
          icon="💜"
          trend="stable"
        />
      </div>

      {/* Highlights */}
      <div className="px-5 py-4 space-y-3">
        {/* Emotional check-ins */}
        {data.emotionalCheckIns.count > 0 && (
          <HighlightRow
            icon="🫶"
            text={`${data.emotionalCheckIns.count} emotional check-ins this week`}
            positive
          />
        )}

        {/* Promises */}
        {data.promisesFulfilled > 0 && (
          <HighlightRow
            icon="🤝"
            text={`${data.promisesFulfilled} promises kept`}
            positive
          />
        )}

        {/* Pending items */}
        {data.pendingPromises > 0 && (
          <HighlightRow
            icon="⏳"
            text={`${data.pendingPromises} promise${data.pendingPromises > 1 ? 's' : ''} pending`}
            positive={false}
          />
        )}

        {/* Active decisions */}
        {data.activeDecisions > 0 && (
          <HighlightRow
            icon="📋"
            text={`${data.activeDecisions} active decision${data.activeDecisions > 1 ? 's' : ''} guiding you`}
            positive
          />
        )}
      </div>

      {/* Trend summary */}
      <div className="px-5 py-4 bg-surface-tertiary border-t border-border-light">
        <p className="text-sm text-content-secondary">
          <TrendBadge trend={data.trends.engagement} />
          <span className="ml-2">
            {getTrendMessage(data.trends)}
          </span>
        </p>
      </div>
    </div>
  )
}

interface StatCellProps {
  value: number
  label: string
  icon: string
  trend?: 'improving' | 'stable' | 'declining'
}

function StatCell({ value, label, icon, trend }: StatCellProps) {
  return (
    <div className="bg-surface-secondary px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-2xl font-bold text-content-primary">{value}</span>
        {trend && <TrendIndicator trend={trend} />}
      </div>
      <p className="text-xs text-content-tertiary">{label}</p>
    </div>
  )
}

interface HighlightRowProps {
  icon: string
  text: string
  positive: boolean
}

function HighlightRow({ icon, text, positive }: HighlightRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <span className={cn(
        'text-sm',
        positive ? 'text-content-primary' : 'text-content-secondary'
      )}>
        {text}
      </span>
    </div>
  )
}

function TrendIndicator({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  if (trend === 'improving') {
    return (
      <svg className="w-4 h-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    )
  }
  if (trend === 'declining') {
    return (
      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function TrendBadge({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  const config = {
    improving: { label: 'Growing', className: 'bg-success-100 text-success-700' },
    stable: { label: 'Steady', className: 'bg-blue-100 text-blue-700' },
    declining: { label: 'Needs love', className: 'bg-amber-100 text-amber-700' },
  }

  const c = config[trend]

  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', c.className)}>
      {c.label}
    </span>
  )
}

function getTrendMessage(trends: RelationshipPulseData['trends']): string {
  const positiveCount = [
    trends.communication === 'improving',
    trends.engagement === 'improving',
    trends.accountability === 'improving',
  ].filter(Boolean).length

  if (positiveCount >= 2) {
    return "Your partnership is thriving! Keep up the great teamwork."
  }
  if (positiveCount === 1) {
    return "You're doing well. Small moments of connection add up."
  }
  if (trends.communication === 'declining' && trends.engagement === 'declining') {
    return "Life gets busy. Maybe a quick check-in could help reconnect?"
  }
  return "Every relationship has its rhythms. You've got this."
}

// Compact widget version
interface RelationshipPulseWidgetProps {
  data: RelationshipPulseData
  onClick?: () => void
  className?: string
}

export function RelationshipPulseWidget({
  data,
  onClick,
  className,
}: RelationshipPulseWidgetProps) {
  const overallTrend = getOverallTrend(data.trends)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl',
        'bg-gradient-to-r from-primary-50 to-primary-100/50',
        'border border-primary-200',
        'hover:border-primary-300 hover:shadow-sm',
        'transition-all text-left',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <span className="text-xl">💜</span>
          </div>
          <div>
            <p className="font-medium text-content-primary">Partnership Pulse</p>
            <p className="text-sm text-content-secondary">
              {data.messageCount.user + data.messageCount.partner} messages this week
            </p>
          </div>
        </div>
        <TrendBadge trend={overallTrend} />
      </div>
    </button>
  )
}

function getOverallTrend(trends: RelationshipPulseData['trends']): 'improving' | 'stable' | 'declining' {
  const scores = {
    improving: 1,
    stable: 0,
    declining: -1,
  }

  const total = scores[trends.communication] + scores[trends.engagement] + scores[trends.accountability]

  if (total > 0) return 'improving'
  if (total < 0) return 'declining'
  return 'stable'
}

export default RelationshipPulse
