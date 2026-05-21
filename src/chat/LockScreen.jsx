import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

function LockScreen({ onUnlock, requirePin = false }) {
  const { logout } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const handleUnlock = (e) => {
    e?.preventDefault()

    if (requirePin) {
      const storedPin = localStorage.getItem('appPin')
      if (pin === storedPin) {
        localStorage.setItem('appLocked', 'false')
        onUnlock()
      } else {
        setError('Incorrect PIN')
        setPin('')
      }
    } else {
      onUnlock()
    }
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } catch (err) {
      console.error('Logout error:', err)
      setLoggingOut(false)
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-container">
        <div className="lock-icon">🔒</div>
        <h2>App Locked</h2>

        {requirePin ? (
          <>
            <p className="lock-subtitle">Enter your PIN to unlock</p>
            <form onSubmit={handleUnlock}>
              {error && <div className="lock-error">{error}</div>}
              <input
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                className="lock-input"
                autoFocus
              />
              <button type="submit" className="lock-btn">
                Unlock
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="lock-subtitle">Tap to continue</p>
            <button className="lock-btn" onClick={handleUnlock}>
              Unlock
            </button>
          </>
        )}

        <button
          className="lock-logout-btn"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Logging out...' : 'Log out'}
        </button>
      </div>
    </div>
  )
}

export default LockScreen
