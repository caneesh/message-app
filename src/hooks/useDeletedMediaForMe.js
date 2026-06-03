import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, onSnapshot } from 'firebase/firestore'
import { deleteMediaForMe, undoDeleteMediaForMe } from '../services/userMediaStateService'

export function useDeletedMediaForMe(chatId, uid) {
  const [deletedForMeMessageIds, setDeletedForMeMessageIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId || !uid) {
      setLoading(false)
      return
    }

    const itemsRef = collection(db, 'chats', chatId, 'userMediaState', uid, 'items')

    const unsubscribe = onSnapshot(
      itemsRef,
      (snapshot) => {
        const ids = new Set()
        snapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.action === 'deleted_for_me') {
            ids.add(data.messageId)
          }
        })
        setDeletedForMeMessageIds(ids)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading deleted media state:', error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [chatId, uid])

  const deleteForMe = useCallback(async (messageId, mediaKind = 'image') => {
    if (!chatId || !uid || !messageId) return false
    try {
      await deleteMediaForMe(chatId, uid, messageId, mediaKind)
      return true
    } catch (error) {
      console.error('Error deleting media for me:', error)
      return false
    }
  }, [chatId, uid])

  const undoDelete = useCallback(async (messageId) => {
    if (!chatId || !uid || !messageId) return false
    try {
      await undoDeleteMediaForMe(chatId, uid, messageId)
      return true
    } catch (error) {
      console.error('Error undoing delete:', error)
      return false
    }
  }, [chatId, uid])

  const isDeletedForMe = useCallback((messageId) => {
    return deletedForMeMessageIds.has(messageId)
  }, [deletedForMeMessageIds])

  return {
    deletedForMeMessageIds,
    loading,
    deleteForMe,
    undoDelete,
    isDeletedForMe
  }
}
