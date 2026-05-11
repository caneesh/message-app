import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type PromiseStatus = 'active' | 'fulfilled' | 'broken' | 'expired'

interface Promise {
  id: string
  title: string
  description?: string
  status: PromiseStatus
  madeBy: string
  madeAt: Date
  dueDate?: Date
  fulfilledAt?: Date
  category?: string
}

interface PremiumPromisesProps {
  promises: Promise[]
  currentUserId: string
  partnerName: string
  onCreatePromise: () => void
  onViewPromise: (id: string) => void
  onFulfillPromise: (id: string) => void
}

export function PremiumPromises({
  promises,
  currentUserId,
  partnerName,
  onCreatePromise,
  onViewPromise,
  onFulfillPromise,
}: PremiumPromisesProps) {
  const [view, setView] = useState<'all' | 'mine' | 'theirs'>('all')
  const [showCompleted, setShowCompleted] = useState(false)

  const filteredPromises = promises.filter((p) => {
    if (view === 'mine' && p.madeBy !== currentUserId) return false
    if (view === 'theirs' && p.madeBy === currentUserId) return false
    if (!showCompleted && (p.status === 'fulfilled' || p.status === 'broken')) return false
    return true
  })

  const activePromises = promises.filter((p) => p.status === 'active')
  const myActive = activePromises.filter((p) => p.madeBy === currentUserId).length
  const theirActive = activePromises.filter((p) => p.madeBy !== currentUserId).length
  const fulfilledRate = promises.length > 0
    ? Math.round((promises.filter((p) => p.status === 'fulfilled').length / promises.length) * 100)
    : 0

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
                Promises
              </h1>
              <p className="text-[14px] text-[var(--text-secondary)] mt-1">
                Commitments you've made to each other
              </p>
            </div>

            <button
              onClick={onCreatePromise}
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
              Make Promise
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className={cn(
              'p-4 rounded-xl',
              'bg-[var(--bg-primary)]',
              'border border-[var(--border-subtle)]'
            )}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Your Promises
              </p>
              <p className="text-[28px] font-semibold text-[var(--accent)] mt-1">
                {myActive}
              </p>
            </div>
            <div className={cn(
              'p-4 rounded-xl',
              'bg-[var(--bg-primary)]',
              'border border-[var(--border-subtle)]'
            )}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Their Promises
              </p>
              <p className="text-[28px] font-semibold text-emerald-500 mt-1">
                {theirActive}
              </p>
            </div>
            <div className={cn(
              'p-4 rounded-xl',
              'bg-[var(--bg-primary)]',
              'border border-[var(--border-subtle)]'
            )}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Total Active
              </p>
              <p className="text-[28px] font-semibold text-[var(--text-primary)] mt-1">
                {activePromises.length}
              </p>
            </div>
            <div className={cn(
              'p-4 rounded-xl',
              'bg-[var(--bg-primary)]',
              'border border-[var(--border-subtle)]'
            )}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Fulfillment Rate
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-[28px] font-semibold text-[var(--success)]">
                  {fulfilledRate}
                </p>
                <span className="text-[14px] text-[var(--text-muted)]">%</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            {/* View toggle */}
            <div className={cn(
              'flex items-center p-1',
              'bg-[var(--bg-secondary)] rounded-lg'
            )}>
              {(['all', 'mine', 'theirs'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-4 py-1.5 rounded-md',
                    'text-[12px] font-medium capitalize',
                    'transition-all duration-150',
                    view === v
                      ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  {v === 'mine' ? 'My Promises' : v === 'theirs' ? `${partnerName}'s` : 'All'}
                </button>
              ))}
            </div>

            {/* Show completed toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-9 h-5 rounded-full p-0.5',
                'transition-colors duration-200',
                showCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
              )}>
                <div className={cn(
                  'w-4 h-4 rounded-full bg-white',
                  'transition-transform duration-200',
                  showCompleted && 'translate-x-4'
                )} />
              </div>
              <span className="text-[12px] text-[var(--text-secondary)]">
                Show completed
              </span>
            </label>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto py-6 px-8">
        <div className="max-w-[1000px] mx-auto">
          {filteredPromises.length === 0 ? (
            <EmptyState
              view={view}
              showCompleted={showCompleted}
              partnerName={partnerName}
              onCreatePromise={onCreatePromise}
            />
          ) : (
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {filteredPromises.map((promise) => (
                  <motion.div
                    key={promise.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PromiseCard
                      promise={promise}
                      currentUserId={currentUserId}
                      partnerName={partnerName}
                      onView={() => onViewPromise(promise.id)}
                      onFulfill={() => onFulfillPromise(promise.id)}
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

interface PromiseCardProps {
  promise: Promise
  currentUserId: string
  partnerName: string
  onView: () => void
  onFulfill: () => void
}

function PromiseCard({ promise, currentUserId, partnerName, onView, onFulfill }: PromiseCardProps) {
  const isMine = promise.madeBy === currentUserId
  const isOverdue = promise.dueDate && new Date(promise.dueDate) < new Date() && promise.status === 'active'

  const statusConfig: Record<PromiseStatus, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-[var(--accent-subtle)] text-[var(--accent)]' },
    fulfilled: { label: 'Fulfilled', className: 'bg-[var(--success-subtle)] text-[var(--success)]' },
    broken: { label: 'Broken', className: 'bg-[var(--error-subtle)] text-[var(--error)]' },
    expired: { label: 'Expired', className: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]' },
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
        isOverdue && 'ring-2 ring-[var(--error-muted)]'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Heart icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg',
          'bg-[var(--surface-promise)]',
          'flex items-center justify-center'
        )}>
          <svg
            className={cn(
              'w-5 h-5',
              promise.status === 'fulfilled' ? 'text-[var(--success)]' : 'text-[var(--accent)]'
            )}
            fill={promise.status === 'fulfilled' ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] font-medium text-[var(--text-primary)] truncate">
              {promise.title}
            </h3>
            <span className={cn(
              'flex-shrink-0 px-2 py-0.5 rounded-full',
              'text-[10px] font-semibold uppercase',
              statusConfig[promise.status].className
            )}>
              {statusConfig[promise.status].label}
            </span>
            {isOverdue && (
              <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-[var(--error-subtle)] text-[var(--error)]">
                Overdue
              </span>
            )}
          </div>

          {promise.description && (
            <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mb-3">
              {promise.description}
            </p>
          )}

          <div className="flex items-center gap-4">
            {/* Made by */}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-5 h-5 rounded-full',
                'flex items-center justify-center',
                'text-[9px] font-medium text-white',
                isMine
                  ? 'bg-[var(--accent)]'
                  : 'bg-emerald-500'
              )}>
                {isMine ? 'Y' : partnerName.charAt(0).toUpperCase()}
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                {isMine ? 'You promised' : `${partnerName} promised`}
              </span>
            </div>

            {/* Due date */}
            {promise.dueDate && (
              <span className={cn(
                'text-[11px]',
                isOverdue ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'
              )}>
                Due {formatDate(promise.dueDate)}
              </span>
            )}

            {/* Category */}
            {promise.category && (
              <span className={cn(
                'px-2 py-0.5 rounded-full',
                'text-[10px] font-medium text-[var(--text-tertiary)]',
                'bg-[var(--bg-tertiary)]'
              )}>
                {promise.category}
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        {promise.status === 'active' && isMine && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFulfill()
            }}
            className={cn(
              'flex-shrink-0 px-4 py-2',
              'bg-[var(--success)] text-white rounded-lg',
              'text-[12px] font-medium',
              'hover:opacity-90 transition-opacity'
            )}
          >
            Mark Fulfilled
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  view,
  showCompleted,
  partnerName,
  onCreatePromise,
}: {
  view: 'all' | 'mine' | 'theirs'
  showCompleted: boolean
  partnerName: string
  onCreatePromise: () => void
}) {
  let message = 'No promises yet'
  let description = 'Make your first promise to build trust and accountability'

  if (view === 'mine') {
    message = 'No promises from you'
    description = 'Make a promise to show your commitment'
  } else if (view === 'theirs') {
    message = `No promises from ${partnerName}`
    description = `${partnerName} hasn't made any promises yet`
  } else if (!showCompleted) {
    message = 'No active promises'
    description = 'All promises have been fulfilled or try showing completed'
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn(
        'w-16 h-16 rounded-2xl mb-6',
        'bg-[var(--bg-secondary)]',
        'flex items-center justify-center'
      )}>
        <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>

      <h3 className="text-[17px] font-medium text-[var(--text-primary)] mb-2">
        {message}
      </h3>
      <p className="text-[14px] text-[var(--text-secondary)] max-w-sm mb-6">
        {description}
      </p>

      {view !== 'theirs' && (
        <button
          onClick={onCreatePromise}
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
          Make Promise
        </button>
      )}
    </div>
  )
}

function formatDate(date: Date) {
  const now = new Date()
  const d = new Date(date)
  const diff = d.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 0 && days < 7) return `in ${days} days`
  if (days < 0 && days > -7) return `${Math.abs(days)} days ago`

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default PremiumPromises
