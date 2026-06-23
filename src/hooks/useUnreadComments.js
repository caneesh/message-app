import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { getUnreadCommentCountForThought } from '../services/thoughtCommentReadService'

const MAX_THOUGHTS_CHECK = 20

/**
 * Hook to track total unread comments across all thoughts
 */
export function useUnreadComments(chatId, userId) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const checkUnreadComments = useCallback(async () => {
    if (!chatId || !userId) {
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      // Get thoughts with comments
      const thoughtsRef = collection(db, 'chats', chatId, 'thoughts')
      const thoughtsQuery = query(
        thoughtsRef,
        where('status', '==', 'shared')
      )
      const thoughtsSnap = await getDocs(thoughtsQuery)

      // Get read states for all thoughts
      const readStatesRef = collection(db, 'chats', chatId, 'thoughtCommentReadState', userId, 'items')
      const readStatesSnap = await getDocs(readStatesRef)
      const readStatesMap = new Map()
      readStatesSnap.docs.forEach(d => {
        readStatesMap.set(d.id, d.data())
      })

      let totalUnread = 0
      const thoughtsToCheck = []

      // First pass: check which thoughts might have unread comments
      for (const thoughtDoc of thoughtsSnap.docs) {
        const thought = thoughtDoc.data()
        const summary = thought.commentsSummary

        if (!summary?.commentCount || summary.commentCount === 0) continue
        if (summary.lastCommentBy === userId) continue

        const readState = readStatesMap.get(thoughtDoc.id)

        if (!readState) {
          // Never read comments - might have unread
          thoughtsToCheck.push({ id: thoughtDoc.id, readState: null })
        } else {
          const lastSeenAt = readState.lastSeenCommentsAt
          const lastCommentAt = summary.lastCommentAt

          if (!lastCommentAt) continue

          const lastCommentTime = lastCommentAt?.toDate?.() ||
                                  (lastCommentAt?.seconds ? new Date(lastCommentAt.seconds * 1000) : null) ||
                                  new Date(lastCommentAt)
          const lastSeenTime = lastSeenAt?.toDate?.() ||
                               (lastSeenAt?.seconds ? new Date(lastSeenAt.seconds * 1000) : null) ||
                               new Date(lastSeenAt)

          if (lastCommentTime > lastSeenTime) {
            thoughtsToCheck.push({ id: thoughtDoc.id, readState })
          }
        }
      }

      // Second pass: load comments for thoughts with potential unread
      // Limit to MAX_THOUGHTS_CHECK to avoid too many reads
      const toCheck = thoughtsToCheck.slice(0, MAX_THOUGHTS_CHECK)

      for (const { id, readState } of toCheck) {
        const commentsRef = collection(db, 'chats', chatId, 'thoughts', id, 'comments')
        const commentsSnap = await getDocs(commentsRef)
        const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        const unread = getUnreadCommentCountForThought(
          comments,
          userId,
          readState?.lastSeenCommentsAt
        )
        totalUnread += unread
      }

      setUnreadCount(totalUnread)
    } catch (error) {
      console.error('Error checking unread comments:', error)
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [chatId, userId])

  useEffect(() => {
    checkUnreadComments()
    const interval = setInterval(checkUnreadComments, 60000)
    return () => clearInterval(interval)
  }, [checkUnreadComments])

  return { unreadCount, loading, refresh: checkUnreadComments }
}

/**
 * Hook to get unread comment info for a list of thoughts
 */
export function useThoughtUnreadComments(chatId, userId, thoughts) {
  const [unreadMap, setUnreadMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId || !userId || !thoughts?.length) {
      setUnreadMap({})
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchUnreadInfo = async () => {
      try {
        // Get read states
        const readStatesRef = collection(db, 'chats', chatId, 'thoughtCommentReadState', userId, 'items')
        const readStatesSnap = await getDocs(readStatesRef)
        const readStatesMap = new Map()
        readStatesSnap.docs.forEach(d => {
          readStatesMap.set(d.id, d.data())
        })

        const result = {}

        for (const thought of thoughts) {
          const summary = thought.commentsSummary

          if (!summary?.commentCount || summary.commentCount === 0) {
            result[thought.id] = { hasUnread: false, count: 0 }
            continue
          }

          if (summary.lastCommentBy === userId) {
            result[thought.id] = { hasUnread: false, count: 0 }
            continue
          }

          const readState = readStatesMap.get(thought.id)

          if (!readState) {
            // Never read - all other user's comments are unread
            // Load exact count
            const commentsRef = collection(db, 'chats', chatId, 'thoughts', thought.id, 'comments')
            const commentsSnap = await getDocs(commentsRef)
            const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            const unread = getUnreadCommentCountForThought(comments, userId, null)
            result[thought.id] = { hasUnread: unread > 0, count: unread }
            continue
          }

          const lastSeenAt = readState.lastSeenCommentsAt
          const lastCommentAt = summary.lastCommentAt

          if (!lastCommentAt) {
            result[thought.id] = { hasUnread: false, count: 0 }
            continue
          }

          const lastCommentTime = lastCommentAt?.toDate?.() ||
                                  (lastCommentAt?.seconds ? new Date(lastCommentAt.seconds * 1000) : null) ||
                                  new Date(lastCommentAt)
          const lastSeenTime = lastSeenAt?.toDate?.() ||
                               (lastSeenAt?.seconds ? new Date(lastSeenAt.seconds * 1000) : null) ||
                               new Date(lastSeenAt)

          if (lastCommentTime > lastSeenTime) {
            // Load exact count
            const commentsRef = collection(db, 'chats', chatId, 'thoughts', thought.id, 'comments')
            const commentsSnap = await getDocs(commentsRef)
            const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            const unread = getUnreadCommentCountForThought(comments, userId, lastSeenAt)
            result[thought.id] = { hasUnread: unread > 0, count: unread }
          } else {
            result[thought.id] = { hasUnread: false, count: 0 }
          }
        }

        if (!cancelled) {
          setUnreadMap(result)
        }
      } catch (error) {
        console.error('Error fetching thought unread comments:', error)
        if (!cancelled) {
          setUnreadMap({})
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchUnreadInfo()

    return () => { cancelled = true }
  }, [chatId, userId, thoughts])

  return { unreadMap, loading }
}

export default useUnreadComments
