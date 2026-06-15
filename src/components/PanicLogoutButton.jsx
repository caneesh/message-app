import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

function PanicLogoutButton() {
  const { logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handlePanicLogout = async () => {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      // Clear app lock state
      localStorage.removeItem('appLocked')
      localStorage.removeItem('lockTimestamp')

      // Clear any sensitive session state
      sessionStorage.clear()

      // Sign out immediately
      await logout()
    } catch (err) {
      console.error('Panic logout error:', err)
      // Even if logout fails, try to clear local state
      localStorage.removeItem('appLocked')
      setLoggingOut(false)
    }
  }

  return (
    <button
      className="panic-logout-btn"
      onClick={handlePanicLogout}
      disabled={loggingOut}
      aria-label="Quick logout"
      title="Quick logout"
    >
      <span className="panic-logout-icon">⏻</span>
    </button>
  )
}

export default PanicLogoutButton
