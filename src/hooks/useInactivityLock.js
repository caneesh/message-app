import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'autoLockTimeoutMinutes'
const DEFAULT_TIMEOUT = 5

const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'touchstart',
  'scroll',
  'click',
  'pointerdown',
]

export function useInactivityLock(options = {}) {
  const {
    enabled = true,
    onLock,
    onUnlock,
  } = options

  const [isLocked, setIsLocked] = useState(false)
  const [timeoutMinutes, setTimeoutMinutesState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'never') return 'never'
    const parsed = parseInt(stored, 10)
    return isNaN(parsed) ? DEFAULT_TIMEOUT : parsed
  })

  const timerRef = useRef(null)
  const isActiveRef = useRef(true)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const lock = useCallback(() => {
    if (!isLocked) {
      setIsLocked(true)
      onLock?.()
    }
  }, [isLocked, onLock])

  const unlock = useCallback(() => {
    setIsLocked(false)
    onUnlock?.()
    resetTimer()
  }, [onUnlock])

  const resetTimer = useCallback(() => {
    clearTimer()

    if (!enabled || timeoutMinutes === 'never' || isLocked) {
      return
    }

    const timeoutMs = timeoutMinutes * 60 * 1000
    timerRef.current = setTimeout(() => {
      lock()
    }, timeoutMs)
  }, [enabled, timeoutMinutes, isLocked, clearTimer, lock])

  const handleActivity = useCallback(() => {
    if (!isLocked && enabled && timeoutMinutes !== 'never') {
      resetTimer()
    }
  }, [isLocked, enabled, timeoutMinutes, resetTimer])

  const setTimeoutMinutes = useCallback((value) => {
    const newValue = value === 'never' ? 'never' : parseInt(value, 10)
    setTimeoutMinutesState(newValue)
    localStorage.setItem(STORAGE_KEY, String(newValue))

    // Reset timer with new timeout
    if (newValue === 'never') {
      clearTimer()
    } else if (!isLocked) {
      // Need to reset timer after state update
      setTimeout(() => resetTimer(), 0)
    }
  }, [isLocked, clearTimer, resetTimer])

  const lockNow = useCallback(() => {
    clearTimer()
    lock()
  }, [clearTimer, lock])

  // Set up activity listeners
  useEffect(() => {
    if (!enabled || isLocked) return

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Also track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, isLocked, handleActivity])

  // Initialize timer on mount and when timeout changes
  useEffect(() => {
    if (enabled && !isLocked && timeoutMinutes !== 'never') {
      resetTimer()
    }

    return () => clearTimer()
  }, [enabled, isLocked, timeoutMinutes])

  // Handle page visibility for locking when tab is hidden for too long
  useEffect(() => {
    if (!enabled || timeoutMinutes === 'never') return

    let hiddenTime = null

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTime = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenTime) {
        const elapsed = Date.now() - hiddenTime
        const timeoutMs = timeoutMinutes * 60 * 1000
        if (elapsed >= timeoutMs) {
          lock()
        }
        hiddenTime = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [enabled, timeoutMinutes, lock])

  return {
    isLocked,
    unlock,
    lockNow,
    resetTimer,
    timeoutMinutes,
    setTimeoutMinutes,
  }
}

export default useInactivityLock
