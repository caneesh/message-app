import { useState, useEffect, type ReactNode } from 'react'
import { PremiumSidebar } from './PremiumSidebar'
import { PremiumMobileNav } from './PremiumMobileNav'
import { cn } from '@/lib/utils'
import type { NavItemId } from '@/types'

interface PremiumShellProps {
  children: ReactNode
  activeTab: NavItemId
  onTabChange: (id: NavItemId) => void
  partnerName?: string
  partnerAvatar?: string
}

export function PremiumShell({
  children,
  activeTab,
  onTabChange,
  partnerName = 'Partner',
  partnerAvatar,
}: PremiumShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="premium-layout">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <PremiumSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          partnerName={partnerName}
          partnerAvatar={partnerAvatar}
        />
      )}

      {/* Main content area */}
      <main
        className={cn(
          'premium-main',
          isMobile && 'pb-20' // space for mobile nav
        )}
      >
        {children}
      </main>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <PremiumMobileNav
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}
    </div>
  )
}

export default PremiumShell
