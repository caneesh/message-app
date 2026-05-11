import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface DashboardStats {
  activeDecisions: number
  pendingConfirmations: number
  activePromises: number
  upcomingReminders: number
}

interface RecentActivity {
  id: string
  type: 'decision' | 'promise' | 'message' | 'reminder'
  title: string
  description: string
  timestamp: Date
  actor?: string
}

interface PremiumDashboardProps {
  stats: DashboardStats
  recentActivity: RecentActivity[]
  partnerName: string
  partnerAvatar?: string
  greeting?: string
  onNavigate: (tab: string) => void
}

export function PremiumDashboard({
  stats,
  recentActivity,
  partnerName,
  partnerAvatar,
  greeting,
  onNavigate,
}: PremiumDashboardProps) {
  const timeOfDay = getTimeOfDay()
  const displayGreeting = greeting || `Good ${timeOfDay}`

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)] overflow-y-auto">
      <div className="max-w-[1000px] mx-auto w-full px-8 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <h1 className="text-[28px] font-semibold text-[var(--text-primary)] tracking-tight mb-1">
            {displayGreeting}
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Here's what's happening with you and {partnerName}
          </p>
        </motion.header>

        {/* Quick stats */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          <QuickStatCard
            label="Active Decisions"
            value={stats.activeDecisions}
            icon={<DecisionIcon />}
            onClick={() => onNavigate('decisions')}
            gradient="from-indigo-500/10 to-purple-500/10"
          />
          <QuickStatCard
            label="Pending"
            value={stats.pendingConfirmations}
            icon={<PendingIcon />}
            onClick={() => onNavigate('decisions')}
            highlight={stats.pendingConfirmations > 0}
            gradient="from-amber-500/10 to-orange-500/10"
          />
          <QuickStatCard
            label="Active Promises"
            value={stats.activePromises}
            icon={<PromiseIcon />}
            onClick={() => onNavigate('promises')}
            gradient="from-emerald-500/10 to-teal-500/10"
          />
          <QuickStatCard
            label="Reminders"
            value={stats.upcomingReminders}
            icon={<ReminderIcon />}
            onClick={() => onNavigate('reminders')}
            gradient="from-blue-500/10 to-cyan-500/10"
          />
        </motion.section>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent activity - takes 2 columns */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Recent Activity
              </h2>
              <button className="text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                View all
              </button>
            </div>

            <div className={cn(
              'rounded-xl overflow-hidden',
              'bg-[var(--bg-primary)]',
              'border border-[var(--border-subtle)]'
            )}>
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[14px] text-[var(--text-tertiary)]">
                    No recent activity
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          {/* Quick actions sidebar */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <QuickActionButton
                icon={<MessageIcon />}
                label="Send message"
                onClick={() => onNavigate('chat')}
              />
              <QuickActionButton
                icon={<DecisionIcon />}
                label="Create decision"
                onClick={() => onNavigate('decisions')}
                primary
              />
              <QuickActionButton
                icon={<PromiseIcon />}
                label="Make promise"
                onClick={() => onNavigate('promises')}
              />
              <QuickActionButton
                icon={<CalendarIcon />}
                label="Add to calendar"
                onClick={() => onNavigate('calendar')}
              />
            </div>

            {/* Partner card */}
            <div className={cn(
              'mt-6 p-5 rounded-xl',
              'bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)]',
              'border border-[var(--border-subtle)]'
            )}>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  'w-12 h-12 rounded-full',
                  'bg-gradient-to-br from-emerald-400 to-teal-500',
                  'flex items-center justify-center',
                  'text-white text-lg font-medium'
                )}>
                  {partnerAvatar ? (
                    <img src={partnerAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    partnerName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[var(--text-primary)]">
                    {partnerName}
                  </p>
                  <p className="text-[12px] text-[var(--text-tertiary)]">
                    Your partner
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('chat')}
                className={cn(
                  'w-full py-2.5 rounded-lg',
                  'text-[13px] font-medium text-[var(--accent)]',
                  'bg-[var(--accent-subtle)]',
                  'hover:bg-[var(--accent-muted)] transition-colors'
                )}
              >
                Open conversation
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}

interface QuickStatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  onClick: () => void
  highlight?: boolean
  gradient: string
}

function QuickStatCard({ label, value, icon, onClick, highlight, gradient }: QuickStatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-5 rounded-xl text-left',
        'bg-[var(--bg-primary)]',
        'border border-[var(--border-subtle)]',
        'hover:border-[var(--border-default)]',
        'hover:shadow-[var(--shadow-md)]',
        'transition-all duration-200',
        highlight && 'ring-2 ring-[var(--warning-muted)]'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg mb-3',
        'flex items-center justify-center',
        `bg-gradient-to-br ${gradient}`
      )}>
        {icon}
      </div>
      <p className="text-[28px] font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
        {label}
      </p>
    </button>
  )
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const typeConfig: Record<RecentActivity['type'], { icon: React.ReactNode; color: string }> = {
    decision: { icon: <DecisionIcon />, color: 'text-[var(--accent)]' },
    promise: { icon: <PromiseIcon />, color: 'text-emerald-500' },
    message: { icon: <MessageIcon />, color: 'text-blue-500' },
    reminder: { icon: <ReminderIcon />, color: 'text-amber-500' },
  }

  const config = typeConfig[activity.type]

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-[var(--bg-secondary)] transition-colors">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-tertiary)]', config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
          {activity.title}
        </p>
        <p className="text-[12px] text-[var(--text-tertiary)] truncate">
          {activity.description}
        </p>
      </div>
      <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0">
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  )
}

function QuickActionButton({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl',
        'text-[13px] font-medium text-left',
        'transition-all duration-200',
        primary
          ? 'bg-[var(--accent)] text-white hover:opacity-90'
          : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
      )}
    >
      <span className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center',
        primary ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]'
      )}>
        {icon}
      </span>
      {label}
    </button>
  )
}

// Icons
function DecisionIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function PromiseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function ReminderIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function PendingIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

// Helpers
function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function formatRelativeTime(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default PremiumDashboard
