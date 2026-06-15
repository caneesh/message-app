import { db, storage } from '../firebase/firebaseConfig'
import { doc, deleteDoc, writeBatch } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { deleteMediaForMe } from './userMediaStateService'

const BATCH_LIMIT = 500

/**
 * Bulk delete messages for the current user only (soft delete)
 * This hides messages from the current user's view without affecting the other user
 *
 * @param {string} chatId - The chat ID
 * @param {Array} messages - Array of message objects to delete
 * @param {string} userId - The current user's ID
 * @returns {Object} - { success, deletedCount, errors }
 */
export async function bulkDeleteForMe(chatId, messages, userId) {
  if (!chatId || !messages?.length || !userId) {
    return { success: false, error: 'Missing required parameters', deletedCount: 0 }
  }

  const errors = []
  let deletedCount = 0

  for (const message of messages) {
    try {
      const mediaKind = getMediaKind(message)
      await deleteMediaForMe(chatId, userId, message.id, mediaKind)
      deletedCount++
    } catch (err) {
      errors.push({ messageId: message.id, error: err.message })
    }
  }

  return {
    success: errors.length === 0,
    deletedCount,
    errors: errors.length > 0 ? errors : undefined
  }
}

/**
 * Bulk delete messages for everyone (hard delete)
 * Only the sender can delete their own messages
 *
 * @param {string} chatId - The chat ID
 * @param {Array} messages - Array of message objects to delete
 * @param {string} userId - The current user's ID
 * @returns {Object} - { success, deletedCount, skippedCount, errors }
 */
export async function bulkDeleteForEveryone(chatId, messages, userId) {
  if (!chatId || !messages?.length || !userId) {
    return { success: false, error: 'Missing required parameters', deletedCount: 0 }
  }

  // Filter to only messages owned by the user
  const ownMessages = messages.filter(m => m.senderId === userId)
  const skippedCount = messages.length - ownMessages.length

  if (ownMessages.length === 0) {
    return {
      success: false,
      error: 'You can only delete your own messages for everyone',
      deletedCount: 0,
      skippedCount
    }
  }

  const errors = []
  let deletedCount = 0

  // Process in batches to respect Firestore limits
  for (let i = 0; i < ownMessages.length; i += BATCH_LIMIT) {
    const batchMessages = ownMessages.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)

    for (const message of batchMessages) {
      const messageRef = doc(db, 'chats', chatId, 'messages', message.id)
      batch.delete(messageRef)
    }

    try {
      await batch.commit()
      deletedCount += batchMessages.length

      // Delete associated storage files (don't fail the whole operation if storage delete fails)
      for (const message of batchMessages) {
        await deleteStorageFiles(message)
      }
    } catch (err) {
      errors.push({ batch: i, error: err.message })
    }
  }

  return {
    success: errors.length === 0 && deletedCount > 0,
    deletedCount,
    skippedCount,
    errors: errors.length > 0 ? errors : undefined
  }
}

/**
 * Delete storage files associated with a message
 * @param {Object} message - The message object
 */
async function deleteStorageFiles(message) {
  try {
    if (message.type === 'file' && message.file?.storagePath) {
      const storageRef = ref(storage, message.file.storagePath)
      await deleteObject(storageRef)
    }

    if (message.type === 'video' && message.file?.storagePath) {
      const storageRef = ref(storage, message.file.storagePath)
      await deleteObject(storageRef)
    }

    if (message.type === 'voice' && message.voice?.storagePath) {
      const storageRef = ref(storage, message.voice.storagePath)
      await deleteObject(storageRef)
    }
  } catch (err) {
    console.warn('Failed to delete storage file:', err)
  }
}

/**
 * Get the media kind for a message (used for delete-for-me tracking)
 * @param {Object} message - The message object
 * @returns {string} - 'image' | 'video' | 'voice' | 'document' | 'text'
 */
function getMediaKind(message) {
  if (message.type === 'voice') return 'voice'
  if (message.type === 'video') return 'video'
  if (message.type === 'file') {
    const contentType = message.file?.contentType || ''
    if (contentType.startsWith('image/')) return 'image'
    return 'document'
  }
  return 'text'
}

/**
 * Check if all messages in the selection can be deleted for everyone
 * @param {Array} messages - Array of message objects
 * @param {string} userId - The current user's ID
 * @returns {boolean}
 */
export function canDeleteAllForEveryone(messages, userId) {
  if (!messages?.length || !userId) return false
  return messages.every(m => m.senderId === userId)
}

export default {
  bulkDeleteForMe,
  bulkDeleteForEveryone,
  canDeleteAllForEveryone
}
