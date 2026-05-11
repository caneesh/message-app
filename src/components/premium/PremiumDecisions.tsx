import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type DecisionStatus = 'proposed' | 'active' | 'changed' | 'completed' | 'cancelled'

interface Decision {
  id: string
  title: string
  description: string
  status: DecisionStatus
  category: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  confirmedBy: string[]
  expiresAt?: Date
}

interface PremiumDecisionsProps {
  decisions: Decision[]
  currentUserId: string
  partnerName: string
  onCreateDecision: () => void
  onViewDecision: (id: string) => void
  onConfirmDecision: (id: string) => void
}

export function PremiumDecisions({
  decisions,
  currentUserId,
  partnerName,
  onCreateDecision,
  onViewDecision,
  onConfirmDecision,
}: PremiumDecisionsProps) {
  const [activeFilter, setActiveFilter] = useState<DecisionStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDecisions = decisions.filter((d) => {
    if (activeFilter !== 'all' && d.status !== activeFilter) return false
    if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pendingCount = decisions.filter(
    (d) => d.status === 'proposed' && !d.confirmedBy.includes(currentUserId)
  ).length

  const stats = {
    active: decisions.filter((d) => d.status === 'active').length,
    proposed: decisions.filter((d) => d.status === 'proposed').length,
    completed: decisions.filter((d) => d.status === 'completed').length,
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)]">
      {/* Header */}
      <header className={cn(
        'flex-shrink-0 px-8 py-6',
        'border-b border-[var(--border-subtle)]',
        'bg-[var(--bg-glass)] backdrop-blur-xl'
      )}>
        <div className="max-w-[1000px] mx-auto">
          {/* Title row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[24px] font-semibold text-[var(--text-primary)] tracking-tight">
                Decisions
              </h1>
              <p className="text-[14px] text-[var(--text-secondary)] mt-1">
                Shared agreements between you and {partnerName}
              </p>
            </div>

            <button
              onClick={onCreateDecision}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5',
                'bg-[var(--accent)] text-white rounded-xl',
                'text-[13px] font-medium',
                'hover:opacity-90 transition-opacity',
                'shadow-sm'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Decision
            </button>
          </div>

          {/* Pending alert */}
          {pendingCount > 0 && (
            <div className={cn(
              'flex items-center gap-3 p-4 mb-6',
              'bg-[var(--warning-subtle)] rounded-xl',
              'border border-[var(--warning-muted)]'
            )}>
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full',
                'bg-[var(--warning-muted)]',
                'flex items-center justify-center'
              )}>
                <svg className="w-4 h-4 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  {pendingCount} decision{pendingCount > 1 ? 's' : ''} awaiting your confirmation
                </p>
              </div>
              <button
                onClick={() => setActiveFilter('proposed')}
                className="text-[13px] font-medium text-[var(--warning)] hover:underline"
              >
                Review
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Active" value={stats.active} color="accent" />
            <StatCard label="Proposed" value={stats.proposed} color="warning" />
            <StatCard label="Completed" value={stats.completed} color="success" />
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className={cn(
              'flex-1 flex items-center gap-2 px-4 py-2.5',
              'bg-[var(--bg-primary)] rounded-xl',
              'border border-[var(--border-light)]'
            )}>
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search decisions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'flex-1 text-[13px]',
                  'bg-transparent',
                  'placeholder:text-[var(--text-muted)]',
                  'focus:outline-none'
                )}
              />
            </div>

            {/* Filter tabs */}
            <div className={cn(
              'flex items-center p-1',
              'bg-[var(--bg-secondary)] rounded-lg'
            )}>
              {(['all', 'active', 'proposed', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    'px-3 py-1.5 rounded-md',
                    'text-[12px] font-medium capitalize',
                    'transition-all duration-150',
                    activeFilter === filter
                      ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto py-6 px-8">
        <div className="max-w-[1000px] mx-auto">
          {filteredDecisions.length === 0 ? (
            <EmptyState
              hasFilters={activeFilter !== 'all' || searchQuery !== ''}
              onCreateDecision={onCreateDecision}
              onClearFilters={() => {
                setActiveFilter('all')
                setSearchQuery('')
              }}
            />
          ) : (
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {filteredDecisions.map((decision) => (
                  <motion.div
                    key={decision.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DecisionCard
                      decision={decision}
                      currentUserId={currentUserId}
                      partnerName={partnerName}
                      onView={() => onViewDecision(decision.id)}
                      onConfirm={() => onConfirmDecision(decision.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'accent' | 'warning' | 'success' }) {
  const colorClasses = {
    accent: 'text-[var(--accent)]',
    warning: 'text-[var(--warning)]',
    success: 'text-[var(--success)]',
  }

  return (
    <div className={cn(
      'p-4 rounded-xl',
      'bg-[var(--bg-primary)]',
      'border border-[var(--border-subtle)]'
    )}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className={cn('text-[28px] font-semibold mt-1', colorClasses[color])}>
        {value}
      </p>
    </div>
  )
}

interface DecisionCardProps {
  decision: Decision
  currentUserId: string
  partnerName: string
  onView: () => void
  onConfirm: () => void
}

function DecisionCard({ decision, currentUserId, partnerName, onView, onConfirm }: DecisionCardProps) {
  const needsConfirmation = decision.status === 'proposed' && !decision.confirmedBy.includes(currentUserId)
  const createdByMe = decision.createdBy === currentUserId

  const statusConfig: Record<DecisionStatus, { label: string; className: string }> = {
    proposed: { label: 'Proposed', className: 'bg-[var(--warning-subtle)] text-[var(--warning)]' },
    active: { label: 'Active', className: 'bg-[var(--accent-subtle)] text-[var(--accent)]' },
    changed: { label: 'Changed', className: 'bg-[var(--info-subtle)] text-[var(--info)]' },
    completed: { label: 'Completed', className: 'bg-[var(--success-subtle)] text-[var(--success)]' },
    cancelled: { label: 'Cancelled', className: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]' },
  }

  return (
    <div
      onClick={onView}
      className={cn(
        'p-5 rounded-xl cursor-pointer',
        'bg-[var(--bg-primary)]',
        'border border-[var(--border-subtle)]',
        'hover:border-[var(--border-default)]',
        'hover:shadow-[var(--shadow-md)]',
        'transition-all duration-200',
        needsConfirmation && 'ring-2 ring-[var(--warning-muted)]'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg',
          'bg-[var(--surface-decision)]',
          'flex items-center justify-center'
        )}>
          <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] font-medium text-[var(--text-primary)] truncate">
              {decision.title}
            </h3>
            <span className={cn(
              'flex-shrink-0 px-2 py-0.5 rounded-full',
              'text-[10px] font-semibold uppercase',
              statusConfig[decision.status].className
            )}>
              {statusConfig[decision.status].label}
            </span>
          </div>

          <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mb-3">
            {decision.description}
          </p>

          <div className="flex items-center gap-4">
            {/* Category */}
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5',
              'text-[11px] font-medium text-[var(--text-tertiary)]',
              'bg-[var(--bg-tertiary)] rounded-full'
            )}>
              {decision.category}
            </span>

            {/* Created by */}
            <span className="text-[11px] text-[var(--text-muted)]">
              by {createdByMe ? 'You' : partnerName}
            </span>

            {/* Date */}
            <span className="text-[11px] text-[var(--text-muted)]">
              {formatRelativeDate(decision.updatedAt)}
            </span>
          </div>
        </div>

        {/* Action */}
        {needsConfirmation && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConfirm()
            }}
            className={cn(
              'flex-shrink-0 px-4 py-2',
              'bg-[var(--accent)] text-white rounded-lg',
              'text-[12px] font-medium',
              'hover:opacity-90 transition-opacity'
            )}
          >
            Confirm
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  hasFilters,
  onCreateDecision,
  onClearFilters,
}: {
  hasFilters: boolean
  onCreateDecision: () => void
  onClearFilters: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn(
        'w-16 h-16 rounded-2xl mb-6',
        'bg-[var(--bg-secondary)]',
        'flex items-center justify-center'
      )}>
        <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h3 className="text-[17px] font-medium text-[var(--text-primary)] mb-2">
        {hasFilters ? 'No decisions found' : 'No decisions yet'}
      </h3>
      <p className="text-[14px] text-[var(--text-secondary)] max-w-sm mb-6">
        {hasFilters
          ? 'Try adjusting your filters or search query'
          : 'Create your first shared decision to start building your agreement history'}
      </p>

      {hasFilters ? (
        <button
          onClick={onClearFilters}
          className={cn(
            'px-4 py-2 rounded-lg',
            'text-[13px] font-medium text-[var(--accent)]',
            'bg-[var(--accent-subtle)]',
            'hover:bg-[var(--accent-muted)] transition-colors'
          )}
        >
          Clear filters
        </button>
      ) : (
        <button
          onClick={onCreateDecision}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5',
            'bg-[var(--accent)] text-white rounded-xl',
            'text-[13px] font-medium',
            'hover:opacity-90 transition-opacity'
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Decision
        </button>
      )}
    </div>
  )
}

function formatRelativeDate(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default PremiumDecisions
