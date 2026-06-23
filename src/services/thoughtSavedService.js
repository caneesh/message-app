/**
 * Service for saving/favoriting thoughts
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
 * Save a thought to the user's saved list
 */
export async function saveThought(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const savedRef = doc(db, 'chats', chatId, 'thoughtUserState', uid, 'saved', thoughtId)
    await setDoc(savedRef, {
      thoughtId,
      userId: uid,
      saved: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return { success: true }
  } catch (error) {
    console.error('Error saving thought:', error)
    return { success: false, error: error.message || 'Failed to save thought' }
  }
}

/**
 * Remove a thought from the user's saved list
 */
export async function unsaveThought(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const savedRef = doc(db, 'chats', chatId, 'thoughtUserState', uid, 'saved', thoughtId)
    await deleteDoc(savedRef)
    return { success: true }
  } catch (error) {
    console.error('Error unsaving thought:', error)
    return { success: false, error: error.message || 'Failed to unsave thought' }
  }
}

/**
 * Check if a thought is saved
 */
export async function isThoughtSaved(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters', saved: false }
  }

  try {
    const savedRef = doc(db, 'chats', chatId, 'thoughtUserState', uid, 'saved', thoughtId)
    const snapshot = await getDoc(savedRef)
    return { success: true, saved: snapshot.exists() && snapshot.data()?.saved === true }
  } catch (error) {
    console.error('Error checking saved state:', error)
    return { success: false, error: error.message, saved: false }
  }
}

/**
 * Get all saved thought IDs for a user
 */
export async function getSavedThoughtIds(chatId, uid) {
  if (!chatId || !uid) {
    return { success: false, error: 'Missing required parameters', savedIds: [] }
  }

  try {
    const savedRef = collection(db, 'chats', chatId, 'thoughtUserState', uid, 'saved')
    const snapshot = await getDocs(savedRef)
    const savedIds = snapshot.docs
      .filter(doc => doc.data()?.saved === true)
      .map(doc => doc.id)
    return { success: true, savedIds }
  } catch (error) {
    console.error('Error getting saved thought IDs:', error)
    return { success: false, error: error.message, savedIds: [] }
  }
}

export default {
  saveThought,
  unsaveThought,
  isThoughtSaved,
  getSavedThoughtIds
}
