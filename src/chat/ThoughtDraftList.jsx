import { useState } from 'react'
import { deleteThoughtDraft, publishThoughtDraft } from '../services/thoughtService'

const MOOD_EMOJI = {
  normal: '💭',
  warm: '🌤️',
  love: '💕',
  quiet: '🌙',
  missing: '💫'
}

function getPreview(draft) {
  if (draft.body) {
    const firstLine = draft.body.split('\n')[0]
    return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine
  }
  return ''
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' })
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  } catch {
    return ''
  }
}

function ThoughtDraftList({ drafts, loading, onSelect, onNewDraft, onDraftDeleted, currentUser, chatId }) {
  const [publishing, setPublishing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const handlePublish = async (e, draft) => {
    e.stopPropagation()
    if (!draft.body?.trim()) {
      alert('Cannot publish an empty draft.')
      return
    }

    setPublishing(draft.id)
    try {
      const result = await publishThoughtDraft(chatId, currentUser.uid, draft.id)
      if (result.success) {
        onDraftDeleted?.()
      } else {
        alert(result.error || 'Failed to publish')
      }
    } catch (err) {
      alert('Failed to publish')
    } finally {
      setPublishing(null)
    }
  }

  const handleDelete = async (e, draft) => {
    e.stopPropagation()
    if (!window.confirm('Delete this draft?')) return

    setDeleting(draft.id)
    try {
      const result = await deleteThoughtDraft(chatId, currentUser.uid, draft.id)
      if (result.success) {
        onDraftDeleted?.()
      } else {
        alert(result.error || 'Failed to delete')
      }
    } catch (err) {
      alert('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="thought-list-loading">
        <span>Loading drafts...</span>
      </div>
    )
  }

  return (
    <div className="thought-list">
      <button className="thought-list-new-btn" onClick={onNewDraft}>
        <span className="thought-list-new-icon">+</span>
        New Thought
      </button>

      {drafts.length === 0 ? (
        <div className="drafts-empty-state">
          <div className="drafts-empty-icon">📝</div>
          <h3 className="drafts-empty-title">No drafts yet</h3>
          <p className="drafts-empty-subtitle">
            Save a thought as a draft to continue writing later.
          </p>
        </div>
      ) : (
        <section className="drafts-section">
          <div className="tray-header">
            <span className="tray-label">YOUR DRAFTS</span>
            <span className="zone-count">{drafts.length}</span>
          </div>
          <ul className="drafts-list">
            {drafts.map((draft) => {
              const moodEmoji = MOOD_EMOJI[draft.mood] || MOOD_EMOJI.normal
              const isPublishing = publishing === draft.id
              const isDeleting = deleting === draft.id
              const isBusy = isPublishing || isDeleting

              return (
                <li key={draft.id}>
                  <div
                    className="draft-card"
                    onClick={() => !isBusy && onSelect(draft)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isBusy) onSelect(draft) }}
                  >
                    <div className="draft-card-main">
                      <span className="draft-card-mood">{moodEmoji}</span>
                      <div className="draft-card-content">
                        <span className="draft-card-title">{draft.title || 'Untitled'}</span>
                        {draft.body && (
                          <span className="draft-card-preview">{getPreview(draft)}</span>
                        )}
                      </div>
                      <div className="draft-card-meta">
                        <span className="draft-badge">Draft</span>
                        <time className="draft-card-time">{formatDate(draft.updatedAt)}</time>
                      </div>
                    </div>
                    <div className="draft-card-actions">
                      <button
                        className="draft-action-btn draft-action-continue"
                        onClick={(e) => { e.stopPropagation(); onSelect(draft) }}
                        disabled={isBusy}
                      >
                        Continue
                      </button>
                      <button
                        className="draft-action-btn draft-action-share"
                        onClick={(e) => handlePublish(e, draft)}
                        disabled={isBusy || !draft.body?.trim()}
                      >
                        {isPublishing ? 'Sharing...' : 'Share'}
                      </button>
                      <button
                        className="draft-action-btn draft-action-delete"
                        onClick={(e) => handleDelete(e, draft)}
                        disabled={isBusy}
                        aria-label="Delete draft"
                      >
                        {isDeleting ? '...' : '🗑'}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

export default ThoughtDraftList
