import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import { RelationshipPulseWidget } from '@/components/ai'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/animations/variants/list'

interface DashboardProps {
  userName: string
  partnerName: string
  chatId: string
}

export function Dashboard({ userName, partnerName, chatId }: DashboardProps) {
  // Mock data - would come from stores/API
  const quickStats = {
    activeDecisions: 3,
    pendingPromises: 2,
    upcomingReminders: 4,
    unreadMessages: 7,
  }

  const recentActivity = [
    { type: 'decision', title: 'Budget for dining out', time: new Date(Date.now() - 1000 * 60 * 30), status: 'confirmed' },
    { type: 'promise', title: 'Pick up groceries', time: new Date(Date.now() - 1000 * 60 * 60 * 2), status: 'pending' },
    { type: 'memory', title: 'Weekend at the cabin', time: new Date(Date.now() - 1000 * 60 * 60 * 24), status: 'created' },
  ]

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-secondary/80 backdrop-blur-xl border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content-primary">
                Good morning, {userName}
              </h1>
              <p className="text-sm text-content-secondary mt-1">
                Here's what's happening with you and {partnerName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl hover:bg-surface-tertiary transition-colors">
                <svg className="w-6 h-6 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {quickStats.unreadMessages > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
                )}
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                {userName.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Quick Stats */}
          <motion.div variants={staggerItem} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon="📋"
              label="Active Decisions"
              value={quickStats.activeDecisions}
              color="primary"
              href="/decisions"
            />
            <StatCard
              icon="🤝"
              label="Pending Promises"
              value={quickStats.pendingPromises}
              color="warning"
              href="/promises"
            />
            <StatCard
              icon="⏰"
              label="Upcoming Reminders"
              value={quickStats.upcomingReminders}
              color="info"
              href="/reminders"
            />
            <StatCard
              icon="💬"
              label="Unread Messages"
              value={quickStats.unreadMessages}
              color="success"
              href="/chat"
            />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <motion.div variants={staggerItem}>
                <h2 className="text-lg font-semibold text-content-primary mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <QuickActionButton icon="💬" label="Send Message" onClick={() => {}} />
                  <QuickActionButton icon="📋" label="New Decision" onClick={() => {}} />
                  <QuickActionButton icon="🤝" label="Make Promise" onClick={() => {}} />
                  <QuickActionButton icon="📅" label="Add Reminder" onClick={() => {}} />
                </div>
              </motion.div>

              {/* Recent Activity */}
              <motion.div variants={staggerItem}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-content-primary">Recent Activity</h2>
                  <button className="text-sm text-primary-600 font-medium hover:text-primary-700">
                    View all
                  </button>
                </div>
                <div className="bg-surface-secondary rounded-2xl border border-border-light overflow-hidden">
                  {recentActivity.map((activity, index) => (
                    <ActivityRow
                      key={index}
                      type={activity.type}
                      title={activity.title}
                      time={activity.time}
                      status={activity.status}
                      isLast={index === recentActivity.length - 1}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Pending Items */}
              <motion.div variants={staggerItem}>
                <h2 className="text-lg font-semibold text-content-primary mb-4">Needs Your Attention</h2>
                <div className="space-y-3">
                  <PendingItem
                    type="decision"
                    title="Holiday plans 2026"
                    description="Partner proposed: Alternate between families"
                    actionLabel="Review"
                  />
                  <PendingItem
                    type="promise"
                    title="Schedule dentist appointment"
                    description="Due 3 days ago"
                    actionLabel="Mark Done"
                    urgent
                  />
                </div>
              </motion.div>
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-6">
              {/* Relationship Pulse */}
              <motion.div variants={staggerItem}>
                <RelationshipPulseWidget
                  data={{
                    periodStart: { toDate: () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } as any,
                    periodEnd: { toDate: () => new Date() } as any,
                    messageCount: { user: 42, partner: 38 },
                    averageResponseTime: { user: 15, partner: 22 },
                    emotionalCheckIns: { count: 3, averageMood: 4.2 },
                    decisionsCompleted: 2,
                    promisesFulfilled: 5,
                    memoriesCreated: 1,
                    activeDecisions: 3,
                    pendingPromises: 2,
                    trends: { communication: 'improving', engagement: 'stable', accountability: 'improving' },
                  }}
                  onClick={() => {}}
                />
              </motion.div>

              {/* Upcoming */}
              <motion.div variants={staggerItem}>
                <h2 className="text-lg font-semibold text-content-primary mb-4">Coming Up</h2>
                <div className="bg-surface-secondary rounded-2xl border border-border-light p-4 space-y-3">
                  <UpcomingItem icon="📅" title="Date night" time="Tomorrow, 7pm" />
                  <UpcomingItem icon="🎂" title="Mom's birthday" time="In 5 days" />
                  <UpcomingItem icon="✈️" title="Vacation starts" time="In 2 weeks" />
                </div>
              </motion.div>

              {/* Memory Highlight */}
              <motion.div variants={staggerItem}>
                <h2 className="text-lg font-semibold text-content-primary mb-4">Memory Highlight</h2>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4">
                  <div className="flex items-center gap-2 text-amber-600 text-sm font-medium mb-3">
                    <span>💛</span>
                    <span>1 year ago today</span>
                  </div>
                  <div className="aspect-video rounded-xl bg-amber-100 mb-3 flex items-center justify-center">
                    <span className="text-4xl">🏔️</span>
                  </div>
                  <p className="font-medium text-amber-900">First hiking trip together</p>
                  <p className="text-sm text-amber-700 mt-1">Mount Rainier National Park</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

// Sub-components
function StatCard({
  icon,
  label,
  value,
  color,
  href,
}: {
  icon: string
  label: string
  value: number
  color: 'primary' | 'success' | 'warning' | 'info'
  href: string
}) {
  const colorClasses = {
    primary: 'from-primary-50 to-primary-100 border-primary-200',
    success: 'from-success-50 to-success-100 border-success-200',
    warning: 'from-warning-50 to-warning-100 border-warning-200',
    info: 'from-info-50 to-info-100 border-info-200',
  }

  const valueColors = {
    primary: 'text-primary-700',
    success: 'text-success-700',
    warning: 'text-warning-700',
    info: 'text-info-700',
  }

  return (
    <a
      href={href}
      className={cn(
        'block p-4 rounded-2xl',
        'bg-gradient-to-br border',
        'hover:shadow-md transition-shadow',
        colorClasses[color]
      )}
    >
      <span className="text-2xl">{icon}</span>
      <p className={cn('text-3xl font-bold mt-2', valueColors[color])}>{value}</p>
      <p className="text-sm text-content-secondary mt-1">{label}</p>
    </a>
  )
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-xl',
        'bg-surface-secondary border border-border-light',
        'hover:border-border hover:shadow-sm',
        'transition-all'
      )}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-content-primary">{label}</span>
    </button>
  )
}

function ActivityRow({
  type,
  title,
  time,
  status,
  isLast,
}: {
  type: string
  title: string
  time: Date
  status: string
  isLast: boolean
}) {
  const icons = {
    decision: '📋',
    promise: '🤝',
    memory: '💜',
    message: '💬',
  }

  return (
    <div className={cn('flex items-center gap-4 p-4', !isLast && 'border-b border-border-light')}>
      <span className="text-xl">{icons[type as keyof typeof icons] || '📄'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-content-primary truncate">{title}</p>
        <p className="text-sm text-content-tertiary">{formatRelativeTime({ toDate: () => time } as any)}</p>
      </div>
      <span className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        status === 'confirmed' && 'bg-success-100 text-success-700',
        status === 'pending' && 'bg-warning-100 text-warning-700',
        status === 'created' && 'bg-primary-100 text-primary-700'
      )}>
        {status}
      </span>
    </div>
  )
}

function PendingItem({
  type,
  title,
  description,
  actionLabel,
  urgent,
}: {
  type: string
  title: string
  description: string
  actionLabel: string
  urgent?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-xl',
      'bg-surface-secondary border',
      urgent ? 'border-danger-200 bg-danger-50' : 'border-border-light'
    )}>
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        urgent ? 'bg-danger-100' : 'bg-primary-100'
      )}>
        <span className="text-lg">{type === 'decision' ? '📋' : '🤝'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-content-primary">{title}</p>
        <p className="text-sm text-content-secondary truncate">{description}</p>
      </div>
      <button className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium',
        'transition-colors',
        urgent
          ? 'bg-danger-500 text-white hover:bg-danger-600'
          : 'bg-primary-500 text-white hover:bg-primary-600'
      )}>
        {actionLabel}
      </button>
    </div>
  )
}

function UpcomingItem({ icon, title, time }: { icon: string; title: string; time: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-content-primary">{title}</p>
        <p className="text-xs text-content-tertiary">{time}</p>
      </div>
    </div>
  )
}

export default Dashboard
