import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/animations/variants/list'

type ReminderType = 'once' | 'daily' | 'weekly' | 'monthly'
type ReminderStatus = 'pending' | 'completed' | 'snoozed'

interface Reminder {
  id: string
  title: string
  description?: string
  dueDate: Date
  type: ReminderType
  status: ReminderStatus
  assigneeId: string
  assigneeName: string
  createdBy: string
}

interface ReminderCenterProps {
  currentUserId: string
  userName: string
  partnerName: string
}

export function ReminderCenter({ currentUserId, userName, partnerName }: ReminderCenterProps) {
  const [filter, setFilter] = useState<'all' | 'mine' | 'partner'>('all')
  const [showCompleted, setShowCompleted] = useState(false)

  // Mock data
  const reminders: Reminder[] = [
    {
      id: '1',
      title: 'Take out the trash',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 2),
      type: 'weekly',
      status: 'pending',
      assigneeId: currentUserId,
      assigneeName: userName,
      createdBy: 'partner',
    },
    {
      id: '2',
      title: 'Call mom',
      description: 'Check in on Sunday',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      type: 'weekly',
      status: 'pending',
      assigneeId: currentUserId,
      assigneeName: userName,
      createdBy: currentUserId,
    },
    {
      id: '3',
      title: 'Pay electricity bill',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      type: 'monthly',
      status: 'pending',
      assigneeId: 'partner',
      assigneeName: partnerName,
      createdBy: currentUserId,
    },
    {
      id: '4',
      title: 'Water the plants',
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
      type: 'weekly',
      status: 'completed',
      assigneeId: 'partner',
      assigneeName: partnerName,
      createdBy: 'partner',
    },
    {
      id: '5',
      title: 'Dentist appointment',
      description: 'Dr. Smith at 3pm',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      type: 'once',
      status: 'pending',
      assigneeId: currentUserId,
      assigneeName: userName,
      createdBy: currentUserId,
    },
  ]

  const filteredReminders = reminders
    .filter((r) => {
      if (!showCompleted && r.status === 'completed') return false
      if (filter === 'mine') return r.assigneeId === currentUserId
      if (filter === 'partner') return r.assigneeId !== currentUserId
      return true
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  const today = filteredReminders.filter((r) => {
    const diff = r.dueDate.getTime() - Date.now()
    return diff >= 0 && diff < 24 * 60 * 60 * 1000
  })

  const upcoming = filteredReminders.filter((r) => {
    const diff = r.dueDate.getTime() - Date.now()
    return diff >= 24 * 60 * 60 * 1000
  })

  const overdue = filteredReminders.filter((r) => {
    return r.dueDate.getTime() < Date.now() && r.status !== 'completed'
  })

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-secondary/80 backdrop-blur-xl border-b border-border-light safe-area-top">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content-primary">Reminders</h1>
              <p className="text-sm text-content-secondary mt-1">
                Stay on top of things together
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
              New Reminder
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
          {/* Filters */}
          <motion.div variants={staggerItem} className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'mine', 'partner'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize',
                    filter === f
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-tertiary text-content-secondary hover:bg-surface-sunken'
                  )}
                >
                  {f === 'mine' ? 'Mine' : f === 'partner' ? partnerName : 'All'}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-border text-primary-500 focus:ring-primary-500"
              />
              Show completed
            </label>
          </motion.div>

          {/* Overdue */}
          {overdue.length > 0 && (
            <motion.section variants={staggerItem}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-danger-600 mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Overdue
              </h2>
              <div className="space-y-2">
                {overdue.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    currentUserId={currentUserId}
                    isOverdue
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Today */}
          {today.length > 0 && (
            <motion.section variants={staggerItem}>
              <h2 className="text-sm font-semibold text-content-primary mb-3">Today</h2>
              <div className="space-y-2">
                {today.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <motion.section variants={staggerItem}>
              <h2 className="text-sm font-semibold text-content-primary mb-3">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Empty state */}
          {filteredReminders.length === 0 && (
            <motion.div variants={staggerItem} className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⏰</span>
              </div>
              <h3 className="text-lg font-semibold text-content-primary mb-2">
                All clear!
              </h3>
              <p className="text-sm text-content-secondary max-w-sm mx-auto">
                No reminders right now. Add one to stay organized together.
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

function ReminderCard({
  reminder,
  currentUserId,
  isOverdue,
}: {
  reminder: Reminder
  currentUserId: string
  isOverdue?: boolean
}) {
  const isMine = reminder.assigneeId === currentUserId
  const isCompleted = reminder.status === 'completed'

  const typeLabels = {
    once: 'Once',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  }

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-xl',
      'bg-surface-secondary border transition-all',
      isOverdue && !isCompleted ? 'border-danger-200 bg-danger-50' : 'border-border-light hover:border-border'
    )}>
      {/* Checkbox */}
      <button className={cn(
        'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
        isCompleted
          ? 'bg-success-500 border-success-500 text-white'
          : 'border-border hover:border-primary-400'
      )}>
        {isCompleted && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            'font-medium',
            isCompleted ? 'text-content-tertiary line-through' : 'text-content-primary'
          )}>
            {reminder.title}
          </p>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            reminder.type === 'once' ? 'bg-surface-tertiary text-content-tertiary' :
            reminder.type === 'daily' ? 'bg-blue-100 text-blue-700' :
            reminder.type === 'weekly' ? 'bg-purple-100 text-purple-700' :
            'bg-amber-100 text-amber-700'
          )}>
            {typeLabels[reminder.type]}
          </span>
        </div>
        {reminder.description && (
          <p className="text-sm text-content-tertiary mt-0.5">{reminder.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-content-tertiary">
          <span className={cn(isOverdue && 'text-danger-600 font-medium')}>
            {formatRelativeTime({ toDate: () => reminder.dueDate } as any)}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center text-[10px]">
              {reminder.assigneeName.charAt(0)}
            </div>
            {isMine ? 'You' : reminder.assigneeName}
          </span>
        </div>
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="p-2 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default ReminderCenter
