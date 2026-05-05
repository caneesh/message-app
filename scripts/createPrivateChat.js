import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { config } from 'dotenv'

// Load environment variables from .env.admin
config({ path: '.env.admin' })

// Required environment variables
const requiredVars = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'PRIVATE_CHAT_ID',
  'USER_ID_1',
  'USER_ID_2',
]

// Validate environment variables
const missingVars = requiredVars.filter((v) => !process.env[v])
if (missingVars.length > 0) {
  console.error('Missing required environment variables:')
  missingVars.forEach((v) => console.error(`  - ${v}`))
  console.error('\nPlease check your .env.admin file.')
  process.exit(1)
}

const { GOOGLE_APPLICATION_CREDENTIALS, PRIVATE_CHAT_ID, USER_ID_1, USER_ID_2 } = process.env

// Initialize Firebase Admin
try {
  initializeApp({
    credential: cert(GOOGLE_APPLICATION_CREDENTIALS),
  })
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:')
  console.error(error.message)
  process.exit(1)
}

const db = getFirestore()

async function createPrivateChat() {
  const chatRef = db.collection('chats').doc(PRIVATE_CHAT_ID)

  try {
    const doc = await chatRef.get()

    if (doc.exists) {
      // Update existing chat, preserve createdAt
      await chatRef.update({
        members: [USER_ID_1, USER_ID_2],
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log(`Updated existing chat: ${PRIVATE_CHAT_ID}`)
    } else {
      // Create new chat
      await chatRef.set({
        members: [USER_ID_1, USER_ID_2],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log(`Created new chat: ${PRIVATE_CHAT_ID}`)
    }

    console.log(`Members: ${USER_ID_1}, ${USER_ID_2}`)
    console.log('\nNext steps:')
    console.log(`1. Add VITE_PRIVATE_CHAT_ID=${PRIVATE_CHAT_ID} to your frontend .env`)
    console.log('2. Deploy Firestore rules: firebase deploy --only firestore:rules')
  } catch (error) {
    console.error('Failed to create/update chat:')
    console.error(error.message)
    process.exit(1)
  }
}

createPrivateChat()
