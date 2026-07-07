/**
 * Hook for managing per-user reveal state for reveal messages
 * Tracks which messages the user has already revealed
 */

import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export function useRevealState(chatId, userId) {
  const [revealedMessages, setRevealedMessages] = useState(new Set())
  const [loading, setLoading] = useState(true)

  // Load reveal state from Firestore on mount
  useEffect(() => {
    if (!chatId || !userId) {
      setLoading(false)
      return
    }

    const loadRevealState = async () => {
      try {
        const stateRef = doc(db, 'chats', chatId, 'messageRevealState', userId)
        const snapshot = await getDoc(stateRef)

        if (snapshot.exists()) {
          const data = snapshot.data()
          const revealed = new Set(data.revealedMessageIds || [])
          setRevealedMessages(revealed)
        }
      } catch (error) {
        console.error('Error loading reveal state:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRevealState()
  }, [chatId, userId])

  // Mark a message as revealed
  const revealMessage = useCallback(async (messageId) => {
    if (!chatId || !userId || !messageId) return false

    // Update local state immediately
    setRevealedMessages(prev => {
      const next = new Set(prev)
      next.add(messageId)
      return next
    })

    // Persist to Firestore
    try {
      const stateRef = doc(db, 'chats', chatId, 'messageRevealState', userId)
      const snapshot = await getDoc(stateRef)

      let revealedIds = []
      if (snapshot.exists()) {
        revealedIds = snapshot.data().revealedMessageIds || []
      }

      if (!revealedIds.includes(messageId)) {
        revealedIds.push(messageId)
        await setDoc(stateRef, {
          userId,
          revealedMessageIds: revealedIds,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      }

      return true
    } catch (error) {
      console.error('Error saving reveal state:', error)
      return false
    }
  }, [chatId, userId])

  // Check if a message is revealed
  const isRevealed = useCallback((messageId) => {
    return revealedMessages.has(messageId)
  }, [revealedMessages])

  return {
    isRevealed,
    revealMessage,
    loading,
  }
}

export default useRevealState
