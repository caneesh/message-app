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
  const [clickSequence, setClickSequence] = useState([])
  const [clickCount400, setClickCount400] = useState(0)

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

  const handleElementClick = (element) => {
    if (!isTestLoginAllowed()) return

    // Option 1: Click 400 three times
    if (element === '400') {
      const newCount = clickCount400 + 1
      setClickCount400(newCount)
      if (newCount >= 3) {
        setShowPanel(true)
        setClickCount400(0)
        setClickSequence([])
        return
      }
    }

    // Option 2: Click sequence - "Page not found" → "Something went wrong" → "400"
    const expectedSequence = ['title', 'subtitle', '400']
    const newSequence = [...clickSequence, element]

    // Check if sequence matches so far
    let matches = true
    for (let i = 0; i < newSequence.length; i++) {
      if (newSequence[i] !== expectedSequence[i]) {
        matches = false
        break
      }
    }

    if (matches) {
      if (newSequence.length === expectedSequence.length) {
        setShowPanel(true)
        setClickSequence([])
        setClickCount400(0)
      } else {
        setClickSequence(newSequence)
      }
    } else {
      // Reset sequence if wrong order
      setClickSequence(element === 'title' ? ['title'] : [])
    }

    // Reset 400 count after timeout
    setTimeout(() => setClickCount400(0), 2000)
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
            onClick={() => handleElementClick('400')}
          >
            400
          </div>
          <div
            className="fake-error-title"
            onClick={() => handleElementClick('title')}
          >
            Page not found
          </div>
          <div
            className="fake-error-subtitle"
            onClick={() => handleElementClick('subtitle')}
          >
            Something went wrong
          </div>
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
