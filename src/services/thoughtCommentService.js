/**
 * Thought Comment service for CRUD operations on thought comments
 */

import { db } from '../firebase/firebaseConfig'
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'

const MAX_COMMENT_LENGTH = 2000

/**
 * Update the commentsSummary on a thought document
 * This is a denormalized summary for quick unread detection
 */
async function updateCommentsSummary(chatId, thoughtId) {
  try {
    const commentsRef = collection(db, 'chats', chatId, 'thoughts', thoughtId, 'comments')
    const q = query(commentsRef, where('status', '==', 'active'), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)

    const activeComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    const thoughtRef = doc(db, 'chats', chatId, 'thoughts', thoughtId)

    if (activeComments.length === 0) {
      await updateDoc(thoughtRef, {
        commentsSummary: {
          commentCount: 0,
          lastCommentAt: null,
          lastCommentBy: null,
          updatedAt: serverTimestamp()
        }
      })
    } else {
      const latestComment = activeComments[0]
      await updateDoc(thoughtRef, {
        commentsSummary: {
          commentCount: activeComments.length,
          lastCommentAt: latestComment.createdAt,
          lastCommentBy: latestComment.authorId,
          updatedAt: serverTimestamp()
        }
      })
    }
  } catch (error) {
    console.error('Error updating comments summary:', error)
  }
}

/**
 * Create a top-level comment on a thought
 */
export async function createThoughtComment(chatId, thoughtId, userId, text) {
  if (!chatId || !thoughtId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { success: false, error: 'Comment text is required' }
  }

  if (text.length > MAX_COMMENT_LENGTH) {
    return { success: false, error: `Comment exceeds maximum length of ${MAX_COMMENT_LENGTH} characters` }
  }

  try {
    const commentsRef = collection(db, 'chats', chatId, 'thoughts', thoughtId, 'comments')
    const commentData = {
      chatId,
      thoughtId,
      authorId: userId,
      text: text.trim(),
      parentCommentId: null,
      rootCommentId: null,
      depth: 0,
      path: [],
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    const docRef = await addDoc(commentsRef, commentData)

    // Update denormalized summary
    await updateCommentsSummary(chatId, thoughtId)

    return { success: true, commentId: docRef.id }
  } catch (error) {
    console.error('Error creating thought comment:', error)
    return { success: false, error: error.message || 'Failed to create comment' }
  }
}

/**
 * Reply to an existing comment
 */
export async function replyToThoughtComment(chatId, thoughtId, parentCommentId, userId, text) {
  if (!chatId || !thoughtId || !parentCommentId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { success: false, error: 'Reply text is required' }
  }

  if (text.length > MAX_COMMENT_LENGTH) {
    return { success: false, error: `Reply exceeds maximum length of ${MAX_COMMENT_LENGTH} characters` }
  }

  try {
    const parentRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'comments', parentCommentId)
    const parentSnap = await getDoc(parentRef)

    if (!parentSnap.exists()) {
      return { success: false, error: 'Parent comment not found' }
    }

    const parent = parentSnap.data()
    const rootCommentId = parent.rootCommentId || parentCommentId
    const newPath = [...(parent.path || []), parentCommentId]
    const newDepth = (parent.depth || 0) + 1

    const commentsRef = collection(db, 'chats', chatId, 'thoughts', thoughtId, 'comments')
    const commentData = {
      chatId,
      thoughtId,
      authorId: userId,
      text: text.trim(),
      parentCommentId,
      rootCommentId,
      depth: newDepth,
      path: newPath,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    const docRef = await addDoc(commentsRef, commentData)

    // Update denormalized summary
    await updateCommentsSummary(chatId, thoughtId)

    return { success: true, commentId: docRef.id }
  } catch (error) {
    console.error('Error replying to thought comment:', error)
    return { success: false, error: error.message || 'Failed to reply to comment' }
  }
}

/**
 * List all comments for a thought
 */
export async function listThoughtComments(chatId, thoughtId) {
  if (!chatId || !thoughtId) {
    return { success: false, error: 'Missing chatId or thoughtId', comments: [] }
  }

  try {
    const commentsRef = collection(db, 'chats', chatId, 'thoughts', thoughtId, 'comments')
    const q = query(commentsRef, orderBy('createdAt', 'asc'))

    const snapshot = await getDocs(q)
    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return { success: true, comments }
  } catch (error) {
    console.error('Error listing thought comments:', error)
    return { success: false, error: error.message || 'Failed to list comments', comments: [] }
  }
}

/**
 * Update a comment (only author can update, only text can change)
 */
export async function updateThoughtComment(chatId, thoughtId, commentId, userId, text) {
  if (!chatId || !thoughtId || !commentId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { success: false, error: 'Comment text is required' }
  }

  if (text.length > MAX_COMMENT_LENGTH) {
    return { success: false, error: `Comment exceeds maximum length of ${MAX_COMMENT_LENGTH} characters` }
  }

  try {
    const commentRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'comments', commentId)
    const snapshot = await getDoc(commentRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Comment not found' }
    }

    const comment = snapshot.data()

    if (comment.authorId !== userId) {
      return { success: false, error: 'Only the author can edit this comment' }
    }

    if (comment.status === 'deleted') {
      return { success: false, error: 'Cannot edit a deleted comment' }
    }

    await updateDoc(commentRef, {
      text: text.trim(),
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating thought comment:', error)
    return { success: false, error: error.message || 'Failed to update comment' }
  }
}

/**
 * Soft delete a comment (only author can delete)
 */
export async function softDeleteThoughtComment(chatId, thoughtId, commentId, userId) {
  if (!chatId || !thoughtId || !commentId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const commentRef = doc(db, 'chats', chatId, 'thoughts', thoughtId, 'comments', commentId)
    const snapshot = await getDoc(commentRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Comment not found' }
    }

    const comment = snapshot.data()

    if (comment.authorId !== userId) {
      return { success: false, error: 'Only the author can delete this comment' }
    }

    if (comment.status === 'deleted') {
      return { success: false, error: 'Comment is already deleted' }
    }

    await updateDoc(commentRef, {
      status: 'deleted',
      updatedAt: serverTimestamp()
    })

    // Update denormalized summary
    await updateCommentsSummary(chatId, thoughtId)

    return { success: true }
  } catch (error) {
    console.error('Error deleting thought comment:', error)
    return { success: false, error: error.message || 'Failed to delete comment' }
  }
}

/**
 * Set a reaction on a comment
 */
export async function setThoughtCommentReaction(chatId, thoughtId, commentId, userId, reaction) {
  if (!chatId || !thoughtId || !commentId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  if (!['like', 'dislike'].includes(reaction)) {
    return { success: false, error: 'Invalid reaction value' }
  }

  try {
    const reactionRef = doc(
      db, 'chats', chatId, 'thoughts', thoughtId, 'comments', commentId, 'reactions', userId
    )

    await setDoc(reactionRef, {
      uid: userId,
      reaction,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error setting comment reaction:', error)
    return { success: false, error: error.message || 'Failed to set reaction' }
  }
}

/**
 * Remove a reaction from a comment
 */
export async function removeThoughtCommentReaction(chatId, thoughtId, commentId, userId) {
  if (!chatId || !thoughtId || !commentId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const reactionRef = doc(
      db, 'chats', chatId, 'thoughts', thoughtId, 'comments', commentId, 'reactions', userId
    )

    await deleteDoc(reactionRef)
    return { success: true }
  } catch (error) {
    console.error('Error removing comment reaction:', error)
    return { success: false, error: error.message || 'Failed to remove reaction' }
  }
}

/**
 * List reactions for multiple comments efficiently
 */
export async function listThoughtCommentReactions(chatId, thoughtId, commentIds) {
  if (!chatId || !thoughtId || !commentIds?.length) {
    return { success: true, reactions: {} }
  }

  try {
    const reactions = {}

    await Promise.all(
      commentIds.map(async (commentId) => {
        const reactionsRef = collection(
          db, 'chats', chatId, 'thoughts', thoughtId, 'comments', commentId, 'reactions'
        )
        const snapshot = await getDocs(reactionsRef)
        reactions[commentId] = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }))
      })
    )

    return { success: true, reactions }
  } catch (error) {
    console.error('Error listing comment reactions:', error)
    return { success: false, error: error.message || 'Failed to list reactions', reactions: {} }
  }
}

export default {
  createThoughtComment,
  replyToThoughtComment,
  listThoughtComments,
  updateThoughtComment,
  softDeleteThoughtComment,
  setThoughtCommentReaction,
  removeThoughtCommentReaction,
  listThoughtCommentReactions
}
