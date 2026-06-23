/**
 * Service for archiving thoughts
 */

import { db } from '../firebase/firebaseConfig'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'

/**
 * Archive a thought
 */
export async function archiveThought(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const archivedRef = doc(db, 'chats', chatId, 'thoughtUserState', uid, 'archived', thoughtId)
    await setDoc(archivedRef, {
      thoughtId,
      userId: uid,
      archived: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return { success: true }
  } catch (error) {
    console.error('Error archiving thought:', error)
    return { success: false, error: error.message || 'Failed to archive thought' }
  }
}

/**
 * Unarchive a thought
 */
export async function unarchiveThought(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const archivedRef = doc(db, 'chats', chatId, 'thoughtUserState', uid, 'archived', thoughtId)
    await deleteDoc(archivedRef)
    return { success: true }
  } catch (error) {
    console.error('Error unarchiving thought:', error)
    return { success: false, error: error.message || 'Failed to unarchive thought' }
  }
}

/**
 * Check if a thought is archived
 */
export async function isThoughtArchived(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters', archived: false }
  }

  try {
    const archivedRef = doc(db, 'chats', chatId, 'thoughtUserState', uid, 'archived', thoughtId)
    const snapshot = await getDoc(archivedRef)
    return { success: true, archived: snapshot.exists() && snapshot.data()?.archived === true }
  } catch (error) {
    console.error('Error checking archived state:', error)
    return { success: false, error: error.message, archived: false }
  }
}

/**
 * Get all archived thought IDs for a user
 */
export async function getArchivedThoughtIds(chatId, uid) {
  if (!chatId || !uid) {
    return { success: false, error: 'Missing required parameters', archivedIds: [] }
  }

  try {
    const archivedRef = collection(db, 'chats', chatId, 'thoughtUserState', uid, 'archived')
    const snapshot = await getDocs(archivedRef)
    const archivedIds = snapshot.docs
      .filter(doc => doc.data()?.archived === true)
      .map(doc => doc.id)
    return { success: true, archivedIds }
  } catch (error) {
    console.error('Error getting archived thought IDs:', error)
    return { success: false, error: error.message, archivedIds: [] }
  }
}

export default {
  archiveThought,
  unarchiveThought,
  isThoughtArchived,
  getArchivedThoughtIds
}
