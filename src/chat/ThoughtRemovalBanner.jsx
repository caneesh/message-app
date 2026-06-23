import { useState } from 'react'
import { FEELING_LABELS } from '../services/thoughtRemovalService'

const FEELING_ICONS = {
  hurt: '💔',
  upset: '😢',
  angry: '😤',
  overwhelmed: '😰',
  need_space: '🌙',
  prefer_not_to_say: '🤍'
}

function ThoughtRemovalBanner({
  request,
  isRequester,
  onAccept,
  onDismiss,
  onCancel,
  onTalkInChat
}) {
  const [accepting, setAccepting] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const handleAccept = async () => {
    setAccepting(true)
    await onAccept()
    setAccepting(false)
  }

  const handleDismiss = async () => {
    setDismissing(true)
    await onDismiss()
    setDismissing(false)
  }

  const handleCancel = async () => {
    setCancelling(true)
    await onCancel()
    setCancelling(false)
  }

  const isBusy = accepting || dismissing || cancelling

  if (isRequester) {
    return (
      <div className="thought-removal-banner requester">
        <div className="removal-banner-header">
          <span className="removal-banner-icon">⏳</span>
          <div className="removal-banner-header-text">
            <p className="removal-banner-title">
              You asked to remove this Thought
            </p>
            <p className="removal-banner-subtitle">
              Waiting for their response. This Thought is hidden from your view.
            </p>
          </div>
        </div>
        <div className="removal-banner-actions">
          <button
            className="removal-banner-btn cancel"
            onClick={handleCancel}
            disabled={isBusy}
          >
            {cancelling ? '...' : 'Cancel request'}
          </button>
        </div>
      </div>
    )
  }

  const feelingIcon = request.feeling ? FEELING_ICONS[request.feeling] : '💔'

  return (
    <div className="thought-removal-banner receiver">
      <div className="removal-banner-header">
        <span className="removal-banner-icon">{feelingIcon}</span>
        <div className="removal-banner-header-text">
          <p className="removal-banner-title">
            They asked to remove this Thought from both views.
          </p>
          <p className="removal-banner-subtitle">
            This may be a sensitive moment. You can accept removal or talk in chat.
          </p>
        </div>
      </div>

      {request.feeling && request.feeling !== 'prefer_not_to_say' && (
        <div className="removal-banner-feeling-badge">
          <span className="feeling-badge-icon">{feelingIcon}</span>
          <span className="feeling-badge-text">
            {FEELING_LABELS[request.feeling] || request.feeling}
          </span>
        </div>
      )}

      {request.note && (
        <div className="removal-banner-note">
          <span className="removal-banner-note-quote">"</span>
          {request.note}
        </div>
      )}

      <div className="removal-banner-actions">
        <button
          className="removal-banner-btn accept"
          onClick={handleAccept}
          disabled={isBusy}
          aria-label="Accept removal request"
        >
          {accepting ? 'Removing...' : 'Accept removal'}
        </button>
        <button
          className="removal-banner-btn talk"
          onClick={onTalkInChat}
          disabled={isBusy}
          aria-label="Open chat to talk about this"
        >
          Talk in chat
        </button>
        <button
          className="removal-banner-btn dismiss"
          onClick={handleDismiss}
          disabled={isBusy}
          aria-label="Dismiss this request for now"
        >
          {dismissing ? '...' : 'Dismiss for now'}
        </button>
      </div>
    </div>
  )
}

export default ThoughtRemovalBanner
