import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { NavItemId } from '@/types'

interface PremiumSidebarProps {
  activeTab: NavItemId
  onTabChange: (id: NavItemId) => void
  collapsed: boolean
  onToggleCollapse: () => void
  partnerName: string
  partnerAvatar?: string
}

const navItems: { id: NavItemId; label: string; icon: ReactNode; section: 'main' | 'agreements' }[] = [
  {
    id: 'dashboard',
    label: 'Home',
    section: 'main',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Messages',
    section: 'main',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'decisions',
    label: 'Decisions',
    section: 'agreements',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'promises',
    label: 'Promises',
    section: 'agreements',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    section: 'agreements',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'memories',
    label: 'Memories',
    section: 'main',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export function PremiumSidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  partnerName,
  partnerAvatar,
}: PremiumSidebarProps) {
  const [hovering, setHovering] = useState(false)
  const expanded = !collapsed || hovering

  const mainItems = navItems.filter(i => i.section === 'main')
  const agreementItems = navItems.filter(i => i.section === 'agreements')

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        'flex flex-col h-screen',
        'border-r border-[var(--border-subtle)]',
        'transition-all duration-300 ease-[var(--ease-out)]',
        'bg-[var(--bg-glass)] backdrop-blur-xl',
        expanded ? 'w-[var(--sidebar-width)]' : 'w-[var(--sidebar-collapsed)]'
      )}
      style={{
        '--sidebar-width': '240px',
        '--sidebar-collapsed': '64px',
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-14 px-4',
        'border-b border-[var(--border-subtle)]'
      )}>
        <div className={cn(
          'flex items-center gap-3 overflow-hidden',
          'transition-all duration-300'
        )}>
          {/* Logo mark */}
          <div className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg',
            'bg-gradient-to-br from-[var(--accent)] to-purple-500',
            'flex items-center justify-center',
            'shadow-sm'
          )}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>

          {/* App name */}
          <span
            className={cn(
              'font-semibold text-[var(--text-primary)] whitespace-nowrap',
              'transition-opacity duration-200',
              expanded ? 'opacity-100' : 'opacity-0 w-0'
            )}
          >
            OneRoom
          </span>
        </div>

        {/* Collapse button */}
        {expanded && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'ml-auto p-1.5 rounded-md',
              'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
              'hover:bg-[var(--bg-tertiary)]',
              'transition-colors duration-150'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                collapsed ? 'rotate-180' : ''
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Main section */}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={activeTab === item.id}
              expanded={expanded}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </div>

        {/* Agreements section */}
        <div className="mt-6">
          {expanded && (
            <div className="px-3 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--text-muted)]">
                Agreements
              </span>
            </div>
          )}
          <div className="space-y-1">
            {agreementItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeTab === item.id}
                expanded={expanded}
                onClick={() => onTabChange(item.id)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Partner info */}
      <div className={cn(
        'p-3 border-t border-[var(--border-subtle)]'
      )}>
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg',
            'hover:bg-[var(--bg-tertiary)]',
            'transition-colors duration-150 cursor-pointer',
            !expanded && 'justify-center'
          )}
        >
          {/* Partner avatar */}
          <div className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full',
            'bg-gradient-to-br from-emerald-400 to-teal-500',
            'flex items-center justify-center',
            'text-white text-sm font-medium'
          )}>
            {partnerAvatar ? (
              <img src={partnerAvatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              partnerName.charAt(0).toUpperCase()
            )}
          </div>

          {expanded && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                {partnerName}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Partner
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

interface NavButtonProps {
  item: { id: NavItemId; label: string; icon: ReactNode }
  active: boolean
  expanded: boolean
  onClick: () => void
}

function NavButton({ item, active, expanded, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
        'text-[13px] font-medium',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        active
          ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
        !expanded && 'justify-center px-0'
      )}
      title={!expanded ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {expanded && <span className="truncate">{item.label}</span>}
    </button>
  )
}

export default PremiumSidebar
