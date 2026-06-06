import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { auth } from '../firebase/firebaseConfig'
import {
  onAuthStateChanged,
  signOut,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const recaptchaVerifierRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const setupRecaptcha = () => {
    console.log('[Auth] Setting up reCAPTCHA...')

    // Always clear and recreate to avoid stale DOM references
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear()
        console.log('[Auth] Cleared existing reCAPTCHA')
      } catch (e) {
        console.log('[Auth] Error clearing reCAPTCHA:', e.message)
      }
      recaptchaVerifierRef.current = null
    }

    const container = document.getElementById('recaptcha-container')
    if (!container) {
      console.error('[Auth] recaptcha-container not found in DOM')
      return null
    }
    console.log('[Auth] Found recaptcha-container')

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })
      console.log('[Auth] Created new RecaptchaVerifier')
      return recaptchaVerifierRef.current
    } catch (e) {
      console.error('[Auth] Error creating RecaptchaVerifier:', e.message)
      return null
    }
  }

  const startPhoneLogin = async (phoneNumber) => {
    const appVerifier = setupRecaptcha()
    if (!appVerifier) {
      return { success: false, error: 'reCAPTCHA setup failed. Please refresh and try again.' }
    }
    try {
      console.log('[Auth] Calling signInWithPhoneNumber...')
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
      console.log('[Auth] signInWithPhoneNumber success')
      setConfirmationResult(result)
      return { success: true, confirmationResult: result }
    } catch (error) {
      console.error('[Auth] signInWithPhoneNumber error:', error.code, error.message)
      // Reset recaptcha on error
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear()
        } catch (e) {
          // Ignore
        }
        recaptchaVerifierRef.current = null
      }
      return { success: false, error: getErrorMessage(error.code), code: error.code }
    }
  }

  const confirmPhoneCode = async (code, confirmResultOverride) => {
    const result = confirmResultOverride || confirmationResult
    if (!result) {
      return { success: false, error: 'No verification in progress' }
    }
    try {
      await result.confirm(code)
      setConfirmationResult(null)
      return { success: true }
    } catch (error) {
      return { success: false, error: getErrorMessage(error.code) }
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setConfirmationResult(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value = {
    currentUser,
    loading,
    startPhoneLogin,
    confirmPhoneCode,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

function getErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Please use E.164 format (e.g., +13125551234).'
    case 'auth/too-many-requests':
      return 'Too many requests. Please try again later.'
    case 'auth/invalid-verification-code':
      return 'Invalid verification code. Please try again.'
    case 'auth/code-expired':
      return 'Verification code expired. Please request a new one.'
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please try again.'
    default:
      return 'An error occurred. Please try again.'
  }
}
