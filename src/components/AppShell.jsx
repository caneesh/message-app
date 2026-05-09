import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'

function AppShell({
  activeTab,
  onTabChange,
  darkMode,
  onToggleDarkMode,
  notificationsEnabled,
  onToggleNotifications,
  notificationStatus,
  showNotificationBtn,
  onLogout,
  searchQuery,
  onSearchChange,
  children,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed)
  }, [sidebarCollapsed])

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {!isMobile && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {isMobile && (
        <MobileDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}

      <div className="app-main">
        <header className="app-header">
          {isMobile && (
            <button
              className="hamburger-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              ☰
            </button>
          )}
          {isMobile && <h1 className="mobile-title">OneRoom</h1>}
          <div className="header-actions">
            <div className="search-container" role="search">
              <input
                type="text"
                className="search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search messages"
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => onSearchChange('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <button
              className="theme-btn"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Light mode' : 'Dark mode'}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            {showNotificationBtn && (
              <button
                className={`notification-btn ${notificationsEnabled ? 'enabled' : ''}`}
                onClick={onToggleNotifications}
                disabled={notificationStatus === 'requesting'}
                title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                aria-label={notificationsEnabled ? 'Disable push notifications' : 'Enable push notifications'}
              >
                {notificationStatus === 'requesting' ? '...' : notificationsEnabled ? '🔔' : '🔕'}
              </button>
            )}
            <button className="logout-btn" onClick={onLogout} aria-label="Log out">
              Log out
            </button>
          </div>
        </header>
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell
