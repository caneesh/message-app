import { useState } from 'react'

const navItems = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'reminders', icon: '⏰', label: 'Reminders' },
  { id: 'notes', icon: '📝', label: 'Notes' },
  { id: 'events', icon: '📅', label: 'Events' },
  { id: 'lists', icon: '📋', label: 'Lists' },
  { id: 'decisions', icon: '⚖️', label: 'Decisions' },
  { id: 'promises', icon: '🤝', label: 'Promises' },
  { id: 'followups', icon: '🔔', label: 'Follow-ups' },
  { id: 'capsules', icon: '📦', label: 'Capsules' },
  { id: 'misunderstandings', icon: '🕊️', label: 'Clear the Air' },
  { id: 'vault', icon: '🔐', label: 'Vault' },
  { id: 'checkin', icon: '💚', label: 'Check-in' },
  { id: 'care', icon: '🏥', label: 'Care Mode' },
  { id: 'memories', icon: '📸', label: 'Memories' },
  { id: 'devices', icon: '📱', label: 'Devices' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h1 className="sidebar-logo">{collapsed ? 'OR' : 'OneRoom'}</h1>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={item.label}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export { navItems }
export default Sidebar
