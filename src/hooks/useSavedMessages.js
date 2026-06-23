import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'

export function useSavedMessages(chatId, userId) {
  const [savedMessageIds, setSavedMessageIds] = useState(new Set())
  const [savedMessages, setSavedMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId || !userId) {
      setSavedMessageIds(new Set())
      setSavedMessages([])
      setLoading(false)
      return
    }

    const savedRef = collection(db, 'chats', chatId, 'messageUserState', userId, 'saved')
    const q = query(savedRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ids = new Set()
        const saved = []
        snapshot.docs.forEach((d) => {
          const data = d.data()
          ids.add(d.id)
          saved.push({ id: d.id, ...data })
        })
        setSavedMessageIds(ids)
        setSavedMessages(saved)
        setLoading(false)
      },
      (err) => {
        console.error('Error loading saved messages:', err)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [chatId, userId])

  const isSaved = useCallback(
    (messageId) => savedMessageIds.has(messageId),
    [savedMessageIds]
  )

  const saveMessage = useCallback(
    async (messageId) => {
      if (!chatId || !userId || !messageId) return false
      try {
        const docRef = doc(
          db,
          'chats',
          chatId,
          'messageUserState',
          userId,
          'saved',
          messageId
        )
        await setDoc(docRef, {
          messageId,
          userId,
          saved: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        return true
      } catch (err) {
        console.error('Error saving message:', err)
        return false
      }
    },
    [chatId, userId]
  )

  const unsaveMessage = useCallback(
    async (messageId) => {
      if (!chatId || !userId || !messageId) return false
      try {
        const docRef = doc(
          db,
          'chats',
          chatId,
          'messageUserState',
          userId,
          'saved',
          messageId
        )
        await deleteDoc(docRef)
        return true
      } catch (err) {
        console.error('Error unsaving message:', err)
        return false
      }
    },
    [chatId, userId]
  )

  const toggleSave = useCallback(
    async (messageId) => {
      if (isSaved(messageId)) {
        return unsaveMessage(messageId)
      }
      return saveMessage(messageId)
    },
    [isSaved, saveMessage, unsaveMessage]
  )

  return {
    savedMessageIds,
    savedMessages,
    loading,
    isSaved,
    saveMessage,
    unsaveMessage,
    toggleSave,
  }
}
