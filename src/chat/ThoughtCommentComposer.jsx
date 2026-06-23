import { useState, useRef, useEffect } from 'react'

const MAX_COMMENT_LENGTH = 2000

function ThoughtCommentComposer({
  onSubmit,
  onCancel,
  placeholder = 'Write a comment…',
  submitLabel = 'Post',
  autoFocus = false,
  initialValue = '',
  replyingToLabel = null
}) {
  const [text, setText] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return

    setSubmitting(true)
    try {
      const result = await onSubmit(text.trim())
      if (result?.success !== false) {
        setText('')
        onCancel?.()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      onCancel()
    }
  }

  const charsRemaining = MAX_COMMENT_LENGTH - text.length
  const isOverLimit = charsRemaining < 0

  return (
    <div className="thought-comment-composer">
      {replyingToLabel && (
        <div className="composer-replying-to">
          Replying to {replyingToLabel}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="comment-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        maxLength={MAX_COMMENT_LENGTH + 100}
        disabled={submitting}
      />
      <div className="composer-footer">
        <span className={`char-count ${isOverLimit ? 'over-limit' : charsRemaining < 100 ? 'warning' : ''}`}>
          {charsRemaining}
        </span>
        <div className="composer-actions">
          {onCancel && (
            <button
              className="composer-cancel-btn"
              onClick={onCancel}
              disabled={submitting}
              type="button"
            >
              Cancel
            </button>
          )}
          <button
            className="composer-submit-btn"
            onClick={handleSubmit}
            disabled={!text.trim() || isOverLimit || submitting}
            type="button"
          >
            {submitting ? '…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ThoughtCommentComposer
