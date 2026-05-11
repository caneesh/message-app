import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconButton, Input } from '@/components/ui'

interface TopNavigationBarProps {
  title?: string
  showMenuButton?: boolean
  onMenuClick?: () => void
  searchQuery?: string
  onSearchChange?: (value: string) => void
  showSearch?: boolean
  darkMode?: boolean
  onToggleDarkMode?: () => void
  notificationsEnabled?: boolean
  onToggleNotifications?: () => void
  showNotificationBtn?: boolean
  onLogout?: () => void
  leftContent?: ReactNode
  rightContent?: ReactNode
}

export function TopNavigationBar({
  title,
  showMenuButton,
  onMenuClick,
  searchQuery = '',
  onSearchChange,
  showSearch = true,
  darkMode,
  onToggleDarkMode,
  notificationsEnabled,
  onToggleNotifications,
  showNotificationBtn,
  onLogout,
  leftContent,
  rightContent,
}: TopNavigationBarProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 h-14 px-4',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
        'border-b border-border-light',
        'sticky top-0 z-30'
      )}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 0px)',
      }}
    >
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <IconButton
            variant="ghost"
            size="sm"
            label="Open menu"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </IconButton>
        )}
        {title && (
          <h1 className="text-lg font-semibold text-content-primary md:hidden">
            {title}
          </h1>
        )}
        {leftContent}
      </div>

      <div className="flex items-center gap-2">
        {showSearch && onSearchChange && (
          <div className="relative hidden sm:block">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-36 lg:w-48 h-9 pl-9 text-sm"
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {onToggleDarkMode && (
          <IconButton
            variant="ghost"
            size="sm"
            label={darkMode ? 'Light mode' : 'Dark mode'}
            onClick={onToggleDarkMode}
          >
            {darkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </IconButton>
        )}

        {showNotificationBtn && onToggleNotifications && (
          <IconButton
            variant={notificationsEnabled ? 'accent' : 'ghost'}
            size="sm"
            label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
            onClick={onToggleNotifications}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </IconButton>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className={cn(
              'hidden sm:flex items-center gap-2 h-9 px-3',
              'text-sm font-medium text-content-secondary',
              'bg-surface-tertiary hover:bg-surface-primary',
              'border border-border rounded-lg',
              'transition-all duration-200'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log out</span>
          </button>
        )}

        {rightContent}
      </div>
    </header>
  )
}

export default TopNavigationBar
