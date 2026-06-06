/**
 * FakeErrorTestLogin - DEV/STAGING ONLY
 *
 * Hidden test login flow using fake error pages.
 * Flow: 400 error → tap "400" 3x → tap top-left → 500 error → double-tap invisible zones
 *
 * DO NOT ENABLE IN PRODUCTION.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'

// Environment configuration - DEV/STAGING ONLY
const ENV = {
  enabled: import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true',
  phoneHCSC: import.meta.env.VITE_TEST_PHONE_HCSC || '+11231231234',
  phoneHCL: import.meta.env.VITE_TEST_PHONE_HCL || '+11231231235',
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

  return false
}

function isTestLoginAllowed() {
  return ENV.enabled && isAllowedHostname()
}

// State machine states
const STATES = {
  ERROR_400: 'error400',
  ARMED_TOP_LEFT: 'armedTopLeft',
  ERROR_500: 'error500',
  LOGGING_IN: 'loggingIn',
}

function FakeErrorTestLogin() {
  const { startPhoneLogin, confirmPhoneCode } = useAuth()
  const [state, setState] = useState(STATES.ERROR_400)
  const [clickCount400, setClickCount400] = useState(0)
  const [loginError, setLoginError] = useState(null)

  // Double-tap tracking for 500 screen zones
  const topZoneTapRef = useRef({ count: 0, lastTap: 0 })
  const bottomZoneTapRef = useRef({ count: 0, lastTap: 0 })
  const resetTimer400 = useRef(null)

  // Log warning in dev only - DEV/STAGING ONLY
  useEffect(() => {
    if (isTestLoginAllowed() && import.meta.env.DEV) {
      console.warn('[FakeErrorTestLogin] Test login enabled - DEV/STAGING ONLY')
    }
  }, [])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (resetTimer400.current) clearTimeout(resetTimer400.current)
    }
  }, [])

  const handleTestLogin = useCallback(async (userType) => {
    if (!isTestLoginAllowed()) return

    // Prevent multiple login attempts
    if (state === STATES.LOGGING_IN) {
      console.log('[TestLogin] Already logging in, ignoring')
      return
    }

    setState(STATES.LOGGING_IN)
    setLoginError(null)

    const phone = userType === 'HCSC' ? ENV.phoneHCSC : ENV.phoneHCL
    const code = ENV.code

    console.log('[TestLogin] Starting phone auth for', userType, 'with phone:', phone)

    try {
      const startResult = await startPhoneLogin(phone)
      console.log('[TestLogin] Start result:', startResult)

      if (!startResult.success) {
        console.error('[TestLogin] Start error:', startResult.error)
        setLoginError(startResult.error || 'Authentication failed')
        setState(STATES.ERROR_500)
        return
      }

      console.log('[TestLogin] Confirming code...')

      // Pass the confirmationResult directly to avoid React state timing issues
      const confirmResult = await confirmPhoneCode(code, startResult.confirmationResult)
      console.log('[TestLogin] Confirm result:', confirmResult)

      if (!confirmResult.success) {
        console.error('[TestLogin] Confirm error:', confirmResult.error)
        setLoginError(confirmResult.error || 'Verification failed')
        setState(STATES.ERROR_500)
        return
      }

      console.log('[TestLogin] Success!')
    } catch (err) {
      console.error('[TestLogin] Unexpected error:', err)
      setLoginError('Unexpected error')
      setState(STATES.ERROR_500)
    }
  }, [state, startPhoneLogin, confirmPhoneCode])

  const handle400Click = useCallback(() => {
    if (!isTestLoginAllowed()) return
    if (state !== STATES.ERROR_400) return

    // Clear existing reset timer
    if (resetTimer400.current) {
      clearTimeout(resetTimer400.current)
    }

    const newCount = clickCount400 + 1
    setClickCount400(newCount)

    if (newCount >= 3) {
      setState(STATES.ARMED_TOP_LEFT)
      setClickCount400(0)
    } else {
      // Reset count after 2 seconds of no clicks
      resetTimer400.current = setTimeout(() => {
        setClickCount400(0)
      }, 2000)
    }
  }, [state, clickCount400])

  const handleTopLeftClick = useCallback(() => {
    if (!isTestLoginAllowed()) return
    if (state !== STATES.ARMED_TOP_LEFT) return

    setState(STATES.ERROR_500)
  }, [state])

  const handleZoneTap = useCallback((zone) => {
    if (!isTestLoginAllowed()) return
    if (state !== STATES.ERROR_500) return

    const now = Date.now()
    const tapRef = zone === 'top' ? topZoneTapRef : bottomZoneTapRef
    const otherRef = zone === 'top' ? bottomZoneTapRef : topZoneTapRef

    // Reset other zone
    otherRef.current = { count: 0, lastTap: 0 }

    // Check if within 2 second window
    if (now - tapRef.current.lastTap > 2000) {
      // Reset - too slow or first tap
      tapRef.current = { count: 1, lastTap: now }
      console.log('[TestLogin] First tap on', zone, 'zone')
    } else {
      tapRef.current.count += 1
      tapRef.current.lastTap = now
      console.log('[TestLogin] Tap count on', zone, ':', tapRef.current.count)

      if (tapRef.current.count >= 2) {
        // Double tap detected - login
        const userType = zone === 'top' ? 'HCSC' : 'HCL'
        console.log('[TestLogin] Double tap detected, logging in as', userType)
        tapRef.current = { count: 0, lastTap: 0 }
        handleTestLogin(userType)
      }
    }
  }, [state, handleTestLogin])

  // If test login is not allowed, render nothing
  if (!isTestLoginAllowed()) {
    return null
  }

  return (
    <div className="fake-error-page">
      {/* Invisible recaptcha container for Firebase Phone Auth */}
      <div id="recaptcha-container" style={{ position: 'absolute', visibility: 'hidden' }} />
      {/* Hidden top-left trigger zone - only active in ARMED state */}
      {state === STATES.ARMED_TOP_LEFT && (
        <div
          className="fake-error-topleft-zone"
          onClick={handleTopLeftClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '80px',
            height: '80px',
            zIndex: 9999,
            cursor: 'default',
            background: 'transparent',
          }}
        />
      )}

      {/* 400 Error Page */}
      {(state === STATES.ERROR_400 || state === STATES.ARMED_TOP_LEFT) && (
        <div className="fake-error-content">
          <div
            className="fake-error-code"
            onClick={handle400Click}
            style={{ cursor: 'default', userSelect: 'none' }}
          >
            400
          </div>
          <div className="fake-error-title">
            Page Not Found
          </div>
        </div>
      )}

      {/* 500 Error Page with invisible login zones */}
      {(state === STATES.ERROR_500 || state === STATES.LOGGING_IN) && (
        <div className="fake-error-content" style={{ position: 'relative' }}>
          {/* Top invisible zone - HCSC */}
          <div
            onClick={() => handleZoneTap('top')}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '40%',
              zIndex: 100,
              cursor: 'default',
              background: 'transparent',
            }}
          />

          {/* Bottom invisible zone - HCL */}
          <div
            onClick={() => handleZoneTap('bottom')}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40%',
              zIndex: 100,
              cursor: 'default',
              background: 'transparent',
            }}
          />

          <div className="fake-error-code" style={{ userSelect: 'none' }}>
            500
          </div>
          <div className="fake-error-title">
            Internal Server Error
          </div>
          {state === STATES.LOGGING_IN && (
            <div className="fake-error-subtitle" style={{ marginTop: '20px', opacity: 0.6 }}>
              Please wait...
            </div>
          )}
          {loginError && (
            <div className="fake-error-subtitle" style={{ marginTop: '20px', color: '#e74c3c' }}>
              {loginError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FakeErrorTestLogin
