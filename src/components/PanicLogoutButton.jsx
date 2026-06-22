import { useState, useContext } from 'react'
import { useAuth } from '../auth/AuthContext'

let callContextRef = null
export function setCallContextRef(ctx) {
  callContextRef = ctx
}

function PanicLogoutButton() {
  const { logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handlePanicLogout = async () => {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      // End any active call first
      if (callContextRef?.endCall) {
        try {
          await callContextRef.endCall()
        } catch (e) {
          // Ignore call end errors during panic logout
        }
      }

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
