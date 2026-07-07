/**
 * FakeErrorTestLogin - DEV/STAGING ONLY
 *
 * Hidden test login flow using fake error pages.
 * Flow: 400 error → tap "400" 3x → tap top-left → 500 error → double-tap invisible zones
 *
 * Wrong-tap lockout: If user taps wrong areas too many times, lock for 1 minute.
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

// Lockout configuration - DEV/STAGING ONLY
const LOCKOUT_CONFIG = {
  maxWrongTaps: 2,
  lockoutDurationMs: 60 * 1000, // 1 minute
  sequenceTimeoutMs: 5000, // 5 seconds between taps
  sessionStorageKey: 'hiddenLoginLockedUntil',
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

// DEV/STAGING ONLY - Lockout helpers
function getStoredLockoutTime() {
  try {
    const stored = sessionStorage.getItem(LOCKOUT_CONFIG.sessionStorageKey)
    return stored ? parseInt(stored, 10) : 0
  } catch {
    return 0
  }
}

function setStoredLockoutTime(timestamp) {
  try {
    if (timestamp > 0) {
      sessionStorage.setItem(LOCKOUT_CONFIG.sessionStorageKey, String(timestamp))
    } else {
      sessionStorage.removeItem(LOCKOUT_CONFIG.sessionStorageKey)
    }
  } catch {
    // Ignore storage errors
  }
}

function FakeErrorTestLogin() {
  const { startPhoneLogin, confirmPhoneCode } = useAuth()
  const [state, setState] = useState(STATES.ERROR_400)
  const [clickCount400, setClickCount400] = useState(0)
  const [loginError, setLoginError] = useState(null)

  // DEV/STAGING ONLY - Wrong tap lockout state
  const [wrongTapCount, setWrongTapCount] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(() => getStoredLockoutTime())
  const lastTapAtRef = useRef(0)

  // Double-tap tracking for 500 screen zones
  const topZoneTapRef = useRef({ count: 0, lastTap: 0 })
  const bottomZoneTapRef = useRef({ count: 0, lastTap: 0 })
  const resetTimer400 = useRef(null)
  const sequenceTimeoutRef = useRef(null)

  // DEV/STAGING ONLY - Check if currently locked
  const isCurrentlyLocked = useCallback(() => {
    const now = Date.now()
    if (lockedUntil > now) {
      return true
    }
    // Clear expired lockout
    if (lockedUntil > 0 && lockedUntil <= now) {
      setLockedUntil(0)
      setStoredLockoutTime(0)
      setWrongTapCount(0)
    }
    return false
  }, [lockedUntil])

  // DEV/STAGING ONLY - Lock the hidden login flow
  const lockHiddenLogin = useCallback(() => {
    const lockUntil = Date.now() + LOCKOUT_CONFIG.lockoutDurationMs
    setLockedUntil(lockUntil)
    setStoredLockoutTime(lockUntil)
    // Reset gesture state
    setState(STATES.ERROR_400)
    setClickCount400(0)
    setWrongTapCount(0)
    if (import.meta.env.DEV) {
      console.warn('[FakeErrorTestLogin] Locked for 1 minute due to wrong taps')
    }
  }, [])

  // DEV/STAGING ONLY - Record a wrong tap
  const recordWrongTap = useCallback(() => {
    const newCount = wrongTapCount + 1
    setWrongTapCount(newCount)

    if (import.meta.env.DEV) {
      console.log('[FakeErrorTestLogin] Wrong tap count:', newCount)
    }

    if (newCount > LOCKOUT_CONFIG.maxWrongTaps) {
      lockHiddenLogin()
    }
  }, [wrongTapCount, lockHiddenLogin])

  // DEV/STAGING ONLY - Reset gesture state
  const resetGesture = useCallback(() => {
    setState(STATES.ERROR_400)
    setClickCount400(0)
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current)
      sequenceTimeoutRef.current = null
    }
    if (resetTimer400.current) {
      clearTimeout(resetTimer400.current)
      resetTimer400.current = null
    }
  }, [])

  // DEV/STAGING ONLY - Reset wrong tap count on successful sequence
  const resetWrongTaps = useCallback(() => {
    setWrongTapCount(0)
  }, [])

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
      if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current)
    }
  }, [])

  // DEV/STAGING ONLY - Check for sequence timeout
  const checkSequenceTimeout = useCallback(() => {
    const now = Date.now()
    if (lastTapAtRef.current > 0 && now - lastTapAtRef.current > LOCKOUT_CONFIG.sequenceTimeoutMs) {
      // Sequence timed out, reset without counting as wrong tap
      if (state === STATES.ARMED_TOP_LEFT || clickCount400 > 0) {
        resetGesture()
        if (import.meta.env.DEV) {
          console.log('[FakeErrorTestLogin] Sequence timed out, resetting')
        }
      }
      return true
    }
    return false
  }, [state, clickCount400, resetGesture])

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

  // DEV/STAGING ONLY - Helper to check if tap is on 400 text
  const isTapOn400 = useCallback((event) => {
    const target = event.target
    return target.classList.contains('fake-error-code') && target.textContent === '400'
  }, [])

  // DEV/STAGING ONLY - Helper to check if tap is in top-left zone
  const isTapInTopLeftZone = useCallback((event) => {
    const target = event.target
    return target.classList.contains('fake-error-topleft-zone')
  }, [])

  const handle400Click = useCallback(() => {
    if (!isTestLoginAllowed()) return
    if (isCurrentlyLocked()) return
    if (state !== STATES.ERROR_400) return

    // Check for sequence timeout first
    checkSequenceTimeout()

    // Update last tap time
    lastTapAtRef.current = Date.now()

    // Clear existing reset timer
    if (resetTimer400.current) {
      clearTimeout(resetTimer400.current)
    }

    const newCount = clickCount400 + 1
    setClickCount400(newCount)

    if (newCount >= 3) {
      setState(STATES.ARMED_TOP_LEFT)
      setClickCount400(0)

      // Set timeout for top-left tap
      sequenceTimeoutRef.current = setTimeout(() => {
        if (state === STATES.ARMED_TOP_LEFT) {
          resetGesture()
          if (import.meta.env.DEV) {
            console.log('[FakeErrorTestLogin] Top-left tap timeout, resetting')
          }
        }
      }, LOCKOUT_CONFIG.sequenceTimeoutMs)
    } else {
      // Reset count after sequence timeout
      resetTimer400.current = setTimeout(() => {
        setClickCount400(0)
      }, LOCKOUT_CONFIG.sequenceTimeoutMs)
    }
  }, [state, clickCount400, isCurrentlyLocked, checkSequenceTimeout, resetGesture])

  const handleTopLeftClick = useCallback(() => {
    if (!isTestLoginAllowed()) return
    if (isCurrentlyLocked()) return
    if (state !== STATES.ARMED_TOP_LEFT) return

    // Clear sequence timeout
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current)
      sequenceTimeoutRef.current = null
    }

    // Update last tap time
    lastTapAtRef.current = Date.now()

    // Success! Reset wrong tap count and proceed
    resetWrongTaps()
    setState(STATES.ERROR_500)
  }, [state, isCurrentlyLocked, resetWrongTaps])

  // DEV/STAGING ONLY - Handle wrong tap on page background
  const handlePageClick = useCallback((event) => {
    if (!isTestLoginAllowed()) return
    if (isCurrentlyLocked()) return

    // Don't process if we're in 500 state or logging in
    if (state === STATES.ERROR_500 || state === STATES.LOGGING_IN) return

    // Check if tap was on a valid target
    const isOn400 = isTapOn400(event)
    const isInTopLeft = isTapInTopLeftZone(event)

    // In ERROR_400 state, only 400 text is valid
    if (state === STATES.ERROR_400) {
      if (!isOn400) {
        // Wrong tap - but only if the sequence has started
        if (clickCount400 > 0) {
          recordWrongTap()
          resetGesture()
        } else {
          // First tap outside 400 when not in sequence - count as wrong tap
          recordWrongTap()
        }
      }
      return
    }

    // In ARMED_TOP_LEFT state, only top-left zone is valid
    if (state === STATES.ARMED_TOP_LEFT) {
      if (!isInTopLeft) {
        recordWrongTap()
        resetGesture()
      }
      return
    }
  }, [state, clickCount400, isCurrentlyLocked, isTapOn400, isTapInTopLeftZone, recordWrongTap, resetGesture])

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
    <div
      className="fake-error-page"
      onPointerDown={handlePageClick}
    >
      {/* Invisible recaptcha container for Firebase Phone Auth */}
      <div id="recaptcha-container" style={{ position: 'absolute', visibility: 'hidden' }} />

      {/* Hidden top-left trigger zone - only active in ARMED state */}
      {state === STATES.ARMED_TOP_LEFT && !isCurrentlyLocked() && (
        <div
          className="fake-error-topleft-zone"
          onPointerDown={(e) => {
            e.stopPropagation()
            handleTopLeftClick()
          }}
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
            onPointerDown={(e) => {
              e.stopPropagation()
              if (!isCurrentlyLocked()) {
                handle400Click()
              }
            }}
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
            onPointerDown={(e) => {
              e.stopPropagation()
              handleZoneTap('top')
            }}
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
            onPointerDown={(e) => {
              e.stopPropagation()
              handleZoneTap('bottom')
            }}
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
