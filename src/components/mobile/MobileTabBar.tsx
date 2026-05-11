import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabItem {
  id: string
  label: string
  icon: ReactNode
  badge?: number
}

interface MobileTabBarProps {
  activeTab: string
  onTabChange: (id: string) => void
  items: TabItem[]
  className?: string
}

export function MobileTabBar({
  activeTab,
  onTabChange,
  items,
  className
}: MobileTabBarProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white/90 dark:bg-gray-900/90',
        'backdrop-blur-xl',
        'border-t border-border-light/50',
        className
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      role="tablist"
    >
      <div className="flex items-stretch justify-around h-16">
        {items.map((item) => {
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              className={cn(
                'relative flex flex-col items-center justify-center',
                'flex-1 min-w-[64px] max-w-[120px]',
                'py-2 px-3',
                'transition-all duration-200',
                'active:scale-95',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset'
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center',
                  'w-12 h-8 rounded-2xl mb-0.5',
                  'transition-all duration-300',
                  isActive
                    ? 'bg-accent/15'
                    : 'bg-transparent'
                )}
              >
                <span
                  className={cn(
                    'transition-all duration-200',
                    isActive
                      ? 'text-accent scale-110'
                      : 'text-content-tertiary'
                  )}
                >
                  {item.icon}
                </span>

                {item.badge && item.badge > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1',
                      'min-w-[18px] h-[18px] px-1',
                      'flex items-center justify-center',
                      'bg-danger text-white',
                      'text-[10px] font-bold',
                      'rounded-full',
                      'animate-pulse'
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  'text-[10px] font-medium tracking-wide',
                  'transition-colors duration-200',
                  isActive
                    ? 'text-accent'
                    : 'text-content-tertiary'
                )}
              >
                {item.label}
              </span>

              {isActive && (
                <span
                  className={cn(
                    'absolute bottom-1 left-1/2 -translate-x-1/2',
                    'w-1 h-1 rounded-full bg-accent',
                    'animate-fade-in'
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileTabBar
