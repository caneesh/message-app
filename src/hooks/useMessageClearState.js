/**
 * Hook for managing message clear state per user
 * Handles loading the clear cutoff and filtering messages
 */

import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import { doc, onSnapshot } from 'firebase/firestore'
import { isMessageCleared } from '../services/messageClearService'

export function useMessageClearState(chatId, userId) {
  const [clearState, setClearState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId || !userId) {
      setClearState(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const clearStateRef = doc(db, 'chats', chatId, 'messageClearState', userId)
    const unsubscribe = onSnapshot(
      clearStateRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setClearState(snapshot.data())
        } else {
          setClearState(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error subscribing to clear state:', error)
        setClearState(null)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [chatId, userId])

  const isCleared = useCallback((message) => {
    return isMessageCleared(message, clearState)
  }, [clearState])

  const filterVisible = useCallback((messages) => {
    if (!clearState?.clearedAt) return messages
    return messages.filter(msg => !isMessageCleared(msg, clearState))
  }, [clearState])

  return {
    clearState,
    loading,
    isCleared,
    filterVisible,
    hasClearedMessages: !!clearState?.clearedAt
  }
}

export default useMessageClearState
