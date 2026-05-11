import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/animations/variants/list'

interface SettingsPageProps {
  currentUserId: string
  userName: string
  userPhone: string
  partnerName: string
}

export function SettingsPage({ currentUserId, userName, userPhone, partnerName }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [notifications, setNotifications] = useState({
    messages: true,
    decisions: true,
    promises: true,
    reminders: true,
    aiInsights: false,
  })

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-secondary/80 backdrop-blur-xl border-b border-border-light safe-area-top">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-content-primary">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Profile Section */}
          <motion.section variants={staggerItem}>
            <h2 className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3 px-1">
              Profile
            </h2>
            <div className="bg-surface-secondary rounded-2xl border border-border-light overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-border-light">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-semibold">
                  {userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-content-primary">{userName}</h3>
                  <p className="text-sm text-content-secondary">{userPhone}</p>
                </div>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors">
                  Edit
                </button>
              </div>
              <SettingsRow
                icon="💜"
                title="Partner"
                subtitle={partnerName}
                onClick={() => {}}
              />
            </div>
          </motion.section>

          {/* Appearance Section */}
          <motion.section variants={staggerItem}>
            <h2 className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3 px-1">
              Appearance
            </h2>
            <div className="bg-surface-secondary rounded-2xl border border-border-light overflow-hidden">
              <div className="p-4">
                <p className="text-sm font-medium text-content-primary mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                        theme === t
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-border-light hover:border-border'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        t === 'light' && 'bg-white border border-neutral-200',
                        t === 'dark' && 'bg-neutral-900',
                        t === 'system' && 'bg-gradient-to-br from-white to-neutral-900'
                      )}>
                        {t === 'light' && <span className="text-lg">☀️</span>}
                        {t === 'dark' && <span className="text-lg">🌙</span>}
                        {t === 'system' && <span className="text-lg">💻</span>}
                      </div>
                      <span className={cn(
                        'text-xs font-medium capitalize',
                        theme === t ? 'text-primary-600' : 'text-content-secondary'
                      )}>
                        {t}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Notifications Section */}
          <motion.section variants={staggerItem}>
            <h2 className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3 px-1">
              Notifications
            </h2>
            <div className="bg-surface-secondary rounded-2xl border border-border-light overflow-hidden">
              <ToggleRow
                title="Messages"
                subtitle="New messages from your partner"
                enabled={notifications.messages}
                onChange={(v) => setNotifications((n) => ({ ...n, messages: v }))}
              />
              <ToggleRow
                title="Decisions"
                subtitle="Decision proposals and confirmations"
                enabled={notifications.decisions}
                onChange={(v) => setNotifications((n) => ({ ...n, decisions: v }))}
              />
              <ToggleRow
                title="Promises"
                subtitle="Promise reminders and updates"
                enabled={notifications.promises}
                onChange={(v) => setNotifications((n) => ({ ...n, promises: v }))}
              />
              <ToggleRow
                title="Reminders"
                subtitle="Scheduled reminder alerts"
                enabled={notifications.reminders}
                onChange={(v) => setNotifications((n) => ({ ...n, reminders: v }))}
              />
              <ToggleRow
                title="AI Insights"
                subtitle="Smart suggestions and insights"
                enabled={notifications.aiInsights}
                onChange={(v) => setNotifications((n) => ({ ...n, aiInsights: v }))}
                isLast
              />
            </div>
          </motion.section>

          {/* AI Features Section */}
          <motion.section variants={staggerItem}>
            <h2 className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3 px-1">
              AI Features
            </h2>
            <div className="bg-surface-secondary rounded-2xl border border-border-light overflow-hidden">
              <SettingsRow
                icon="✨"
                title="AI Settings"
                subtitle="Configure AI-powered features"
                onClick={() => {}}
              />
              <SettingsRow
                icon="🔒"
                title="Privacy"
                subtitle="Control what AI can access"
                onClick={() => {}}
                isLast
              />
            </div>
          </motion.section>

          {/* Data & Storage Section */}
          <motion.section variants={staggerItem}>
            <h2 className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3 px-1">
              Data & Storage
            </h2>
            <div className="bg-surface-secondary rounded-2xl border border-border-light overflow-hidden">
              <SettingsRow
                icon="📦"
                title="Storage"
                subtitle="12.4 MB used"
                onClick={() => {}}
              />
              <SettingsRow
                icon="📤"
                title="Export Data"
                subtitle="Download your data"
                onClick={() => {}}
              />
              <SettingsRow
                icon="🗑️"
                title="Clear Cache"
                subtitle="Free up space"
                onClick={() => {}}
                isLast
              />
            </div>
          </motion.section>

          {/* Support Section */}
          <motion.section variants={staggerItem}>
            <h2 className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3 px-1">
              Support
            </h2>
            <div className="bg-surface-secondary rounded-2xl border border-border-light overflow-hidden">
              <SettingsRow
                icon="❓"
                title="Help Center"
                subtitle="Get help and support"
                onClick={() => {}}
              />
              <SettingsRow
                icon="💬"
                title="Contact Us"
                subtitle="Send us feedback"
                onClick={() => {}}
              />
              <SettingsRow
                icon="📄"
                title="Terms & Privacy"
                subtitle="Legal information"
                onClick={() => {}}
                isLast
              />
            </div>
          </motion.section>

          {/* Danger Zone */}
          <motion.section variants={staggerItem}>
            <div className="bg-surface-secondary rounded-2xl border border-danger-200 overflow-hidden">
              <SettingsRow
                icon="🚪"
                title="Log Out"
                titleColor="text-danger-600"
                onClick={() => {}}
              />
              <SettingsRow
                icon="💔"
                title="Leave Partnership"
                titleColor="text-danger-600"
                subtitle="End your connection"
                onClick={() => {}}
                isLast
              />
            </div>
          </motion.section>

          {/* Version */}
          <motion.div variants={staggerItem} className="text-center text-xs text-content-tertiary py-4">
            OneRoom v1.0.0
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

function SettingsRow({
  icon,
  title,
  subtitle,
  titleColor,
  onClick,
  isLast,
}: {
  icon: string
  title: string
  subtitle?: string
  titleColor?: string
  onClick: () => void
  isLast?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 text-left',
        'hover:bg-surface-tertiary transition-colors',
        !isLast && 'border-b border-border-light'
      )}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium', titleColor || 'text-content-primary')}>{title}</p>
        {subtitle && <p className="text-sm text-content-tertiary truncate">{subtitle}</p>}
      </div>
      <svg className="w-5 h-5 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

function ToggleRow({
  title,
  subtitle,
  enabled,
  onChange,
  isLast,
}: {
  title: string
  subtitle: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  isLast?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 p-4',
      !isLast && 'border-b border-border-light'
    )}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-content-primary">{title}</p>
        <p className="text-sm text-content-tertiary truncate">{subtitle}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0',
          'rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          enabled ? 'bg-primary-500' : 'bg-neutral-200'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5',
            'rounded-full bg-white shadow',
            'transform ring-0 transition duration-200 ease-in-out',
            enabled ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

export default SettingsPage
