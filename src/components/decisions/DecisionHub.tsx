import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DecisionListView } from './DecisionListView'
import { DecisionTimelineView } from './DecisionTimelineView'
import { DecisionStatsBar } from './DecisionStatsBar'
import { DecisionSearchBar } from './DecisionSearchBar'
import { DecisionEmptyState } from './DecisionEmptyState'
import type { DecisionWithMeta, DecisionFilters, DecisionSort, DecisionStats } from '@/types/decisions'

type ViewMode = 'list' | 'timeline'

interface DecisionHubProps {
  decisions: DecisionWithMeta[]
  stats: DecisionStats
  currentUserId: string
  partnerName?: string
  onCreateDecision: () => void
  onViewDecision: (id: string) => void
  onEditDecision: (id: string) => void
  onConfirmDecision: (id: string) => void
  className?: string
}

export function DecisionHub({
  decisions,
  stats,
  currentUserId,
  partnerName = 'Partner',
  onCreateDecision,
  onViewDecision,
  onEditDecision,
  onConfirmDecision,
  className,
}: DecisionHubProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filters, setFilters] = useState<DecisionFilters>({
    status: 'all',
    category: 'all',
    createdBy: 'all',
    timeRange: 'all',
    search: '',
  })
  const [sort, setSort] = useState<DecisionSort>({
    field: 'updatedAt',
    direction: 'desc',
  })

  const filteredDecisions = filterDecisions(decisions, filters)
  const sortedDecisions = sortDecisions(filteredDecisions, sort)

  const pendingConfirmations = decisions.filter(
    d => d.status === 'proposed' && !d.confirmations[currentUserId]?.confirmedAt
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-5 border-b border-border-light bg-surface-secondary">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-content-primary tracking-tight">
              Decisions
            </h1>
            <p className="text-sm text-content-secondary mt-0.5">
              Shared agreements between you and {partnerName}
            </p>
          </div>

          <button
            onClick={onCreateDecision}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5',
              'bg-primary-500 text-white rounded-xl',
              'font-medium text-sm',
              'hover:bg-primary-600 active:bg-primary-700',
              'shadow-sm hover:shadow-md hover:shadow-primary/20',
              'transition-all duration-200'
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Decision
          </button>
        </div>

        {/* Pending confirmations alert */}
        {pendingConfirmations.length > 0 && (
          <div className={cn(
            'flex items-center gap-3 p-3 mb-4',
            'bg-warning-50 border border-warning-200 rounded-xl'
          )}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warning-800">
                {pendingConfirmations.length} decision{pendingConfirmations.length > 1 ? 's' : ''} awaiting your confirmation
              </p>
            </div>
            <button
              onClick={() => setFilters(f => ({ ...f, status: 'proposed' }))}
              className="text-sm font-medium text-warning-700 hover:text-warning-900"
            >
              Review
            </button>
          </div>
        )}

        {/* Stats bar */}
        <DecisionStatsBar stats={stats} className="mb-4" />

        {/* Search and filters */}
        <div className="flex items-center gap-3">
          <DecisionSearchBar
            value={filters.search}
            onChange={(search) => setFilters(f => ({ ...f, search }))}
            className="flex-1"
          />

          {/* View toggle */}
          <div className="flex items-center p-1 bg-surface-tertiary rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'list'
                  ? 'bg-surface-secondary text-content-primary shadow-sm'
                  : 'text-content-tertiary hover:text-content-secondary'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'timeline'
                  ? 'bg-surface-secondary text-content-primary shadow-sm'
                  : 'text-content-tertiary hover:text-content-secondary'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Filter pills */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-border-light bg-surface-primary overflow-x-auto">
        <div className="flex items-center gap-2">
          <FilterPill
            label="All"
            active={filters.status === 'all'}
            onClick={() => setFilters(f => ({ ...f, status: 'all' }))}
          />
          <FilterPill
            label="Active"
            count={stats.active}
            active={filters.status === 'active'}
            onClick={() => setFilters(f => ({ ...f, status: 'active' }))}
            color="primary"
          />
          <FilterPill
            label="Proposed"
            count={stats.proposed}
            active={filters.status === 'proposed'}
            onClick={() => setFilters(f => ({ ...f, status: 'proposed' }))}
            color="warning"
          />
          <FilterPill
            label="Changed"
            count={stats.changed}
            active={filters.status === 'changed'}
            onClick={() => setFilters(f => ({ ...f, status: 'changed' }))}
            color="info"
          />
          <FilterPill
            label="Completed"
            count={stats.completed}
            active={filters.status === 'completed'}
            onClick={() => setFilters(f => ({ ...f, status: 'completed' }))}
            color="success"
          />
          <FilterPill
            label="Cancelled"
            count={stats.cancelled}
            active={filters.status === 'cancelled'}
            onClick={() => setFilters(f => ({ ...f, status: 'cancelled' }))}
            color="neutral"
          />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {sortedDecisions.length === 0 ? (
          <DecisionEmptyState
            hasFilters={filters.status !== 'all' || filters.search !== ''}
            onCreateDecision={onCreateDecision}
            onClearFilters={() => setFilters({
              status: 'all',
              category: 'all',
              createdBy: 'all',
              timeRange: 'all',
              search: '',
            })}
          />
        ) : viewMode === 'list' ? (
          <DecisionListView
            decisions={sortedDecisions}
            currentUserId={currentUserId}
            onView={onViewDecision}
            onEdit={onEditDecision}
            onConfirm={onConfirmDecision}
          />
        ) : (
          <DecisionTimelineView
            decisions={sortedDecisions}
            currentUserId={currentUserId}
            onView={onViewDecision}
          />
        )}
      </main>
    </div>
  )
}

// Filter pill component
interface FilterPillProps {
  label: string
  count?: number
  active: boolean
  onClick: () => void
  color?: 'primary' | 'success' | 'warning' | 'info' | 'neutral'
}

function FilterPill({ label, count, active, onClick, color }: FilterPillProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    success: 'bg-success-50 text-success-700 border-success-200',
    warning: 'bg-warning-50 text-warning-700 border-warning-200',
    info: 'bg-info-50 text-info-700 border-info-200',
    neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'text-sm font-medium whitespace-nowrap',
        'border transition-all duration-200',
        active
          ? color
            ? colorClasses[color]
            : 'bg-primary-50 text-primary-700 border-primary-200'
          : 'bg-surface-secondary text-content-secondary border-border-light hover:border-border'
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          'px-1.5 py-0.5 text-xs rounded-full',
          active
            ? 'bg-white/50'
            : 'bg-surface-tertiary'
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

// Helper functions
function filterDecisions(decisions: DecisionWithMeta[], filters: DecisionFilters): DecisionWithMeta[] {
  return decisions.filter(d => {
    if (filters.status !== 'all' && d.status !== filters.status) return false
    if (filters.category !== 'all' && d.category !== filters.category) return false
    if (filters.createdBy !== 'all' && d.createdBy !== filters.createdBy) return false
    if (filters.search) {
      const search = filters.search.toLowerCase()
      if (!d.title.toLowerCase().includes(search) &&
          !d.decision.toLowerCase().includes(search) &&
          !(d.reason?.toLowerCase().includes(search))) {
        return false
      }
    }
    return true
  })
}

function sortDecisions(decisions: DecisionWithMeta[], sort: DecisionSort): DecisionWithMeta[] {
  return [...decisions].sort((a, b) => {
    let comparison = 0
    switch (sort.field) {
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      case 'createdAt':
        comparison = a.createdAt.toMillis() - b.createdAt.toMillis()
        break
      case 'updatedAt':
      default:
        comparison = a.updatedAt.toMillis() - b.updatedAt.toMillis()
    }
    return sort.direction === 'asc' ? comparison : -comparison
  })
}

export default DecisionHub
