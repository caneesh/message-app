/**
 * Transcription service for voice notes
 * Handles requesting transcription via Cloud Functions
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../firebase/firebaseConfig'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'

const functions = getFunctions()

/**
 * Request transcription for a voice note
 * @param {string} chatId - The chat ID
 * @param {string} messageId - The message ID
 * @param {string} userId - The requesting user's ID
 * @returns {Object} - { success, error }
 */
export async function requestTranscription(chatId, messageId, userId) {
  if (!chatId || !messageId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId)
    await updateDoc(messageRef, {
      transcriptionStatus: 'pending',
      transcriptRequestedBy: userId,
      transcriptUpdatedAt: serverTimestamp()
    })

    const transcribeVoiceNote = httpsCallable(functions, 'transcribeVoiceNote')
    const result = await transcribeVoiceNote({ chatId, messageId })

    if (result.data?.success) {
      return { success: true }
    } else {
      return { success: false, error: result.data?.error || 'Transcription failed' }
    }
  } catch (error) {
    console.error('Error requesting transcription:', error)

    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId)
      await updateDoc(messageRef, {
        transcriptionStatus: 'failed',
        transcriptErrorCode: error.code || 'unknown_error',
        transcriptUpdatedAt: serverTimestamp()
      })
    } catch (updateError) {
      console.error('Error updating transcription status:', updateError)
    }

    return { success: false, error: error.message || 'Failed to request transcription' }
  }
}

/**
 * Get transcription status labels
 * @param {string} status - The transcription status
 * @returns {Object} - { label, canRetry }
 */
export function getTranscriptionStatusInfo(status) {
  switch (status) {
    case 'pending':
      return { label: 'Transcribing...', canRetry: false }
    case 'completed':
      return { label: 'Transcript available', canRetry: false }
    case 'failed':
      return { label: 'Transcription failed', canRetry: true }
    case 'none':
    default:
      return { label: 'Transcribe', canRetry: false }
  }
}

export default {
  requestTranscription,
  getTranscriptionStatusInfo
}
