import { useState } from 'react'

function ThoughtCommentReactions({
  likes,
  dislikes,
  userReaction,
  onLike,
  onDislike,
  onRemoveReaction,
  disabled
}) {
  const [loading, setLoading] = useState(false)

  const handleLike = async () => {
    if (loading || disabled) return
    setLoading(true)
    try {
      if (userReaction === 'like') {
        await onRemoveReaction()
      } else {
        await onLike()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDislike = async () => {
    if (loading || disabled) return
    setLoading(true)
    try {
      if (userReaction === 'dislike') {
        await onRemoveReaction()
      } else {
        await onDislike()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="thought-comment-reactions">
      <button
        className={`reaction-btn reaction-like ${userReaction === 'like' ? 'active' : ''}`}
        onClick={handleLike}
        disabled={loading || disabled}
        title={userReaction === 'like' ? 'Remove like' : 'Like'}
      >
        <span className="reaction-icon">👍</span>
        {likes > 0 && <span className="reaction-count">{likes}</span>}
      </button>
      <button
        className={`reaction-btn reaction-dislike ${userReaction === 'dislike' ? 'active' : ''}`}
        onClick={handleDislike}
        disabled={loading || disabled}
        title={userReaction === 'dislike' ? 'Remove dislike' : 'Dislike'}
      >
        <span className="reaction-icon">👎</span>
        {dislikes > 0 && <span className="reaction-count">{dislikes}</span>}
      </button>
    </div>
  )
}

export default ThoughtCommentReactions
