import { useState, useEffect } from 'react'
import {
  createThought,
  saveThoughtDraft,
  updateThoughtDraft,
  deleteThoughtDraft,
  publishThoughtDraft
} from '../services/thoughtService'

const MOODS = [
  { value: 'normal', label: 'Normal', emoji: '💭' },
  { value: 'warm', label: 'Warm', emoji: '🌤️' },
  { value: 'love', label: 'Love', emoji: '💕' },
  { value: 'quiet', label: 'Quiet', emoji: '🌙' },
  { value: 'missing', label: 'Missing', emoji: '💫' }
]

const MAX_TITLE_LENGTH = 120
const MAX_BODY_LENGTH = 10000

function ThoughtComposer({ currentUser, chatId, onClose, onCreated, draft = null, onDraftSaved, onDraftDeleted }) {
  const [title, setTitle] = useState(draft?.title || '')
  const [body, setBody] = useState(draft?.body || '')
  const [mood, setMood] = useState(draft?.mood || 'normal')
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [deletingDraft, setDeletingDraft] = useState(false)
  const [error, setError] = useState('')
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [draftSavedMessage, setDraftSavedMessage] = useState('')

  const isEditingDraft = !!draft?.id
  const hasContent = title.trim() || body.trim()

  const hasUnsavedChanges = () => {
    if (!draft) return hasContent
    return title !== (draft.title || '') || body !== (draft.body || '') || mood !== (draft.mood || 'normal')
  }

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowExitConfirm(true)
      return
    }
    onClose()
  }

  const handleSaveDraft = async () => {
    setError('')
    setSavingDraft(true)

    try {
      let result
      if (isEditingDraft) {
        result = await updateThoughtDraft(chatId, currentUser.uid, draft.id, {
          title: title.trim(),
          body: body.trim(),
          mood
        })
      } else {
        result = await saveThoughtDraft(chatId, currentUser.uid, {
          title: title.trim(),
          body: body.trim(),
          mood
        })
      }

      if (result.success) {
        setDraftSavedMessage('Draft saved')
        setTimeout(() => setDraftSavedMessage(''), 2000)
        onDraftSaved?.()
      } else {
        setError(result.error || 'Failed to save draft')
      }
    } catch (err) {
      setError('Failed to save draft')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleDeleteDraft = async () => {
    if (!isEditingDraft) return
    if (!window.confirm('Delete this draft? This cannot be undone.')) return

    setDeletingDraft(true)
    try {
      const result = await deleteThoughtDraft(chatId, currentUser.uid, draft.id)
      if (result.success) {
        onDraftDeleted?.()
        onClose()
      } else {
        setError(result.error || 'Failed to delete draft')
      }
    } catch (err) {
      setError('Failed to delete draft')
    } finally {
      setDeletingDraft(false)
    }
  }

  const handleExitSaveDraft = async () => {
    setShowExitConfirm(false)
    await handleSaveDraft()
    onClose()
  }

  const handleExitDiscard = () => {
    setShowExitConfirm(false)
    onClose()
  }

  const handleExitCancel = () => {
    setShowExitConfirm(false)
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

    let result
    if (isEditingDraft) {
      // Publish the draft
      result = await publishThoughtDraft(chatId, currentUser.uid, draft.id)
    } else {
      // Create new thought directly
      result = await createThought(chatId, currentUser.uid, {
        title: title.trim(),
        body: trimmedBody,
        mood
      })
    }

    if (result.success) {
      onCreated?.()
      if (isEditingDraft) {
        onDraftDeleted?.()
      }
      onClose()
    } else {
      setError(result.error || 'Failed to share thought.')
      setSubmitting(false)
    }
  }

  const isBusy = submitting || savingDraft || deletingDraft

  return (
    <div className="thought-composer-overlay" onClick={handleClose}>
      <div className="thought-composer" onClick={(e) => e.stopPropagation()}>
        <div className="thought-composer-header">
          <button className="thought-composer-back" onClick={handleClose} aria-label="Close">
            ←
          </button>
          <h2>{isEditingDraft ? 'Edit Draft' : 'New Thought'}</h2>
          {isEditingDraft && (
            <button
              type="button"
              className="thought-composer-delete-draft"
              onClick={handleDeleteDraft}
              disabled={isBusy}
              title="Delete draft"
            >
              🗑
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="thought-composer-form">
          {error && <div className="thought-composer-error">{error}</div>}
          {draftSavedMessage && <div className="thought-composer-success">{draftSavedMessage}</div>}

          <div className="thought-composer-field">
            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              className="thought-composer-title"
              disabled={isBusy}
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
              disabled={isBusy}
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
                  disabled={isBusy}
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
              disabled={isBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="thought-composer-draft"
              onClick={handleSaveDraft}
              disabled={isBusy || !hasContent}
            >
              {savingDraft ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              className="thought-composer-submit"
              disabled={isBusy || !body.trim()}
            >
              {submitting ? 'Sharing...' : 'Share Thought'}
            </button>
          </div>
        </form>
      </div>

      {showExitConfirm && (
        <div className="thought-exit-confirm-overlay" onClick={handleExitCancel}>
          <div className="thought-exit-confirm" onClick={(e) => e.stopPropagation()}>
            <h3>Save this thought as a draft?</h3>
            <p>Your changes will be lost if you don't save.</p>
            <div className="thought-exit-confirm-actions">
              <button className="thought-exit-btn discard" onClick={handleExitDiscard}>
                Discard
              </button>
              <button className="thought-exit-btn cancel" onClick={handleExitCancel}>
                Cancel
              </button>
              <button className="thought-exit-btn save" onClick={handleExitSaveDraft}>
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThoughtComposer
