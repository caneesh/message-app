/**
 * Service for thought reminders
 */

import { db } from '../firebase/firebaseConfig'
import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

/**
 * Create a reminder for a thought
 */
export async function createThoughtReminder(chatId, uid, thoughtId, remindAt, note = null) {
  if (!chatId || !uid || !thoughtId || !remindAt) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const remindersRef = collection(db, 'chats', chatId, 'thoughtReminders', uid, 'items')
    const reminderData = {
      thoughtId,
      userId: uid,
      remindAt: Timestamp.fromDate(remindAt),
      status: 'active',
      note: note || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    const docRef = await addDoc(remindersRef, reminderData)

    // Update with reminderId
    await updateDoc(docRef, { reminderId: docRef.id })

    return { success: true, reminderId: docRef.id }
  } catch (error) {
    console.error('Error creating thought reminder:', error)
    return { success: false, error: error.message || 'Failed to create reminder' }
  }
}

/**
 * Get all active reminders for a user
 */
export async function getActiveThoughtReminders(chatId, uid) {
  if (!chatId || !uid) {
    return { success: false, error: 'Missing required parameters', reminders: [] }
  }

  try {
    const remindersRef = collection(db, 'chats', chatId, 'thoughtReminders', uid, 'items')
    const q = query(
      remindersRef,
      where('status', '==', 'active'),
      orderBy('remindAt', 'asc')
    )
    const snapshot = await getDocs(q)
    const reminders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    return { success: true, reminders }
  } catch (error) {
    console.error('Error getting thought reminders:', error)
    return { success: false, error: error.message, reminders: [] }
  }
}

/**
 * Get reminders for a specific thought
 */
export async function getRemindersForThought(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters', reminders: [] }
  }

  try {
    const remindersRef = collection(db, 'chats', chatId, 'thoughtReminders', uid, 'items')
    const q = query(
      remindersRef,
      where('thoughtId', '==', thoughtId),
      where('status', '==', 'active')
    )
    const snapshot = await getDocs(q)
    const reminders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    return { success: true, reminders }
  } catch (error) {
    console.error('Error getting reminders for thought:', error)
    return { success: false, error: error.message, reminders: [] }
  }
}

/**
 * Mark a reminder as completed
 */
export async function completeThoughtReminder(chatId, uid, reminderId) {
  if (!chatId || !uid || !reminderId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const reminderRef = doc(db, 'chats', chatId, 'thoughtReminders', uid, 'items', reminderId)
    await updateDoc(reminderRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return { success: true }
  } catch (error) {
    console.error('Error completing thought reminder:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancel a reminder
 */
export async function cancelThoughtReminder(chatId, uid, reminderId) {
  if (!chatId || !uid || !reminderId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const reminderRef = doc(db, 'chats', chatId, 'thoughtReminders', uid, 'items', reminderId)
    await updateDoc(reminderRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    })
    return { success: true }
  } catch (error) {
    console.error('Error cancelling thought reminder:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get due reminders (past remindAt time)
 */
export async function getDueThoughtReminders(chatId, uid) {
  if (!chatId || !uid) {
    return { success: false, error: 'Missing required parameters', reminders: [] }
  }

  try {
    const now = Timestamp.now()
    const remindersRef = collection(db, 'chats', chatId, 'thoughtReminders', uid, 'items')
    const q = query(
      remindersRef,
      where('status', '==', 'active'),
      where('remindAt', '<=', now)
    )
    const snapshot = await getDocs(q)
    const reminders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    return { success: true, reminders }
  } catch (error) {
    console.error('Error getting due thought reminders:', error)
    return { success: false, error: error.message, reminders: [] }
  }
}

export default {
  createThoughtReminder,
  getActiveThoughtReminders,
  getRemindersForThought,
  completeThoughtReminder,
  cancelThoughtReminder,
  getDueThoughtReminders
}
