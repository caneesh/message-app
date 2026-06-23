/**
 * Service for thought reactions
 */

import { db } from '../firebase/firebaseConfig'
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'

export const THOUGHT_REACTIONS = [
  { key: 'heart', label: 'Felt this', emoji: '❤️' },
  { key: 'comfort', label: 'Comfort', emoji: '🤗' },
  { key: 'sad', label: 'This hurt', emoji: '😢' },
  { key: 'beautiful', label: 'Beautiful', emoji: '✨' },
  { key: 'thanks', label: 'Thank you', emoji: '🙏' }
]

/**
 * Set a reaction on a thought
 */
export async function setThoughtReaction(chatId, thoughtId, uid, reaction) {
  if (!chatId || !thoughtId || !uid || !reaction) {
    return { success: false, error: 'Missing required parameters' }
  }

  const validReactions = THOUGHT_REACTIONS.map(r => r.key)
  if (!validReactions.includes(reaction)) {
    return { success: false, error: 'Invalid reaction value' }
  }

  try {
    const reactionRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'reactions', uid)
    await setDoc(reactionRef, {
      uid,
      reaction,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return { success: true }
  } catch (error) {
    console.error('Error setting thought reaction:', error)
    return { success: false, error: error.message || 'Failed to set reaction' }
  }
}

/**
 * Remove a reaction from a thought
 */
export async function removeThoughtReaction(chatId, thoughtId, uid) {
  if (!chatId || !thoughtId || !uid) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const reactionRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'reactions', uid)
    await deleteDoc(reactionRef)
    return { success: true }
  } catch (error) {
    console.error('Error removing thought reaction:', error)
    return { success: false, error: error.message || 'Failed to remove reaction' }
  }
}

/**
 * Get all reactions for a thought
 */
export async function getThoughtReactions(chatId, thoughtId) {
  if (!chatId || !thoughtId) {
    return { success: false, error: 'Missing required parameters', reactions: [] }
  }

  try {
    const reactionsRef = collection(db, 'chats', chatId, 'thoughts', thoughtId, 'reactions')
    const snapshot = await getDocs(reactionsRef)
    const reactions = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }))
    return { success: true, reactions }
  } catch (error) {
    console.error('Error getting thought reactions:', error)
    return { success: false, error: error.message, reactions: [] }
  }
}

/**
 * Get current user's reaction for a thought
 */
export async function getMyThoughtReaction(chatId, thoughtId, uid) {
  if (!chatId || !thoughtId || !uid) {
    return { success: false, error: 'Missing required parameters', reaction: null }
  }

  try {
    const reactionRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'reactions', uid)
    const snapshot = await getDoc(reactionRef)
    if (snapshot.exists()) {
      return { success: true, reaction: snapshot.data().reaction }
    }
    return { success: true, reaction: null }
  } catch (error) {
    console.error('Error getting my thought reaction:', error)
    return { success: false, error: error.message, reaction: null }
  }
}

/**
 * Count reactions by type
 */
export function countReactionsByType(reactions) {
  const counts = {}
  for (const r of reactions) {
    counts[r.reaction] = (counts[r.reaction] || 0) + 1
  }
  return counts
}

export default {
  THOUGHT_REACTIONS,
  setThoughtReaction,
  removeThoughtReaction,
  getThoughtReactions,
  getMyThoughtReaction,
  countReactionsByType
}
