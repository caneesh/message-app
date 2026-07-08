import { useState, useEffect, useCallback, useMemo } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, onSnapshot } from 'firebase/firestore'
import {
  archiveReadMessage,
  archiveAllRead,
  clearArchiveView,
  isHiddenFromMain,
  isVisibleInArchive
} from '../services/readArchiveService'

export function useReadArchiveState(chatId, uid) {
  const [stateMap, setStateMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId || !uid) {
      setStateMap({})
      setLoading(false)
      return
    }

    setLoading(true)
    const itemsRef = collection(db, 'chats', chatId, 'messageUserState', uid, 'items')

    const unsubscribe = onSnapshot(
      itemsRef,
      (snapshot) => {
        const newMap = {}
        snapshot.docs.forEach(docSnap => {
          newMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() }
        })
        setStateMap(newMap)
        setLoading(false)
      },
      (error) => {
        console.error('Error listening to messageUserState:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [chatId, uid])

  const isMessageHiddenFromMain = useCallback((messageId) => {
    return isHiddenFromMain(stateMap[messageId])
  }, [stateMap])

  const isMessageVisibleInArchive = useCallback((messageId) => {
    return isVisibleInArchive(stateMap[messageId])
  }, [stateMap])

  const getMessageState = useCallback((messageId) => {
    return stateMap[messageId] || null
  }, [stateMap])

  const archiveMessage = useCallback(async (messageId, reason = 'read') => {
    if (!chatId || !uid || !messageId) return false
    return archiveReadMessage(chatId, uid, messageId, reason)
  }, [chatId, uid])

  const archiveMessages = useCallback(async (messageIds, reason = 'read') => {
    if (!chatId || !uid || !messageIds?.length) return 0
    return archiveAllRead(chatId, uid, messageIds, reason)
  }, [chatId, uid])

  const clearArchive = useCallback(async () => {
    if (!chatId || !uid) return 0
    return clearArchiveView(chatId, uid)
  }, [chatId, uid])

  const filterVisibleInMain = useCallback((messages) => {
    if (!messages) return []
    return messages.filter(msg => !isHiddenFromMain(stateMap[msg.id]))
  }, [stateMap])

  const filterVisibleInArchive = useCallback((messages) => {
    if (!messages) return []
    return messages.filter(msg => isVisibleInArchive(stateMap[msg.id]))
  }, [stateMap])

  const archivedCount = useMemo(() => {
    return Object.values(stateMap).filter(s => isVisibleInArchive(s)).length
  }, [stateMap])

  return {
    loading,
    stateMap,
    isMessageHiddenFromMain,
    isMessageVisibleInArchive,
    getMessageState,
    archiveMessage,
    archiveMessages,
    clearArchive,
    filterVisibleInMain,
    filterVisibleInArchive,
    archivedCount
  }
}
