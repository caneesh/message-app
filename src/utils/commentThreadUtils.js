/**
 * Utility functions for comment threading and display
 */

const MAX_VISUAL_INDENT = 3

/**
 * Build a tree structure from flat comments
 * @param {Array} flatComments - Array of flat comment objects
 * @returns {Array} - Array of top-level comments with nested replies
 */
export function buildCommentTree(flatComments) {
  if (!flatComments?.length) return []

  const commentMap = new Map()
  const rootComments = []

  flatComments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  flatComments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)
    if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
      commentMap.get(comment.parentCommentId).replies.push(commentWithReplies)
    } else if (!comment.parentCommentId) {
      rootComments.push(commentWithReplies)
    } else {
      rootComments.push(commentWithReplies)
    }
  })

  const sortByCreatedAt = (comments) => {
    comments.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
      return aTime - bTime
    })
    comments.forEach(c => {
      if (c.replies?.length) sortByCreatedAt(c.replies)
    })
  }

  sortByCreatedAt(rootComments)
  return rootComments
}

/**
 * Flatten a comment tree back to a flat array in display order
 * @param {Array} commentTree - Array of comments with nested replies
 * @returns {Array} - Flat array of comments in display order
 */
export function flattenCommentTree(commentTree) {
  const result = []

  const traverse = (comments) => {
    comments.forEach(comment => {
      const { replies, ...rest } = comment
      result.push(rest)
      if (replies?.length) {
        traverse(replies)
      }
    })
  }

  traverse(commentTree)
  return result
}

/**
 * Get visual indentation level (capped at MAX_VISUAL_INDENT)
 * @param {number} depth - Actual nesting depth
 * @returns {number} - Visual indentation level
 */
export function getVisualIndent(depth) {
  return Math.min(depth || 0, MAX_VISUAL_INDENT)
}

/**
 * Get a preview of comment text for display
 * @param {string} text - Full comment text
 * @param {number} maxLength - Maximum preview length
 * @returns {string} - Truncated preview
 */
export function getCommentPreview(text, maxLength = 50) {
  if (!text) return ''
  const cleaned = text.trim().replace(/\n+/g, ' ')
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength - 1) + '…'
}

/**
 * Count reactions from reaction documents
 * @param {Array} reactionDocs - Array of reaction documents
 * @returns {Object} - { likes: number, dislikes: number }
 */
export function countReactions(reactionDocs) {
  if (!reactionDocs?.length) {
    return { likes: 0, dislikes: 0 }
  }

  let likes = 0
  let dislikes = 0

  reactionDocs.forEach(reaction => {
    if (reaction.reaction === 'like') likes++
    else if (reaction.reaction === 'dislike') dislikes++
  })

  return { likes, dislikes }
}

/**
 * Get a user's reaction from reaction documents
 * @param {Array} reactionDocs - Array of reaction documents
 * @param {string} userId - User ID to find
 * @returns {string|null} - 'like', 'dislike', or null
 */
export function getUserReaction(reactionDocs, userId) {
  if (!reactionDocs?.length || !userId) return null
  const userReaction = reactionDocs.find(r => r.uid === userId)
  return userReaction?.reaction || null
}

/**
 * Get parent comment author name for "Replying to..." label
 * @param {Object} comment - The reply comment
 * @param {Map|Object} commentMap - Map of commentId -> comment
 * @param {string} currentUserId - Current user's ID
 * @returns {string|null} - "You" or "Friend" or null
 */
export function getReplyingToLabel(comment, commentMap, currentUserId) {
  if (!comment?.parentCommentId) return null

  const parentComment = commentMap instanceof Map
    ? commentMap.get(comment.parentCommentId)
    : commentMap[comment.parentCommentId]

  if (!parentComment) return null

  return parentComment.authorId === currentUserId ? 'You' : 'Friend'
}

export default {
  buildCommentTree,
  flattenCommentTree,
  getVisualIndent,
  getCommentPreview,
  countReactions,
  getUserReaction,
  getReplyingToLabel
}
