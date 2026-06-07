import { useState } from 'react'
import { createThought } from '../services/thoughtService'

const MOODS = [
  { value: 'normal', label: 'Normal', emoji: '💭' },
  { value: 'warm', label: 'Warm', emoji: '🌤️' },
  { value: 'love', label: 'Love', emoji: '💕' },
  { value: 'quiet', label: 'Quiet', emoji: '🌙' },
  { value: 'missing', label: 'Missing', emoji: '💫' }
]

const MAX_TITLE_LENGTH = 120
const MAX_BODY_LENGTH = 10000

function ThoughtComposer({ currentUser, chatId, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mood, setMood] = useState('normal')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasContent = title.trim() || body.trim()

  const handleClose = () => {
    if (hasContent) {
      if (!window.confirm('Discard your thought? Changes will be lost.')) {
        return
      }
    }
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedBody = body.trim()
    if (!trimmedBody) {
      setError('Please write something before sharing.')
      return
    }

    if (trimmedBody.length > MAX_BODY_LENGTH) {
      setError(`Body is too long. Maximum ${MAX_BODY_LENGTH} characters.`)
      return
    }

    if (title.length > MAX_TITLE_LENGTH) {
      setError(`Title is too long. Maximum ${MAX_TITLE_LENGTH} characters.`)
      return
    }

    setSubmitting(true)

    const result = await createThought(chatId, currentUser.uid, {
      title: title.trim(),
      body: trimmedBody,
      mood
    })

    if (result.success) {
      onCreated?.()
      onClose()
    } else {
      setError(result.error || 'Failed to share thought.')
      setSubmitting(false)
    }
  }

  return (
    <div className="thought-composer-overlay" onClick={handleClose}>
      <div className="thought-composer" onClick={(e) => e.stopPropagation()}>
        <div className="thought-composer-header">
          <button className="thought-composer-back" onClick={handleClose} aria-label="Close">
            ←
          </button>
          <h2>New Thought</h2>
        </div>

        <form onSubmit={handleSubmit} className="thought-composer-form">
          {error && <div className="thought-composer-error">{error}</div>}

          <div className="thought-composer-field">
            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              className="thought-composer-title"
              disabled={submitting}
            />
          </div>

          <div className="thought-composer-field">
            <textarea
              placeholder="What's on your mind? Share your thoughts..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_BODY_LENGTH}
              className="thought-composer-body"
              rows={10}
              disabled={submitting}
              autoFocus
            />
            <div className="thought-composer-char-count">
              {body.length} / {MAX_BODY_LENGTH}
            </div>
          </div>

          <div className="thought-composer-mood">
            <label>Mood</label>
            <div className="thought-composer-mood-options">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`thought-mood-btn ${mood === m.value ? 'active' : ''}`}
                  onClick={() => setMood(m.value)}
                  disabled={submitting}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="thought-composer-actions">
            <button
              type="button"
              className="thought-composer-cancel"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="thought-composer-submit"
              disabled={submitting || !body.trim()}
            >
              {submitting ? 'Sharing...' : 'Share Thought'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ThoughtComposer
