import { useState, useEffect, useCallback, useMemo } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'

export function useUserMediaState(chatId, userId) {
  const [mediaState, setMediaState] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId || !userId) {
      setLoading(false)
      return
    }

    const itemsRef = collection(db, 'chats', chatId, 'userMediaState', userId, 'items')
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      const state = {}
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        state[data.messageId] = {
          id: doc.id,
          ...data
        }
      })
      setMediaState(state)
      setLoading(false)
    }, (error) => {
      console.error('Error loading user media state:', error)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId, userId])

  const hideMedia = useCallback(async (messageId, mediaKind) => {
    if (!chatId || !userId || !messageId) return false

    try {
      const itemRef = doc(db, 'chats', chatId, 'userMediaState', userId, 'items', messageId)
      await setDoc(itemRef, {
        messageId,
        mediaKind: mediaKind || 'photo',
        action: 'hidden',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId
      })
      return true
    } catch (error) {
      console.error('Error hiding media:', error)
      return false
    }
  }, [chatId, userId])

  const unhideMedia = useCallback(async (messageId) => {
    if (!chatId || !userId || !messageId) return false

    try {
      const itemRef = doc(db, 'chats', chatId, 'userMediaState', userId, 'items', messageId)
      await deleteDoc(itemRef)
      return true
    } catch (error) {
      console.error('Error unhiding media:', error)
      return false
    }
  }, [chatId, userId])

  const deleteMediaForMe = useCallback(async (messageId, mediaKind) => {
    if (!chatId || !userId || !messageId) return false

    try {
      const itemRef = doc(db, 'chats', chatId, 'userMediaState', userId, 'items', messageId)
      await setDoc(itemRef, {
        messageId,
        mediaKind: mediaKind || 'photo',
        action: 'deleted_for_me',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId
      })
      return true
    } catch (error) {
      console.error('Error deleting media for me:', error)
      return false
    }
  }, [chatId, userId])

  const restoreMedia = useCallback(async (messageId) => {
    return unhideMedia(messageId)
  }, [unhideMedia])

  const isHidden = useCallback((messageId) => {
    return mediaState[messageId]?.action === 'hidden'
  }, [mediaState])

  const isDeletedForMe = useCallback((messageId) => {
    return mediaState[messageId]?.action === 'deleted_for_me'
  }, [mediaState])

  const getMediaAction = useCallback((messageId) => {
    return mediaState[messageId]?.action || null
  }, [mediaState])

  const hiddenItems = useMemo(() => {
    return Object.values(mediaState).filter(item => item.action === 'hidden')
  }, [mediaState])

  const deletedItems = useMemo(() => {
    return Object.values(mediaState).filter(item => item.action === 'deleted_for_me')
  }, [mediaState])

  return {
    mediaState,
    loading,
    hideMedia,
    unhideMedia,
    deleteMediaForMe,
    restoreMedia,
    isHidden,
    isDeletedForMe,
    getMediaAction,
    hiddenItems,
    deletedItems
  }
}
