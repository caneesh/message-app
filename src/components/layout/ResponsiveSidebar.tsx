import { useState, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui'
import type { NavItemId } from '@/types'

interface NavCategory {
  label: string
  items: NavItem[]
}

interface NavItem {
  id: NavItemId
  label: string
  icon: ReactNode
}

interface ResponsiveSidebarProps {
  activeTab: NavItemId
  onTabChange: (id: NavItemId) => void
  collapsed: boolean
  onToggleCollapse: () => void
  categories: NavCategory[]
}

export function ResponsiveSidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  categories,
}: ResponsiveSidebarProps) {
  const [isHovering, setIsHovering] = useState(false)

  const effectiveCollapsed = collapsed && !isHovering

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col flex-shrink-0',
        'h-screen overflow-hidden',
        'bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl',
        'border-r border-border-light',
        'transition-all duration-300 ease-out',
        effectiveCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center justify-between h-14 px-4 border-b border-border-light">
        <h1
          className={cn(
            'text-xl font-semibold text-content-primary tracking-tight',
            'transition-opacity duration-200',
            effectiveCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          )}
        >
          OneRoom
        </h1>
        {!effectiveCollapsed && (
          <span className="text-sm font-medium text-content-tertiary">
            {effectiveCollapsed ? 'OR' : ''}
          </span>
        )}
        <IconButton
          variant="ghost"
          size="sm"
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapse}
          className={cn(effectiveCollapsed && 'mx-auto')}
        >
          <svg
            className={cn(
              'w-5 h-5 transition-transform duration-200',
              collapsed ? 'rotate-180' : ''
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </IconButton>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {categories.map((category) => (
          <div key={category.label} className="mb-4">
            {!effectiveCollapsed && (
              <div className="px-3 py-2 text-xs font-semibold text-content-tertiary uppercase tracking-wider">
                {category.label}
              </div>
            )}
            <div className="space-y-1">
              {category.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'text-sm font-medium',
                    'transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    activeTab === item.id
                      ? 'bg-accent/10 text-accent relative'
                      : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary',
                    effectiveCollapsed && 'justify-center'
                  )}
                  title={effectiveCollapsed ? item.label : undefined}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  {activeTab === item.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
                  )}
                  <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    {item.icon}
                  </span>
                  {!effectiveCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default ResponsiveSidebar
