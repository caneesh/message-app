import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'

const PROJECT_ID = 'test-project'
const CHAT_ID = 'test-chat'
const USER_A_ID = 'user-a'
const USER_B_ID = 'user-b'
const NON_MEMBER_ID = 'non-member'

let testEnv

async function setupTestEnvironment() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
}

function getFirestore(auth) {
  return auth
    ? testEnv.authenticatedContext(auth.uid).firestore()
    : testEnv.unauthenticatedContext().firestore()
}

async function setupChat() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'chats', CHAT_ID), {
      members: [USER_A_ID, USER_B_ID],
      createdAt: new Date(),
      lastReadAt: {},
    })
  })
}

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    await setupTestEnvironment()
  })

  afterAll(async () => {
    await testEnv?.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
    await setupChat()
  })

  describe('Chat Access', () => {
    it('unauthenticated user cannot read chat', async () => {
      const db = getFirestore(null)
      await assertFails(getDoc(doc(db, 'chats', CHAT_ID)))
    })

    it('non-member cannot read chat', async () => {
      const db = getFirestore({ uid: NON_MEMBER_ID })
      await assertFails(getDoc(doc(db, 'chats', CHAT_ID)))
    })

    it('member can read chat', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(getDoc(doc(db, 'chats', CHAT_ID)))
    })

    it('user cannot update chat members', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(
        updateDoc(doc(db, 'chats', CHAT_ID), {
          members: [USER_A_ID, USER_B_ID, NON_MEMBER_ID],
        })
      )
    })

    it('user cannot create new chat', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(
        setDoc(doc(db, 'chats', 'new-chat'), {
          members: [USER_A_ID, USER_B_ID],
        })
      )
    })
  })

  describe('Messages', () => {
    it('non-member cannot read messages', async () => {
      const db = getFirestore({ uid: NON_MEMBER_ID })
      await assertFails(getDoc(doc(db, 'chats', CHAT_ID, 'messages', 'msg1')))
    })

    it('member can read messages', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      const messagesRef = collection(db, 'chats', CHAT_ID, 'messages')
      await assertSucceeds(getDoc(doc(messagesRef, 'nonexistent')))
    })

    it('user can create own text message', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(
        addDoc(collection(db, 'chats', CHAT_ID, 'messages'), {
          senderId: USER_A_ID,
          senderPhone: '+1234567890',
          type: 'text',
          text: 'Hello world',
          createdAt: serverTimestamp(),
        })
      )
    })

    it('user cannot spoof senderId', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(
        addDoc(collection(db, 'chats', CHAT_ID, 'messages'), {
          senderId: USER_B_ID,
          senderPhone: '+1234567890',
          type: 'text',
          text: 'Spoofed message',
          createdAt: serverTimestamp(),
        })
      )
    })

    it('user cannot create empty message', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(
        addDoc(collection(db, 'chats', CHAT_ID, 'messages'), {
          senderId: USER_A_ID,
          senderPhone: '+1234567890',
          type: 'text',
          text: '',
          createdAt: serverTimestamp(),
        })
      )
    })

    it('user cannot create oversized message', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      const oversizedText = 'x'.repeat(2001)
      await assertFails(
        addDoc(collection(db, 'chats', CHAT_ID, 'messages'), {
          senderId: USER_A_ID,
          senderPhone: '+1234567890',
          type: 'text',
          text: oversizedText,
          createdAt: serverTimestamp(),
        })
      )
    })

    it('user can delete own message', async () => {
      const msgId = 'msg-to-delete'
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore()
        await setDoc(doc(db, 'chats', CHAT_ID, 'messages', msgId), {
          senderId: USER_A_ID,
          senderPhone: '+1234567890',
          type: 'text',
          text: 'Message to delete',
          createdAt: new Date(),
        })
      })

      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(deleteDoc(doc(db, 'chats', CHAT_ID, 'messages', msgId)))
    })

    it('user cannot delete other user message', async () => {
      const msgId = 'msg-from-b'
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore()
        await setDoc(doc(db, 'chats', CHAT_ID, 'messages', msgId), {
          senderId: USER_B_ID,
          senderPhone: '+0987654321',
          type: 'text',
          text: 'Message from B',
          createdAt: new Date(),
        })
      })

      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(deleteDoc(doc(db, 'chats', CHAT_ID, 'messages', msgId)))
    })
  })

  describe('Notes', () => {
    it('non-member cannot read notes', async () => {
      const db = getFirestore({ uid: NON_MEMBER_ID })
      await assertFails(getDoc(doc(db, 'chats', CHAT_ID, 'notes', 'note1')))
    })

    it('member can create note', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(
        addDoc(collection(db, 'chats', CHAT_ID, 'notes'), {
          title: 'Test Note',
          content: 'Note content',
          createdBy: USER_A_ID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    })

    it('user cannot spoof createdBy on note', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(
        addDoc(collection(db, 'chats', CHAT_ID, 'notes'), {
          title: 'Spoofed Note',
          content: 'Content',
          createdBy: USER_B_ID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    })
  })

  describe('Reminders', () => {
    it('non-member cannot read reminders', async () => {
      const db = getFirestore({ uid: NON_MEMBER_ID })
      await assertFails(getDoc(doc(db, 'chats', CHAT_ID, 'reminders', 'rem1')))
    })

    it('member can create reminder', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(
        addDoc(collection(db, 'chats', CHAT_ID, 'reminders'), {
          title: 'Test Reminder',
          dueAt: new Date(),
          createdBy: USER_A_ID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          completed: false,
        })
      )
    })
  })

  describe('Lists', () => {
    it('non-member cannot read lists', async () => {
      const db = getFirestore({ uid: NON_MEMBER_ID })
      await assertFails(getDoc(doc(db, 'chats', CHAT_ID, 'lists', 'list1')))
    })

    it('member can create list', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(
        addDoc(collection(db, 'chats', CHAT_ID, 'lists'), {
          name: 'Test List',
          createdBy: USER_A_ID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    })
  })

  describe('Memories', () => {
    it('non-member cannot read memories', async () => {
      const db = getFirestore({ uid: NON_MEMBER_ID })
      await assertFails(getDoc(doc(db, 'chats', CHAT_ID, 'memories', 'mem1')))
    })

    it('member can create memory', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(
        addDoc(collection(db, 'chats', CHAT_ID, 'memories'), {
          title: 'Test Memory',
          description: 'Memory description',
          date: new Date().toISOString(),
          createdBy: USER_A_ID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    })
  })

  describe('Events', () => {
    it('non-member cannot read events', async () => {
      const db = getFirestore({ uid: NON_MEMBER_ID })
      await assertFails(getDoc(doc(db, 'chats', CHAT_ID, 'events', 'event1')))
    })

    it('member can create event', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(
        addDoc(collection(db, 'chats', CHAT_ID, 'events'), {
          title: 'Test Event',
          startAt: new Date().toISOString(),
          createdBy: USER_A_ID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    })
  })

  describe('User Data', () => {
    it('user can only access own fcmTokens', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(
        setDoc(doc(db, 'users', USER_A_ID, 'fcmTokens', 'token1'), {
          token: 'test-token',
          createdAt: serverTimestamp(),
        })
      )
    })

    it('user cannot access other user fcmTokens', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(
        setDoc(doc(db, 'users', USER_B_ID, 'fcmTokens', 'token1'), {
          token: 'test-token',
          createdAt: serverTimestamp(),
        })
      )
    })
  })

  describe('Account Deletion Requests', () => {
    it('user can create own deletion request', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertSucceeds(
        setDoc(doc(db, 'accountDeletionRequests', USER_A_ID), {
          uid: USER_A_ID,
          requestedAt: serverTimestamp(),
          status: 'pending',
        })
      )
    })

    it('user cannot create deletion request for other user', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(
        setDoc(doc(db, 'accountDeletionRequests', USER_B_ID), {
          uid: USER_B_ID,
          requestedAt: serverTimestamp(),
          status: 'pending',
        })
      )
    })

    it('user cannot set deletion status to non-pending', async () => {
      const db = getFirestore({ uid: USER_A_ID })
      await assertFails(
        setDoc(doc(db, 'accountDeletionRequests', USER_A_ID), {
          uid: USER_A_ID,
          requestedAt: serverTimestamp(),
          status: 'completed',
        })
      )
    })
  })
})
