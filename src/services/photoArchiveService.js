/**
 * Service to retrieve photos from cleared/archived messages
 * for the hidden Photo Archive feature.
 */

import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
} from 'firebase/firestore'
import { getMessageClearState, isMessageCleared } from './messageClearService'

// Image content types to include
const IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/gif',
]

/**
 * Check if a content type is an image
 * @param {string} contentType - MIME type
 * @returns {boolean}
 */
function isImageContentType(contentType) {
  if (!contentType) return false
  return IMAGE_CONTENT_TYPES.includes(contentType.toLowerCase()) ||
         contentType.toLowerCase().startsWith('image/')
}

/**
 * Get all archived/cleared photo items for a user
 * @param {string} chatId - The chat ID
 * @param {string} userId - The current user's ID
 * @returns {Promise<Object>} - { success, photos, error }
 */
export async function getArchivedPhotos(chatId, userId) {
  if (!chatId || !userId) {
    return { success: false, error: 'Missing chatId or userId', photos: [] }
  }

  try {
    // Get user's clear state
    const clearStateResult = await getMessageClearState(chatId, userId)
    const clearState = clearStateResult.success ? clearStateResult.clearState : null

    // Get user's per-message archive state
    let archiveStateMap = {}
    try {
      const archiveItemsRef = collection(db, 'chats', chatId, 'messageUserState', userId, 'items')
      const archiveSnapshot = await getDocs(archiveItemsRef)
      archiveSnapshot.docs.forEach(docSnap => {
        archiveStateMap[docSnap.id] = docSnap.data()
      })
    } catch (err) {
      console.warn('Could not fetch archive state:', err)
    }

    // Get ALL messages
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)

    const photos = []

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const messageId = docSnap.id

      // Check if this message is cleared or archived
      const isClearedByGlobal = clearState && isMessageCleared(data, clearState)
      const archiveState = archiveStateMap[messageId]
      const isArchivedIndividually = archiveState?.hiddenFromMainView === true

      // Only include photos from cleared/archived messages
      if (!isClearedByGlobal && !isArchivedIndividually) {
        continue
      }

      // Extract photo info from different message types
      const createdAt = data.createdAt?.toDate?.() || null

      // Type: file with image content type
      if (data.type === 'file' && data.file && isImageContentType(data.file.contentType)) {
        photos.push({
          id: `${messageId}_file`,
          messageId,
          attachmentId: null,
          senderId: data.senderId,
          createdAt,
          fileName: data.file.fileName,
          contentType: data.file.contentType,
          storagePath: data.file.storagePath,
          url: data.file.url || null, // Legacy URL field
          size: data.file.size,
          clearedAt: isClearedByGlobal ? (clearState.clearedAt?.toDate?.() || null) : null,
          archivedAt: isArchivedIndividually ? (archiveState.hiddenAt?.toDate?.() || null) : null,
          archiveReason: isArchivedIndividually ? archiveState.hiddenReason : null,
        })
      }

      // Type: attachment_bundle - check subcollection for images
      if (data.type === 'attachment_bundle') {
        try {
          const attachmentsRef = collection(db, 'chats', chatId, 'messages', messageId, 'attachments')
          const attachmentsSnapshot = await getDocs(attachmentsRef)

          for (const attachDoc of attachmentsSnapshot.docs) {
            const attachData = attachDoc.data()
            if (isImageContentType(attachData.contentType)) {
              photos.push({
                id: `${messageId}_${attachDoc.id}`,
                messageId,
                attachmentId: attachDoc.id,
                senderId: data.senderId,
                createdAt,
                fileName: attachData.fileName,
                contentType: attachData.contentType,
                storagePath: attachData.storagePath,
                url: null,
                size: attachData.size,
                clearedAt: isClearedByGlobal ? (clearState.clearedAt?.toDate?.() || null) : null,
                archivedAt: isArchivedIndividually ? (archiveState.hiddenAt?.toDate?.() || null) : null,
                archiveReason: isArchivedIndividually ? archiveState.hiddenReason : null,
              })
            }
          }
        } catch (err) {
          console.warn('Could not fetch attachments for message:', messageId, err)
        }
      }
    }

    return { success: true, photos }
  } catch (error) {
    console.error('Error getting archived photos:', error)
    return { success: false, error: error.message, photos: [] }
  }
}

/**
 * Group photos by date for display
 * @param {Array} photos - Array of photo items
 * @returns {Object} - { today: [], thisWeek: [], older: [] }
 */
export function groupPhotosByDate(photos) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const groups = {
    today: [],
    thisWeek: [],
    older: [],
  }

  for (const photo of photos) {
    if (!photo.createdAt) {
      groups.older.push(photo)
      continue
    }

    const photoDate = new Date(photo.createdAt)

    if (photoDate >= todayStart) {
      groups.today.push(photo)
    } else if (photoDate >= weekStart) {
      groups.thisWeek.push(photo)
    } else {
      groups.older.push(photo)
    }
  }

  return groups
}

export default {
  getArchivedPhotos,
  groupPhotosByDate,
}
