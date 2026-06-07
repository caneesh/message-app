import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'

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
          const thought = thoughtDoc.data()

          // Skip thoughts authored by the current user
          if (thought.authorId === userId) continue

          try {
            const receiptRef = doc(db, 'chats', chatId, 'thoughtReadReceipts', thoughtDoc.id, 'readers', userId)
            const receiptSnap = await getDoc(receiptRef)

            if (cancelled) return

            if (!receiptSnap.exists()) {
              count++
            } else {
              const readPercent = receiptSnap.data().readPercent
              if (readPercent < 100) {
                count++
              }
            }
          } catch {
            // If we can't read the receipt, count as unread
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
