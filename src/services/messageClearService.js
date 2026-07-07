/**
 * Message Clear Service
 * Handles soft-delete/archive of messages using per-user cutoff timestamps
 * Messages are NOT hard deleted - they remain available for export
 */

import { db } from '../firebase/firebaseConfig'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

/**
 * Get the user's message clear state for a chat
 * @param {string} chatId - The chat ID
 * @param {string} userId - The user's ID
 * @returns {Object} - { success, clearState, error }
 */
export async function getMessageClearState(chatId, userId) {
  if (!chatId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const clearStateRef = doc(db, 'chats', chatId, 'messageClearState', userId)
    const snapshot = await getDoc(clearStateRef)

    if (!snapshot.exists()) {
      return { success: true, clearState: null }
    }

    return { success: true, clearState: snapshot.data() }
  } catch (error) {
    console.error('Error getting message clear state:', error)
    return { success: false, error: error.message || 'Failed to get clear state' }
  }
}

/**
 * Clear all visible messages for a user (soft delete)
 * This sets a cutoff timestamp - messages before this time are hidden from chat view
 * Messages are NOT deleted and remain available for export
 *
 * @param {string} chatId - The chat ID
 * @param {string} userId - The user's ID
 * @returns {Object} - { success, clearedCount, error }
 */
export async function clearAllMessagesForUser(chatId, userId) {
  if (!chatId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    // Get current clear state to count only newly visible messages
    const clearStateRef = doc(db, 'chats', chatId, 'messageClearState', userId)
    const currentState = await getDoc(clearStateRef)
    const previousCutoff = currentState.exists() ? currentState.data().clearedAt : null

    // Count messages that will be cleared (for user feedback)
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    let messagesQuery

    if (previousCutoff) {
      // Only count messages after the previous cutoff
      messagesQuery = query(
        messagesRef,
        where('createdAt', '>', previousCutoff),
        orderBy('createdAt', 'desc')
      )
    } else {
      // Count all messages
      messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'))
    }

    const snapshot = await getDocs(messagesQuery)
    const messageCount = snapshot.docs.length

    if (messageCount === 0) {
      return { success: true, clearedCount: 0, message: 'No messages to clear' }
    }

    // Count media files in the messages being cleared
    let mediaCount = 0
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data()
      if (data.type === 'file' || data.type === 'video' || data.type === 'voice') {
        mediaCount++
      }
      if (data.type === 'attachment_bundle') {
        mediaCount += data.attachmentCount || 0
      }
    })

    // Set the new cutoff to now
    const now = serverTimestamp()
    const clearData = {
      clearedAt: now,
      clearedBy: userId,
      messageCount,
      mediaCount,
      updatedAt: now,
      // Keep history of clear batches
      clearHistory: currentState.exists() && currentState.data().clearHistory
        ? [...currentState.data().clearHistory, {
            clearedAt: currentState.data().clearedAt,
            messageCount: currentState.data().messageCount || 0,
            mediaCount: currentState.data().mediaCount || 0
          }]
        : []
    }

    await setDoc(clearStateRef, clearData)

    console.log('[MESSAGE_CLEAR] Cleared messages for user:', {
      chatId: chatId?.slice?.(-6),
      userId: userId?.slice?.(-6),
      messageCount,
      mediaCount,
    })

    return {
      success: true,
      clearedCount: messageCount,
      mediaCount,
      message: `Cleared ${messageCount} messages from chat view`
    }
  } catch (error) {
    console.error('Error clearing messages:', error)
    return { success: false, error: error.message || 'Failed to clear messages' }
  }
}

/**
 * Check if a message is cleared/hidden for a user
 * @param {Object} message - The message object with createdAt
 * @param {Object} clearState - The user's clear state with clearedAt
 * @returns {boolean} - True if message is hidden
 */
export function isMessageCleared(message, clearState) {
  if (!clearState?.clearedAt) return false
  if (!message?.createdAt) return false

  const clearedAtMs = clearState.clearedAt.toMillis?.() || clearState.clearedAt
  const messageAtMs = message.createdAt.toMillis?.() || message.createdAt

  return messageAtMs <= clearedAtMs
}

/**
 * Filter messages to show only visible ones (not cleared)
 * @param {Array} messages - Array of message objects
 * @param {Object} clearState - The user's clear state
 * @returns {Array} - Filtered messages
 */
export function filterVisibleMessages(messages, clearState) {
  if (!clearState?.clearedAt) return messages

  return messages.filter(msg => !isMessageCleared(msg, clearState))
}

/**
 * Get all messages for export (including cleared/archived ones)
 * @param {string} chatId - The chat ID
 * @param {string} userId - The user's ID (for adding archive metadata)
 * @returns {Object} - { success, messages, error }
 */
export async function getAllMessagesForExport(chatId, userId) {
  if (!chatId) {
    return { success: false, error: 'Missing chatId', messages: [] }
  }

  try {
    // Get user's clear state
    const clearState = userId ? await getMessageClearState(chatId, userId) : null

    // Get ALL messages
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))
    const snapshot = await getDocs(q)

    const messages = snapshot.docs.map(docSnap => {
      const data = docSnap.data()
      const message = {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }

      // Add archive metadata if message was cleared
      if (clearState?.success && clearState.clearState) {
        if (isMessageCleared(data, clearState.clearState)) {
          message.clearedFromChatView = true
          message.clearedAt = clearState.clearState.clearedAt?.toDate?.()?.toISOString() || null
        }
      }

      return message
    })

    return { success: true, messages }
  } catch (error) {
    console.error('Error getting messages for export:', error)
    return { success: false, error: error.message, messages: [] }
  }
}

export default {
  getMessageClearState,
  clearAllMessagesForUser,
  isMessageCleared,
  filterVisibleMessages,
  getAllMessagesForExport
}
