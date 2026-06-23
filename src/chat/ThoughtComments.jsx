import { useState, useEffect, useCallback, useRef } from 'react'
import {
  listThoughtComments,
  createThoughtComment,
  replyToThoughtComment,
  updateThoughtComment,
  softDeleteThoughtComment,
  setThoughtCommentReaction,
  removeThoughtCommentReaction,
  listThoughtCommentReactions
} from '../services/thoughtCommentService'
import {
  getThoughtCommentReadState,
  updateThoughtCommentReadState,
  getUnreadCommentCountForThought,
  isCommentUnread
} from '../services/thoughtCommentReadService'
import { buildCommentTree, flattenCommentTree, getReplyingToLabel } from '../utils/commentThreadUtils'
import ThoughtCommentItem from './ThoughtCommentItem'
import ThoughtCommentComposer from './ThoughtCommentComposer'

const MARK_READ_DELAY_MS = 1000

function ThoughtComments({ chatId, thoughtId, currentUser, highlightCommentId }) {
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [lastSeenCommentsAt, setLastSeenCommentsAt] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [firstUnreadId, setFirstUnreadId] = useState(null)
  const markReadTimeoutRef = useRef(null)
  const hasMarkedReadRef = useRef(false)

  const fetchComments = useCallback(async () => {
    if (!chatId || !thoughtId) return

    try {
      // Fetch read state first
      let readStateData = null
      if (currentUser?.uid) {
        const readStateResult = await getThoughtCommentReadState(chatId, currentUser.uid, thoughtId)
        if (readStateResult.success && readStateResult.readState) {
          readStateData = readStateResult.readState
          setLastSeenCommentsAt(readStateData.lastSeenCommentsAt)
        }
      }

      const result = await listThoughtComments(chatId, thoughtId)
      if (result.success) {
        const tree = buildCommentTree(result.comments)
        const flat = flattenCommentTree(tree)
        setComments(flat)

        // Calculate unread count
        if (currentUser?.uid) {
          const unread = getUnreadCommentCountForThought(
            result.comments,
            currentUser.uid,
            readStateData?.lastSeenCommentsAt
          )
          setUnreadCount(unread)

          // Find first unread comment
          const firstUnread = result.comments.find(c =>
            isCommentUnread(c, currentUser.uid, readStateData?.lastSeenCommentsAt)
          )
          setFirstUnreadId(firstUnread?.id || null)
        }

        const commentIds = result.comments.map(c => c.id)
        if (commentIds.length > 0) {
          const reactionsResult = await listThoughtCommentReactions(chatId, thoughtId, commentIds)
          if (reactionsResult.success) {
            setReactions(reactionsResult.reactions)
          }
        }
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [chatId, thoughtId, currentUser?.uid])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Mark comments as read after viewing delay
  useEffect(() => {
    if (loading || hasMarkedReadRef.current || !currentUser?.uid || !comments.length) return
    if (unreadCount === 0) return

    markReadTimeoutRef.current = setTimeout(async () => {
      // Find the latest active comment
      const activeComments = comments.filter(c => c.status === 'active')
      if (activeComments.length === 0) return

      // Sort by createdAt to find latest
      const sorted = [...activeComments].sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt)
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt)
        return bTime - aTime
      })
      const latestComment = sorted[0]

      await updateThoughtCommentReadState(chatId, currentUser.uid, thoughtId, latestComment)
      hasMarkedReadRef.current = true
      setUnreadCount(0)
      setFirstUnreadId(null)
      setLastSeenCommentsAt(latestComment.createdAt)
    }, MARK_READ_DELAY_MS)

    return () => {
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current)
      }
    }
  }, [loading, comments, currentUser?.uid, chatId, thoughtId, unreadCount])

  useEffect(() => {
    if (highlightCommentId) {
      const el = document.getElementById(`comment-${highlightCommentId}`)
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
  }, [highlightCommentId, comments])

  const handleJumpToUnread = () => {
    if (firstUnreadId) {
      const el = document.getElementById(`comment-${firstUnreadId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('flash-highlight')
        setTimeout(() => el.classList.remove('flash-highlight'), 1500)
      }
    }
  }

  const handleCreateComment = async (text) => {
    const result = await createThoughtComment(chatId, thoughtId, currentUser.uid, text)
    if (result.success) {
      await fetchComments()
    }
    return result
  }

  const handleReply = async (parentCommentId, text) => {
    const result = await replyToThoughtComment(chatId, thoughtId, parentCommentId, currentUser.uid, text)
    if (result.success) {
      await fetchComments()
    }
    return result
  }

  const handleEdit = async (commentId, text) => {
    const result = await updateThoughtComment(chatId, thoughtId, commentId, currentUser.uid, text)
    if (result.success) {
      await fetchComments()
    }
    return result
  }

  const handleDelete = async (commentId) => {
    const result = await softDeleteThoughtComment(chatId, thoughtId, commentId, currentUser.uid)
    if (result.success) {
      await fetchComments()
    }
    return result
  }

  const handleLike = async (commentId) => {
    const result = await setThoughtCommentReaction(chatId, thoughtId, commentId, currentUser.uid, 'like')
    if (result.success) {
      const updatedReactions = { ...reactions }
      const commentReactions = (updatedReactions[commentId] || []).filter(r => r.uid !== currentUser.uid)
      commentReactions.push({ uid: currentUser.uid, reaction: 'like' })
      updatedReactions[commentId] = commentReactions
      setReactions(updatedReactions)
    }
    return result
  }

  const handleDislike = async (commentId) => {
    const result = await setThoughtCommentReaction(chatId, thoughtId, commentId, currentUser.uid, 'dislike')
    if (result.success) {
      const updatedReactions = { ...reactions }
      const commentReactions = (updatedReactions[commentId] || []).filter(r => r.uid !== currentUser.uid)
      commentReactions.push({ uid: currentUser.uid, reaction: 'dislike' })
      updatedReactions[commentId] = commentReactions
      setReactions(updatedReactions)
    }
    return result
  }

  const handleRemoveReaction = async (commentId) => {
    const result = await removeThoughtCommentReaction(chatId, thoughtId, commentId, currentUser.uid)
    if (result.success) {
      const updatedReactions = { ...reactions }
      updatedReactions[commentId] = (updatedReactions[commentId] || []).filter(r => r.uid !== currentUser.uid)
      setReactions(updatedReactions)
    }
    return result
  }

  const commentMap = new Map(comments.map(c => [c.id, c]))

  const getParentAuthorLabel = (comment) => {
    return getReplyingToLabel(comment, commentMap, currentUser?.uid)
  }

  if (loading) {
    return (
      <div className="thought-comments">
        <div className="thought-comments-header">
          <h3>Comments</h3>
        </div>
        <div className="thought-comments-loading">Loading comments…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="thought-comments">
        <div className="thought-comments-header">
          <h3>Comments</h3>
        </div>
        <div className="thought-comments-error">
          Failed to load comments
          <button onClick={fetchComments}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="thought-comments">
      <div className="thought-comments-header">
        <h3>
          Comments
          {comments.length > 0 && (
            <span className="comment-count">({comments.filter(c => c.status === 'active').length})</span>
          )}
          {unreadCount > 0 && (
            <span className="comment-unread-badge">{unreadCount} new</span>
          )}
        </h3>
        {comments.length > 3 && (
          <button
            className="toggle-comments-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? 'Show comments' : 'Hide comments'}
          </button>
        )}
      </div>

      {/* Unread indicator and jump button */}
      {unreadCount > 0 && firstUnreadId && !collapsed && (
        <div className="thought-comments-unread-banner">
          <span className="unread-banner-text">
            {unreadCount} new {unreadCount === 1 ? 'comment' : 'comments'}
          </span>
          <button
            className="unread-jump-btn"
            onClick={handleJumpToUnread}
          >
            Jump to first new comment
          </button>
        </div>
      )}

      <div className="thought-comments-composer">
        <ThoughtCommentComposer
          onSubmit={handleCreateComment}
          placeholder="Write a comment…"
          submitLabel="Post"
        />
      </div>

      {!collapsed && comments.length > 0 && (
        <div className="thought-comments-list">
          {comments.map(comment => (
            <ThoughtCommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              reactions={reactions[comment.id] || []}
              parentAuthorLabel={getParentAuthorLabel(comment)}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLike={handleLike}
              onDislike={handleDislike}
              onRemoveReaction={handleRemoveReaction}
              highlightId={highlightCommentId}
              isUnread={isCommentUnread(comment, currentUser?.uid, lastSeenCommentsAt)}
            />
          ))}
        </div>
      )}

      {!collapsed && comments.length === 0 && (
        <div className="thought-comments-empty">
          No comments yet. Be the first to share your thoughts!
        </div>
      )}
    </div>
  )
}

export default ThoughtComments
