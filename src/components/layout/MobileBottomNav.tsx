import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { NavItemId } from '@/types'

interface NavItem {
  id: NavItemId
  label: string
  icon: ReactNode
}

interface MobileBottomNavProps {
  activeTab: NavItemId
  onTabChange: (id: NavItemId) => void
  items: NavItem[]
}

export function MobileBottomNav({ activeTab, onTabChange, items }: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 md:hidden',
        'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl',
        'border-t border-border-light',
        'pb-safe'
      )}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1',
              'w-full h-full px-2',
              'transition-all duration-200',
              'focus:outline-none',
              activeTab === item.id
                ? 'text-accent'
                : 'text-content-tertiary'
            )}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <span
              className={cn(
                'w-6 h-6 flex items-center justify-center',
                'transition-transform duration-200',
                activeTab === item.id && 'scale-110'
              )}
            >
              {item.icon}
            </span>
            <span className="text-2xs font-medium truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default MobileBottomNav
