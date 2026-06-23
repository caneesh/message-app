/**
 * Thought Comment Read State service
 * Tracks which comments a user has seen for each thought
 */

import { db } from '../firebase/firebaseConfig'
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore'

/**
 * Get the comment read state for a user on a specific thought
 */
export async function getThoughtCommentReadState(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters', readState: null }
  }

  try {
    const readStateRef = doc(
      db, 'chats', chatId, 'thoughtCommentReadState', uid, 'items', thoughtId
    )
    const snapshot = await getDoc(readStateRef)

    if (!snapshot.exists()) {
      return { success: true, readState: null }
    }

    return { success: true, readState: { id: snapshot.id, ...snapshot.data() } }
  } catch (error) {
    console.error('Error getting thought comment read state:', error)
    return { success: false, error: error.message, readState: null }
  }
}

/**
 * Update the comment read state when user views comments
 */
export async function updateThoughtCommentReadState(chatId, uid, thoughtId, latestComment) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const readStateRef = doc(
      db, 'chats', chatId, 'thoughtCommentReadState', uid, 'items', thoughtId
    )

    const readStateData = {
      thoughtId,
      userId: uid,
      lastSeenCommentsAt: latestComment?.createdAt || serverTimestamp(),
      lastSeenCommentId: latestComment?.id || null,
      unreadCountSnapshot: 0,
      updatedAt: serverTimestamp()
    }

    await setDoc(readStateRef, readStateData, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Error updating thought comment read state:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Calculate unread comment count for a thought
 * A comment is unread if:
 * - status == 'active'
 * - authorId != currentUser.uid
 * - createdAt > lastSeenCommentsAt (or all if no read state)
 */
export function getUnreadCommentCountForThought(comments, uid, lastSeenCommentsAt) {
  if (!comments || !Array.isArray(comments) || !uid) {
    return 0
  }

  return comments.filter(comment => {
    if (comment.status !== 'active') return false
    if (comment.authorId === uid) return false

    if (!lastSeenCommentsAt) return true

    const commentTime = comment.createdAt?.toDate?.() ||
                        (comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000) : null) ||
                        new Date(comment.createdAt)
    const lastSeenTime = lastSeenCommentsAt?.toDate?.() ||
                         (lastSeenCommentsAt?.seconds ? new Date(lastSeenCommentsAt.seconds * 1000) : null) ||
                         new Date(lastSeenCommentsAt)

    return commentTime > lastSeenTime
  }).length
}

/**
 * Check if a specific comment is unread
 */
export function isCommentUnread(comment, uid, lastSeenCommentsAt) {
  if (!comment || !uid) return false
  if (comment.status !== 'active') return false
  if (comment.authorId === uid) return false

  if (!lastSeenCommentsAt) return true

  const commentTime = comment.createdAt?.toDate?.() ||
                      (comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000) : null) ||
                      new Date(comment.createdAt)
  const lastSeenTime = lastSeenCommentsAt?.toDate?.() ||
                       (lastSeenCommentsAt?.seconds ? new Date(lastSeenCommentsAt.seconds * 1000) : null) ||
                       new Date(lastSeenCommentsAt)

  return commentTime > lastSeenTime
}

/**
 * Get unread comment summary for multiple thoughts
 * Returns a map of thoughtId -> unreadCount
 */
export async function getUnreadThoughtCommentSummary(chatId, uid, thoughts) {
  if (!chatId || !uid || !thoughts?.length) {
    return { success: true, summary: {} }
  }

  try {
    const summary = {}

    // Fetch read states for all thoughts
    const readStatesRef = collection(db, 'chats', chatId, 'thoughtCommentReadState', uid, 'items')
    const readStatesSnap = await getDocs(readStatesRef)
    const readStatesMap = new Map()
    readStatesSnap.docs.forEach(doc => {
      readStatesMap.set(doc.id, doc.data())
    })

    // For each thought with commentsSummary, check if there might be unread comments
    for (const thought of thoughts) {
      const readState = readStatesMap.get(thought.id)
      const lastCommentAt = thought.commentsSummary?.lastCommentAt

      if (!lastCommentAt) {
        summary[thought.id] = { hasUnread: false, count: 0 }
        continue
      }

      // If no read state, there might be unread comments
      if (!readState) {
        // Check if last comment is from the other user
        if (thought.commentsSummary?.lastCommentBy !== uid) {
          summary[thought.id] = {
            hasUnread: true,
            count: thought.commentsSummary?.commentCount || 0,
            needsExactCount: true
          }
        } else {
          summary[thought.id] = { hasUnread: false, count: 0 }
        }
        continue
      }

      // Compare timestamps
      const lastSeenAt = readState.lastSeenCommentsAt
      const lastCommentTime = lastCommentAt?.toDate?.() ||
                              (lastCommentAt?.seconds ? new Date(lastCommentAt.seconds * 1000) : null) ||
                              new Date(lastCommentAt)
      const lastSeenTime = lastSeenAt?.toDate?.() ||
                           (lastSeenAt?.seconds ? new Date(lastSeenAt.seconds * 1000) : null) ||
                           new Date(lastSeenAt)

      if (lastCommentTime > lastSeenTime && thought.commentsSummary?.lastCommentBy !== uid) {
        summary[thought.id] = {
          hasUnread: true,
          count: 0, // We don't know exact count from summary alone
          needsExactCount: true
        }
      } else {
        summary[thought.id] = { hasUnread: false, count: 0 }
      }
    }

    return { success: true, summary }
  } catch (error) {
    console.error('Error getting unread thought comment summary:', error)
    return { success: false, error: error.message, summary: {} }
  }
}

/**
 * Get total unread comments count across all thoughts
 */
export async function getTotalUnreadCommentCount(chatId, uid) {
  if (!chatId || !uid) {
    return { success: false, error: 'Missing required parameters', count: 0 }
  }

  try {
    // Get all thoughts with comments
    const thoughtsRef = collection(db, 'chats', chatId, 'thoughts')
    const thoughtsQuery = query(thoughtsRef, where('status', '==', 'shared'))
    const thoughtsSnap = await getDocs(thoughtsQuery)

    // Get read states
    const readStatesRef = collection(db, 'chats', chatId, 'thoughtCommentReadState', uid, 'items')
    const readStatesSnap = await getDocs(readStatesRef)
    const readStatesMap = new Map()
    readStatesSnap.docs.forEach(doc => {
      readStatesMap.set(doc.id, doc.data())
    })

    let totalUnread = 0
    const thoughtsWithPotentialUnread = []

    for (const thoughtDoc of thoughtsSnap.docs) {
      const thought = thoughtDoc.data()
      const summary = thought.commentsSummary

      if (!summary?.lastCommentAt || !summary?.commentCount) continue
      if (summary.lastCommentBy === uid) continue

      const readState = readStatesMap.get(thoughtDoc.id)

      if (!readState) {
        // Never read, all other user's comments are unread
        thoughtsWithPotentialUnread.push(thoughtDoc.id)
      } else {
        const lastSeenAt = readState.lastSeenCommentsAt
        const lastCommentAt = summary.lastCommentAt

        const lastCommentTime = lastCommentAt?.toDate?.() ||
                                (lastCommentAt?.seconds ? new Date(lastCommentAt.seconds * 1000) : null) ||
                                new Date(lastCommentAt)
        const lastSeenTime = lastSeenAt?.toDate?.() ||
                             (lastSeenAt?.seconds ? new Date(lastSeenAt.seconds * 1000) : null) ||
                             new Date(lastSeenAt)

        if (lastCommentTime > lastSeenTime) {
          thoughtsWithPotentialUnread.push(thoughtDoc.id)
        }
      }
    }

    // For thoughts with potential unread, load comments to get exact count
    for (const thoughtId of thoughtsWithPotentialUnread) {
      const commentsRef = collection(db, 'chats', chatId, 'thoughts', thoughtId, 'comments')
      const commentsSnap = await getDocs(commentsRef)
      const readState = readStatesMap.get(thoughtId)

      const comments = commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const unreadCount = getUnreadCommentCountForThought(
        comments,
        uid,
        readState?.lastSeenCommentsAt
      )
      totalUnread += unreadCount
    }

    return { success: true, count: totalUnread }
  } catch (error) {
    console.error('Error getting total unread comment count:', error)
    return { success: false, error: error.message, count: 0 }
  }
}

export default {
  getThoughtCommentReadState,
  updateThoughtCommentReadState,
  getUnreadCommentCountForThought,
  isCommentUnread,
  getUnreadThoughtCommentSummary,
  getTotalUnreadCommentCount
}
