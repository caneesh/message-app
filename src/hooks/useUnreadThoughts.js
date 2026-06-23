import { useState, useEffect, useMemo } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { getThoughtReadStatus, isUnreadStatus } from '../utils/thoughtUnreadUtils'

const MAX_THOUGHTS_CHECK = 20

export function useUnreadThoughts(chatId, userId) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId || !userId) {
      setUnreadCount(0)
      setLoading(false)
      return
    }

    let cancelled = false

    const checkUnreadThoughts = async () => {
      try {
        // Get hidden thought IDs for this user
        const hiddenIds = new Set()
        try {
          const hiddenRef = collection(db, 'chats', chatId, 'thoughtUserState', userId, 'items')
          const hiddenQuery = query(hiddenRef, where('state', '==', 'hidden_due_to_removal_request'))
          const hiddenSnap = await getDocs(hiddenQuery)
          hiddenSnap.docs.forEach(doc => hiddenIds.add(doc.id))
        } catch {
          // Ignore errors fetching hidden state
        }

        const thoughtsRef = collection(db, 'chats', chatId, 'thoughts')
        const q = query(
          thoughtsRef,
          where('status', '==', 'shared'),
          orderBy('createdAt', 'desc'),
          limit(MAX_THOUGHTS_CHECK)
        )

        const snapshot = await getDocs(q)
        if (cancelled) return

        let count = 0

        for (const thoughtDoc of snapshot.docs) {
          const thought = { id: thoughtDoc.id, ...thoughtDoc.data() }

          // Skip thoughts authored by the current user
          if (thought.authorId === userId) continue

          // Skip hidden thoughts
          if (hiddenIds.has(thought.id)) continue

          try {
            // Check private read state for more accurate status
            const readStateRef = doc(db, 'chats', chatId, 'thoughtReadState', userId, 'items', thoughtDoc.id)
            const readStateSnap = await getDoc(readStateRef)

            if (cancelled) return

            const readState = readStateSnap.exists() ? readStateSnap.data() : null
            const status = getThoughtReadStatus(thought, readState, userId)

            if (isUnreadStatus(status)) {
              count++
            }
          } catch {
            // If we can't read the state, count as unread
            count++
          }
        }

        if (!cancelled) {
          setUnreadCount(count)
        }
      } catch (err) {
        console.error('Error checking unread thoughts:', err)
        if (!cancelled) {
          setUnreadCount(0)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    checkUnreadThoughts()
    const interval = setInterval(checkUnreadThoughts, 60000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [chatId, userId])

  return { unreadCount, loading }
}

export default useUnreadThoughts
