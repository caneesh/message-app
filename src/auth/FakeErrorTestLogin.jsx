/**
 * FakeErrorTestLogin - DEV/STAGING ONLY
 *
 * Shows a fake "400 Page Not Found" error page where clicking "400"
 * reveals a test login panel. Uses Firebase Phone Auth with test numbers.
 *
 * DO NOT ENABLE IN PRODUCTION.
 */

import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

// Environment configuration
const ENV = {
  enabled: import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true',
  phone1: import.meta.env.VITE_TEST_PHONE_1 || '+11231231234',
  phone2: import.meta.env.VITE_TEST_PHONE_2 || '+11231231235',
  code: import.meta.env.VITE_TEST_CODE || '123456',
  allowedHosts: (import.meta.env.VITE_TEST_LOGIN_ALLOWED_HOSTS || 'localhost,127.0.0.1').split(',').map(h => h.trim()),
}

function isAllowedHostname() {
  if (typeof window === 'undefined') return false

  const hostname = window.location.hostname

  // Always allow localhost and 127.0.0.1
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true
  }

  // Check against allowed hosts from env
  if (ENV.allowedHosts.includes(hostname)) {
    return true
  }

  // Block known production hostnames
  const productionHosts = [
    'message-app-40a70.web.app',
    'message-app-40a70.firebaseapp.com',
  ]
  if (productionHosts.includes(hostname)) {
    return false
  }

  return false
}

function isTestLoginAllowed() {
  return ENV.enabled && isAllowedHostname()
}

// Only create test users if allowed
const getTestUsers = () => {
  if (!isTestLoginAllowed()) return []
  return [
    { label: 'HCSC', phone: ENV.phone1, code: ENV.code },
    { label: 'HCL', phone: ENV.phone2, code: ENV.code },
  ]
}

function FakeErrorTestLogin({ onNormalLoginRequested }) {
  const { startPhoneLogin, confirmPhoneCode } = useAuth()
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  // Log warning in dev only
  useEffect(() => {
    if (isTestLoginAllowed() && import.meta.env.DEV) {
      console.warn('[FakeErrorTestLogin] Test login enabled - DEV/STAGING ONLY')
    }
  }, [])

  const handleTestLogin = async (user) => {
    if (!isTestLoginAllowed()) return

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

  const handleClosePanel = () => {
    setShowPanel(false)
    setError('')
    setStatus('')
    setLoading(null)
  }

  const handleTriggerClick = () => {
    if (!isTestLoginAllowed()) return
    setShowPanel(true)
  }

  // If test login is not allowed, return null (fall back to normal login)
  if (!isTestLoginAllowed()) {
    return null
  }

  const testUsers = getTestUsers()

  return (
    <div className="fake-error-page">
      {/* Fake 400 Error Page */}
      {!showPanel && (
        <div className="fake-error-content">
          <div
            className="fake-error-code"
            onClick={handleTriggerClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTriggerClick() }}
          >
            400
          </div>
          <div className="fake-error-title">Page not found</div>
          <div className="fake-error-subtitle">Something went wrong</div>
        </div>
      )}

      {/* Test Login Panel */}
      {showPanel && (
        <div className="fake-error-panel-overlay" onClick={handleClosePanel}>
          <div className="fake-error-panel" onClick={(e) => e.stopPropagation()}>
            {error && <div className="fake-error-panel-error">{error}</div>}
            {status && <div className="fake-error-panel-status">{status}</div>}

            <div className="fake-error-panel-buttons">
              {testUsers.map((user) => (
                <button
                  key={user.phone}
                  className="fake-error-panel-btn"
                  onClick={() => handleTestLogin(user)}
                  disabled={loading !== null}
                >
                  {loading === user.phone ? 'Signing in...' : user.label}
                </button>
              ))}
              <button
                className="fake-error-panel-btn fake-error-panel-cancel"
                onClick={handleClosePanel}
                disabled={loading !== null}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FakeErrorTestLogin
