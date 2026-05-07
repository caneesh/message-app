import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

const missingVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
)

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}. ` +
    'Please check your .env file.'
  )
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)

// Export private chat ID for use in chat components
export const PRIVATE_CHAT_ID = import.meta.env.VITE_PRIVATE_CHAT_ID

// FCM setup (optional - requires VITE_FIREBASE_VAPID_KEY)
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || null

let messagingInstance = null

export const getMessagingInstance = async () => {
  if (!VAPID_KEY) return null
  if (messagingInstance) return messagingInstance

  const supported = await isSupported()
  if (!supported) return null

  messagingInstance = getMessaging(app)
  return messagingInstance
}

export const requestNotificationPermission = async () => {
  if (!VAPID_KEY) {
    console.log('FCM VAPID key not configured')
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return null
    }

    const messaging = await getMessagingInstance()
    if (!messaging) return null

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    return token
  } catch (err) {
    console.error('Error getting FCM token:', err)
    return null
  }
}
