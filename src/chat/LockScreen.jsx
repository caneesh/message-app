import { useState, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { verifyPin } from '../utils/pinSecurity'

const MAX_PIN_ATTEMPTS = 5

function LockScreen({ onUnlock, requirePin = false }) {
  const { logout } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const handleEmergencyLogout = useCallback(async () => {
    setLoggingOut(true)
    try {
      // Clear all sensitive local state
      localStorage.removeItem('appLocked')
      localStorage.removeItem('lockTimestamp')
      localStorage.removeItem('appPinEnabled')
      sessionStorage.clear()
      await logout()
    } catch (err) {
      console.error('Emergency logout error:', err)
      // Force reload to clear state even if logout fails
      window.location.reload()
    }
  }, [logout])

  const handleUnlock = async (e) => {
    e?.preventDefault()

    if (requirePin) {
      if (verifying) return
      setVerifying(true)
      setError('')

      try {
        const isValid = await verifyPin(pin)
        if (isValid) {
          localStorage.setItem('appLocked', 'false')
          setAttempts(0)
          onUnlock()
        } else {
          const newAttempts = attempts + 1
          setAttempts(newAttempts)

          if (newAttempts >= MAX_PIN_ATTEMPTS) {
            setError('Too many failed attempts')
            // Emergency logout after max attempts
            await handleEmergencyLogout()
          } else {
            const remaining = MAX_PIN_ATTEMPTS - newAttempts
            setError(`Incorrect PIN (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left)`)
          }
          setPin('')
        }
      } catch (err) {
        setError('Verification failed')
        setPin('')
      } finally {
        setVerifying(false)
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
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                className="lock-input"
                autoFocus
                disabled={verifying}
              />
              <button type="submit" className="lock-btn" disabled={verifying}>
                {verifying ? 'Verifying...' : 'Unlock'}
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
