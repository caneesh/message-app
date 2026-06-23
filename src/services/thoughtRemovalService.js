/**
 * Thought Removal Request Service
 *
 * Handles emotionally sensitive removal requests for Thoughts.
 * This is soft removal only - no physical deletion occurs.
 */

import { db } from '../firebase/firebaseConfig'
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'

const VALID_FEELINGS = ['hurt', 'upset', 'angry', 'overwhelmed', 'need_space', 'prefer_not_to_say']
const VALID_STATUSES = ['pending', 'accepted', 'dismissed', 'cancelled']
const MAX_NOTE_LENGTH = 500

/**
 * Create a removal request for a Thought
 */
export async function createRemovalRequest(chatId, thoughtId, userId, { feeling, note }) {
  if (!chatId || !thoughtId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  if (!VALID_FEELINGS.includes(feeling)) {
    return { success: false, error: 'Invalid feeling value' }
  }

  if (note && note.length > MAX_NOTE_LENGTH) {
    return { success: false, error: `Note exceeds maximum length of ${MAX_NOTE_LENGTH} characters` }
  }

  try {
    const batch = writeBatch(db)

    // Create removal request
    const requestsRef = collection(db, 'chats', chatId, 'thoughts', thoughtId, 'removalRequests')
    const requestData = {
      chatId,
      thoughtId,
      requestedBy: userId,
      requestedAt: serverTimestamp(),
      feeling,
      note: note?.trim() || null,
      status: 'pending',
      resolvedBy: null,
      resolvedAt: null,
      resolution: null
    }

    const requestRef = doc(requestsRef)
    batch.set(requestRef, requestData)

    // Hide thought from requester's view immediately
    const userStateRef = doc(db, 'chats', chatId, 'thoughtUserState', userId, 'items', thoughtId)
    batch.set(userStateRef, {
      thoughtId,
      userId,
      state: 'hidden_due_to_removal_request',
      source: 'self_request',
      removalRequestId: requestRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await batch.commit()

    return { success: true, requestId: requestRef.id }
  } catch (error) {
    console.error('Error creating removal request:', error)
    return { success: false, error: error.message || 'Failed to create removal request' }
  }
}

/**
 * Get pending removal request for a Thought
 */
export async function getPendingRemovalRequest(chatId, thoughtId) {
  if (!chatId || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const requestsRef = collection(db, 'chats', chatId, 'thoughts', thoughtId, 'removalRequests')
    const q = query(
      requestsRef,
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) {
      return { success: true, request: null }
    }

    const requestDoc = snapshot.docs[0]
    return {
      success: true,
      request: { id: requestDoc.id, ...requestDoc.data() }
    }
  } catch (error) {
    console.error('Error getting removal request:', error)
    return { success: false, error: error.message || 'Failed to get removal request' }
  }
}

/**
 * Cancel a pending removal request (by requester only)
 */
export async function cancelRemovalRequest(chatId, thoughtId, requestId, userId) {
  if (!chatId || !thoughtId || !requestId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const requestRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'removalRequests', requestId)
    const snapshot = await getDoc(requestRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Request not found' }
    }

    const request = snapshot.data()

    if (request.requestedBy !== userId) {
      return { success: false, error: 'Only the requester can cancel' }
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Request is no longer pending' }
    }

    const batch = writeBatch(db)

    // Update request status
    batch.update(requestRef, {
      status: 'cancelled',
      resolvedBy: userId,
      resolvedAt: serverTimestamp(),
      resolution: 'cancelled'
    })

    // Restore requester's view
    const userStateRef = doc(db, 'chats', chatId, 'thoughtUserState', userId, 'items', thoughtId)
    batch.set(userStateRef, {
      thoughtId,
      userId,
      state: 'restored',
      source: 'self_request',
      removalRequestId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await batch.commit()

    return { success: true }
  } catch (error) {
    console.error('Error cancelling removal request:', error)
    return { success: false, error: error.message || 'Failed to cancel request' }
  }
}

/**
 * Accept a removal request (removes thought from both users' view)
 */
export async function acceptRemovalRequest(chatId, thoughtId, requestId, userId, otherUserId) {
  if (!chatId || !thoughtId || !requestId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const requestRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'removalRequests', requestId)
    const snapshot = await getDoc(requestRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Request not found' }
    }

    const request = snapshot.data()

    if (request.status !== 'pending') {
      return { success: false, error: 'Request is no longer pending' }
    }

    // The accepter should not be the requester
    if (request.requestedBy === userId) {
      return { success: false, error: 'Cannot accept your own request' }
    }

    const batch = writeBatch(db)

    // Update request status
    batch.update(requestRef, {
      status: 'accepted',
      resolvedBy: userId,
      resolvedAt: serverTimestamp(),
      resolution: 'removed_from_both'
    })

    // Update thought status
    const thoughtRef = doc(db, 'chats', chatId, 'thoughts', thoughtId)
    batch.update(thoughtRef, {
      status: 'removed_from_both',
      removedFromBothAt: serverTimestamp(),
      removedFromBothBy: userId,
      removalRequestId: requestId
    })

    // Update accepter's user state
    const accepterStateRef = doc(db, 'chats', chatId, 'thoughtUserState', userId, 'items', thoughtId)
    batch.set(accepterStateRef, {
      thoughtId,
      userId,
      state: 'hidden_due_to_removal_request',
      source: 'accepted_removal',
      removalRequestId: requestId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Ensure requester's state is also updated
    const requesterStateRef = doc(db, 'chats', chatId, 'thoughtUserState', request.requestedBy, 'items', thoughtId)
    batch.set(requesterStateRef, {
      thoughtId,
      userId: request.requestedBy,
      state: 'hidden_due_to_removal_request',
      source: 'accepted_removal',
      removalRequestId: requestId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true })

    await batch.commit()

    return { success: true }
  } catch (error) {
    console.error('Error accepting removal request:', error)
    return { success: false, error: error.message || 'Failed to accept request' }
  }
}

/**
 * Dismiss a removal request (thought remains visible to dismisser)
 */
export async function dismissRemovalRequest(chatId, thoughtId, requestId, userId) {
  if (!chatId || !thoughtId || !requestId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const requestRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'removalRequests', requestId)
    const snapshot = await getDoc(requestRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Request not found' }
    }

    const request = snapshot.data()

    if (request.status !== 'pending') {
      return { success: false, error: 'Request is no longer pending' }
    }

    if (request.requestedBy === userId) {
      return { success: false, error: 'Use cancel instead of dismiss for your own request' }
    }

    await updateDoc(requestRef, {
      status: 'dismissed',
      resolvedBy: userId,
      resolvedAt: serverTimestamp(),
      resolution: 'dismissed'
    })

    return { success: true }
  } catch (error) {
    console.error('Error dismissing removal request:', error)
    return { success: false, error: error.message || 'Failed to dismiss request' }
  }
}

/**
 * Get user's thought state (hidden/restored)
 */
export async function getThoughtUserState(chatId, userId, thoughtId) {
  if (!chatId || !userId || !thoughtId) {
    return { success: true, state: null }
  }

  try {
    const stateRef = doc(db, 'chats', chatId, 'thoughtUserState', userId, 'items', thoughtId)
    const snapshot = await getDoc(stateRef)

    if (!snapshot.exists()) {
      return { success: true, state: null }
    }

    return { success: true, state: snapshot.data() }
  } catch (error) {
    console.error('Error getting thought user state:', error)
    return { success: false, error: error.message, state: null }
  }
}

/**
 * Get all hidden thought IDs for a user
 */
export async function getHiddenThoughtIds(chatId, userId) {
  if (!chatId || !userId) {
    return { success: true, hiddenIds: [] }
  }

  try {
    const statesRef = collection(db, 'chats', chatId, 'thoughtUserState', userId, 'items')
    const q = query(statesRef, where('state', '==', 'hidden_due_to_removal_request'))

    const snapshot = await getDocs(q)
    const hiddenIds = snapshot.docs.map(doc => doc.id)

    return { success: true, hiddenIds }
  } catch (error) {
    console.error('Error getting hidden thought IDs:', error)
    return { success: false, error: error.message, hiddenIds: [] }
  }
}

/**
 * Restore user's view of a thought (only if request was dismissed)
 */
export async function restoreThoughtView(chatId, userId, thoughtId) {
  if (!chatId || !userId || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    // Check if thought is removed_from_both (cannot restore)
    const thoughtRef = doc(db, 'chats', chatId, 'thoughts', thoughtId)
    const thoughtSnap = await getDoc(thoughtRef)

    if (thoughtSnap.exists() && thoughtSnap.data().status === 'removed_from_both') {
      return { success: false, error: 'Cannot restore a thought that was removed from both views' }
    }

    const stateRef = doc(db, 'chats', chatId, 'thoughtUserState', userId, 'items', thoughtId)
    await setDoc(stateRef, {
      thoughtId,
      userId,
      state: 'restored',
      source: 'self_request',
      removalRequestId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error restoring thought view:', error)
    return { success: false, error: error.message || 'Failed to restore view' }
  }
}

export const FEELING_LABELS = {
  hurt: 'I feel hurt',
  upset: 'I feel upset',
  angry: 'I feel angry',
  overwhelmed: 'I feel overwhelmed',
  need_space: 'I need space',
  prefer_not_to_say: 'Prefer not to say'
}

export default {
  createRemovalRequest,
  getPendingRemovalRequest,
  cancelRemovalRequest,
  acceptRemovalRequest,
  dismissRemovalRequest,
  getThoughtUserState,
  getHiddenThoughtIds,
  restoreThoughtView,
  FEELING_LABELS
}
