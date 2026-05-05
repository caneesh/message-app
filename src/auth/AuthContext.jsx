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
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })
    }
    return recaptchaVerifierRef.current
  }

  const startPhoneLogin = async (phoneNumber) => {
    const appVerifier = setupRecaptcha()
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
      setConfirmationResult(result)
      return { success: true }
    } catch (error) {
      // Reset recaptcha on error
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
      return { success: false, error: getErrorMessage(error.code) }
    }
  }

  const confirmPhoneCode = async (code) => {
    if (!confirmationResult) {
      return { success: false, error: 'No verification in progress' }
    }
    try {
      await confirmationResult.confirm(code)
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
