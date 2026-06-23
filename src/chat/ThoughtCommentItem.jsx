import { useState } from 'react'
import ThoughtCommentReactions from './ThoughtCommentReactions'
import ThoughtCommentComposer from './ThoughtCommentComposer'
import { getVisualIndent, getCommentPreview, countReactions, getUserReaction } from '../utils/commentThreadUtils'

function ThoughtCommentItem({
  comment,
  currentUser,
  reactions,
  parentAuthorLabel,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onDislike,
  onRemoveReaction,
  highlightId,
  isUnread
}) {
  const [showReplyComposer, setShowReplyComposer] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const isAuthor = comment.authorId === currentUser?.uid
  const isDeleted = comment.status === 'deleted'
  const visualIndent = getVisualIndent(comment.depth || 0)
  const { likes, dislikes } = countReactions(reactions)
  const userReaction = getUserReaction(reactions, currentUser?.uid)
  const isHighlighted = highlightId === comment.id

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return ''
    }
  }

  const handleReply = async (text) => {
    const result = await onReply(comment.id, text)
    if (result?.success !== false) {
      setShowReplyComposer(false)
    }
    return result
  }

  const handleEdit = async (text) => {
    const result = await onEdit(comment.id, text)
    if (result?.success !== false) {
      setIsEditing(false)
    }
    return result
  }

  const handleDelete = async () => {
    await onDelete(comment.id)
    setShowDeleteConfirm(false)
  }

  if (isDeleted) {
    return (
      <div
        className={`thought-comment-item thought-comment-deleted indent-${visualIndent}`}
        style={{ '--indent-level': visualIndent }}
      >
        <div className="comment-deleted-placeholder">
          This comment was deleted
        </div>
      </div>
    )
  }

  const commentClasses = [
    'thought-comment-item',
    `indent-${visualIndent}`,
    isHighlighted ? 'highlighted' : '',
    isUnread ? 'thought-comment--unread' : ''
  ].filter(Boolean).join(' ')

  return (
    <div
      className={commentClasses}
      style={{ '--indent-level': visualIndent }}
      id={`comment-${comment.id}`}
    >
      {comment.depth > 3 && parentAuthorLabel && (
        <div className="comment-replying-to-label">
          ↳ Replying to {parentAuthorLabel}
        </div>
      )}

      <div className="comment-header">
        <span className="comment-author">
          {isAuthor ? 'You' : 'Friend'}
        </span>
        {isUnread && (
          <span className="thought-comment-new-badge">New</span>
        )}
        <span className="comment-separator">·</span>
        <span className="comment-date">{formatDate(comment.createdAt)}</span>
        {comment.editedAt && (
          <span className="comment-edited">(edited)</span>
        )}
      </div>

      {isEditing ? (
        <ThoughtCommentComposer
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
          placeholder="Edit your comment…"
          submitLabel="Save"
          autoFocus
          initialValue={comment.text}
        />
      ) : (
        <div className="comment-body">
          {comment.text}
        </div>
      )}

      {!isEditing && (
        <div className="comment-actions">
          <ThoughtCommentReactions
            likes={likes}
            dislikes={dislikes}
            userReaction={userReaction}
            onLike={() => onLike(comment.id)}
            onDislike={() => onDislike(comment.id)}
            onRemoveReaction={() => onRemoveReaction(comment.id)}
          />

          <button
            className="comment-action-btn"
            onClick={() => setShowReplyComposer(!showReplyComposer)}
          >
            Reply
          </button>

          {isAuthor && (
            <>
              <button
                className="comment-action-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
              <button
                className="comment-action-btn comment-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="comment-delete-confirm">
          <span>Delete this comment?</span>
          <button
            className="delete-confirm-btn"
            onClick={handleDelete}
          >
            Delete
          </button>
          <button
            className="delete-cancel-btn"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {showReplyComposer && (
        <div className="comment-reply-composer">
          <ThoughtCommentComposer
            onSubmit={handleReply}
            onCancel={() => setShowReplyComposer(false)}
            placeholder="Write a reply…"
            submitLabel="Reply"
            autoFocus
            replyingToLabel={isAuthor ? 'yourself' : 'Friend'}
          />
        </div>
      )}
    </div>
  )
}

export default ThoughtCommentItem
