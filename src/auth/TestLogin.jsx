import { useState } from 'react'
import { useAuth } from './AuthContext'

const isTestLoginEnabled = () => {
  return import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true'
}

const TEST_USERS = isTestLoginEnabled() ? [
  { label: 'Test User 1', phone: '+11231231234', code: '123456' },
  { label: 'Test User 2', phone: '+11231231235', code: '123456' },
] : []

function TestLogin() {
  const { startPhoneLogin, confirmPhoneCode } = useAuth()
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const handleTestLogin = async (user) => {
    if (!isTestLoginEnabled()) return

    setLoading(user.phone)
    setError('')
    setStatus('Sending verification code...')

    const startResult = await startPhoneLogin(user.phone)

    if (!startResult.success) {
      setError(startResult.error)
      setStatus('')
      setLoading(null)
      return
    }

    setStatus('Verifying code...')

    const confirmResult = await confirmPhoneCode(user.code)

    if (!confirmResult.success) {
      setError(confirmResult.error)
      setStatus('')
      setLoading(null)
      return
    }

    setStatus('Success!')
  }

  const handleClose = () => {
    setShowPanel(false)
    setError('')
    setStatus('')
    setLoading(null)
  }

  if (!isTestLoginEnabled()) {
    return null
  }

  return (
    <>
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.3)',
            color: 'rgba(255,255,255,0.5)',
            border: 'none',
            borderRadius: 6,
            fontSize: 11,
            cursor: 'pointer',
            zIndex: 9999,
          }}
        >
          Test
        </button>
      )}

      {showPanel && (
        <div className="test-login-overlay">
          <div className="test-login-panel">
            <div className="test-login-header">
              <h3>Test Login</h3>
              <button
                className="test-login-close"
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {error && <div className="test-login-error">{error}</div>}
            {status && <div className="test-login-status">{status}</div>}

            <div className="test-login-buttons">
              {TEST_USERS.map((user) => (
                <button
                  key={user.phone}
                  className="test-login-btn"
                  onClick={() => handleTestLogin(user)}
                  disabled={loading !== null}
                >
                  {loading === user.phone ? 'Signing in...' : user.label}
                </button>
              ))}
            </div>

            <div className="test-login-hint">
              Uses Firebase Phone Auth with test numbers
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TestLogin
