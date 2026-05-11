import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/animations/variants/list'

type PromiseStatus = 'pending' | 'fulfilled' | 'broken' | 'overdue'
type PromiseFilter = 'all' | 'pending' | 'fulfilled' | 'broken'

interface Promise {
  id: string
  title: string
  description?: string
  promiserId: string
  promiserName: string
  recipientId: string
  recipientName: string
  dueDate?: Date
  status: PromiseStatus
  createdAt: Date
  fulfilledAt?: Date
}

interface PromisesHubProps {
  chatId: string
  currentUserId: string
  userName: string
  partnerName: string
}

export function PromisesHub({ chatId, currentUserId, userName, partnerName }: PromisesHubProps) {
  const [filter, setFilter] = useState<PromiseFilter>('all')
  const [view, setView] = useState<'list' | 'calendar'>('list')

  // Mock data
  const promises: Promise[] = [
    {
      id: '1',
      title: 'Schedule dentist appointment',
      description: 'For the annual checkup',
      promiserId: currentUserId,
      promiserName: userName,
      recipientId: 'partner',
      recipientName: partnerName,
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      status: 'overdue',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    },
    {
      id: '2',
      title: 'Pick up dry cleaning',
      promiserId: 'partner',
      promiserName: partnerName,
      recipientId: currentUserId,
      recipientName: userName,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    },
    {
      id: '3',
      title: 'Plan date night',
      promiserId: currentUserId,
      promiserName: userName,
      recipientId: 'partner',
      recipientName: partnerName,
      status: 'fulfilled',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      fulfilledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      id: '4',
      title: 'Fix the kitchen faucet',
      description: 'The one that\'s been leaking',
      promiserId: 'partner',
      promiserName: partnerName,
      recipientId: currentUserId,
      recipientName: userName,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
  ]

  const stats = {
    total: promises.length,
    pending: promises.filter((p) => p.status === 'pending').length,
    fulfilled: promises.filter((p) => p.status === 'fulfilled').length,
    overdue: promises.filter((p) => p.status === 'overdue').length,
  }

  const filteredPromises = filter === 'all'
    ? promises
    : promises.filter((p) => p.status === filter || (filter === 'pending' && p.status === 'overdue'))

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-secondary/80 backdrop-blur-xl border-b border-border-light safe-area-top">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content-primary">Promises</h1>
              <p className="text-sm text-content-secondary mt-1">
                Commitments you've made to each other
              </p>
            </div>
            <button className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
              'bg-primary-500 text-white font-medium text-sm',
              'hover:bg-primary-600 transition-colors'
            )}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Promise
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Stats */}
          <motion.div variants={staggerItem} className="grid grid-cols-4 gap-3">
            <StatCard value={stats.total} label="Total" active={filter === 'all'} onClick={() => setFilter('all')} />
            <StatCard value={stats.pending} label="Pending" color="warning" active={filter === 'pending'} onClick={() => setFilter('pending')} />
            <StatCard value={stats.fulfilled} label="Fulfilled" color="success" active={filter === 'fulfilled'} onClick={() => setFilter('fulfilled')} />
            <StatCard value={stats.overdue} label="Overdue" color="danger" active={filter === 'broken'} onClick={() => setFilter('broken')} />
          </motion.div>

          {/* View toggle */}
          <motion.div variants={staggerItem} className="flex items-center justify-between">
            <div className="flex gap-1 p-1 rounded-xl bg-surface-tertiary">
              <button
                onClick={() => setView('list')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  view === 'list'
                    ? 'bg-surface-secondary text-content-primary shadow-sm'
                    : 'text-content-tertiary hover:text-content-secondary'
                )}
              >
                List
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  view === 'calendar'
                    ? 'bg-surface-secondary text-content-primary shadow-sm'
                    : 'text-content-tertiary hover:text-content-secondary'
                )}
              >
                Calendar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-content-tertiary">
                {filteredPromises.length} promise{filteredPromises.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>

          {/* Promise list */}
          <div className="space-y-3">
            {filteredPromises.map((promise) => (
              <motion.div key={promise.id} variants={staggerItem}>
                <PromiseCard
                  promise={promise}
                  currentUserId={currentUserId}
                />
              </motion.div>
            ))}
          </div>

          {/* Empty state */}
          {filteredPromises.length === 0 && (
            <motion.div variants={staggerItem} className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤝</span>
              </div>
              <h3 className="text-lg font-semibold text-content-primary mb-2">
                No promises yet
              </h3>
              <p className="text-sm text-content-secondary max-w-sm mx-auto">
                Make promises to each other to build trust and accountability in your relationship.
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

function StatCard({
  value,
  label,
  color,
  active,
  onClick,
}: {
  value: number
  label: string
  color?: 'success' | 'warning' | 'danger'
  active?: boolean
  onClick: () => void
}) {
  const colorClasses = {
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl text-center transition-all',
        'border',
        active
          ? 'bg-primary-50 border-primary-200 shadow-sm'
          : 'bg-surface-secondary border-border-light hover:border-border'
      )}
    >
      <p className={cn(
        'text-2xl font-bold',
        color ? colorClasses[color] : 'text-content-primary'
      )}>
        {value}
      </p>
      <p className="text-xs text-content-tertiary mt-1">{label}</p>
    </button>
  )
}

function PromiseCard({
  promise,
  currentUserId,
}: {
  promise: Promise
  currentUserId: string
}) {
  const isPromisor = promise.promiserId === currentUserId
  const isOverdue = promise.status === 'overdue'
  const isPending = promise.status === 'pending'

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-warning-100 text-warning-700', icon: '⏳' },
    fulfilled: { label: 'Fulfilled', color: 'bg-success-100 text-success-700', icon: '✓' },
    broken: { label: 'Broken', color: 'bg-danger-100 text-danger-700', icon: '✗' },
    overdue: { label: 'Overdue', color: 'bg-danger-100 text-danger-700', icon: '⚠️' },
  }

  const config = statusConfig[promise.status]

  return (
    <div className={cn(
      'bg-surface-secondary rounded-2xl border p-5',
      'hover:border-border hover:shadow-sm transition-all',
      isOverdue ? 'border-danger-200' : 'border-border-light'
    )}>
      <div className="flex items-start gap-4">
        {/* Status indicator */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg',
          promise.status === 'fulfilled' ? 'bg-success-100' :
          promise.status === 'overdue' ? 'bg-danger-100' :
          'bg-primary-100'
        )}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-content-primary">{promise.title}</h3>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.color)}>
              {config.label}
            </span>
          </div>

          {promise.description && (
            <p className="text-sm text-content-secondary mb-3">{promise.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-content-tertiary">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {isPromisor ? 'You promised' : `${promise.promiserName} promised`}
            </span>
            {promise.dueDate && (
              <span className={cn('flex items-center gap-1', isOverdue && 'text-danger-600')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isOverdue ? 'Overdue' : 'Due'} {formatRelativeTime({ toDate: () => promise.dueDate! } as any)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {isPending && isPromisor && (
          <button className={cn(
            'px-4 py-2 rounded-lg',
            'bg-success-500 text-white text-sm font-medium',
            'hover:bg-success-600 transition-colors'
          )}>
            Mark Done
          </button>
        )}
      </div>
    </div>
  )
}

export default PromisesHub
