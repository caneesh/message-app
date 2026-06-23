import { useState } from 'react'
import { FEELING_LABELS } from '../services/thoughtRemovalService'

const FEELINGS = [
  { id: 'hurt', label: 'Hurt', icon: '💔' },
  { id: 'upset', label: 'Upset', icon: '😢' },
  { id: 'angry', label: 'Angry', icon: '😤' },
  { id: 'overwhelmed', label: 'Overwhelmed', icon: '😰' },
  { id: 'need_space', label: 'Need space', icon: '🌙' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤍' }
]

function ThoughtRemovalModal({ onSubmit, onCancel, submitting }) {
  const [feeling, setFeeling] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (!feeling) return
    onSubmit({ feeling, note: note.trim() || null })
  }

  const charsRemaining = 500 - note.length

  return (
    <div className="thought-removal-modal-overlay" onClick={onCancel}>
      <div className="thought-removal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="removal-modal-header">
          <span className="removal-modal-header-icon">💔</span>
          <h3>This Thought hurts?</h3>
          <p className="removal-modal-header-subtitle">
            You can hide it from your view now and ask to remove it from both of your views.
          </p>
        </div>

        <div className="removal-modal-body">
          <div className="removal-modal-feelings">
            <label className="removal-modal-label">How are you feeling?</label>
            <div className="feeling-chips">
              {FEELINGS.map((f) => (
                <button
                  key={f.id}
                  className={`feeling-chip ${feeling === f.id ? 'selected' : ''}`}
                  onClick={() => setFeeling(f.id)}
                  type="button"
                  aria-pressed={feeling === f.id}
                >
                  <span className="feeling-chip-icon">{f.icon}</span>
                  <span className="feeling-chip-label">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="removal-modal-note">
            <label className="removal-modal-label">
              Add a note (optional)
            </label>
            <textarea
              className="removal-note-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="You can share why this is difficult..."
              rows={3}
              maxLength={550}
              disabled={submitting}
            />
            <span className={`removal-note-count ${charsRemaining < 50 ? 'warning' : ''}`}>
              {charsRemaining}
            </span>
          </div>
        </div>

        <div className="removal-modal-actions">
          <button
            className="removal-modal-cancel"
            onClick={onCancel}
            disabled={submitting}
            type="button"
          >
            Cancel
          </button>
          <button
            className="removal-modal-submit"
            onClick={handleSubmit}
            disabled={!feeling || submitting}
            type="button"
          >
            {submitting ? 'Sending...' : 'Hide it and send request'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ThoughtRemovalModal
