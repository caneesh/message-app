import { useEffect, useRef } from 'react'
import { navItems } from './Sidebar'

function MobileDrawer({ isOpen, onClose, activeTab, onTabChange }) {
  const drawerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleNavClick = (id) => {
    onTabChange(id)
    onClose()
  }

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className={`mobile-drawer ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="drawer-header">
          <h2>OneRoom</h2>
          <button
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <nav className="drawer-nav" role="navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`drawer-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}

export default MobileDrawer
