import { useState } from 'react'
import { db, functions } from '../firebase/firebaseConfig'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

function MisunderstandingAiSuggestion({
  currentUser,
  chatId,
  misunderstanding,
  onClose,
  onAccept,
}) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [suggestionId, setSuggestionId] = useState(null)
  const [editedText, setEditedText] = useState('')
  const [error, setError] = useState('')

  const handleExtract = async () => {
    if (loading) return

    setLoading(true)
    setError('')
    setSuggestion(null)

    try {
      const aiMisunderstandingHelper = httpsCallable(functions, 'aiMisunderstandingHelper')
      const result = await aiMisunderstandingHelper({
        chatId,
        misunderstandingId: misunderstanding.id,
      })

      if (result.data.suggestion) {
        setSuggestion(result.data.suggestion)
        setSuggestionId(result.data.suggestionId)
        setEditedText(result.data.suggestion.clarificationText)
      } else if (result.data.reason === 'NO_SUGGESTION') {
        setError('Unable to generate a suggestion for this situation')
      } else if (result.data.reason === 'AI_OUTPUT_FILTERED') {
        setError('Content was filtered for safety')
      }
    } catch (err) {
      console.error('AI misunderstanding helper error:', err)
      if (err.code === 'functions/resource-exhausted') {
        setError('Rate limit reached. Try again later.')
      } else if (err.code === 'functions/failed-precondition') {
        setError('Enable AI in Settings first')
      } else if (err.code === 'functions/invalid-argument') {
        if (err.message?.includes('SENSITIVE_DATA')) {
          setError('Cannot process content with sensitive data')
        } else {
          setError('Invalid input')
        }
      } else {
        setError('Failed to get AI help')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!suggestionId || !editedText.trim()) return

    try {
      const suggestionRef = doc(db, 'chats', chatId, 'aiSuggestions', suggestionId)
      await updateDoc(suggestionRef, {
        status: 'accepted',
        acceptedPayload: {
          clarificationText: editedText.trim(),
        },
        reviewedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
      })

      onAccept(editedText.trim())
      onClose()
    } catch (err) {
      console.error('Error accepting suggestion:', err)
      setError('Failed to accept suggestion')
    }
  }

  const handleDismiss = async () => {
    if (suggestionId) {
      try {
        const suggestionRef = doc(db, 'chats', chatId, 'aiSuggestions', suggestionId)
        await updateDoc(suggestionRef, {
          status: 'dismissed',
          reviewedBy: currentUser.uid,
          reviewedAt: serverTimestamp(),
        })
      } catch (err) {
        console.error('Error dismissing suggestion:', err)
      }
    }
    onClose()
  }

  return (
    <div className="misunderstanding-ai-panel">
      <div className="ai-panel-header">
        <h4>AI Help</h4>
        <button className="ai-panel-close" onClick={handleDismiss}>
          ×
        </button>
      </div>

      {error && <div className="ai-panel-error">{error}</div>}

      {!suggestion ? (
        <div className="ai-panel-prompt">
          <p>
            Let AI suggest a gentle way to clarify this misunderstanding.
          </p>
          <button
            className="ai-panel-extract-btn"
            onClick={handleExtract}
            disabled={loading}
          >
            {loading ? 'Thinking...' : '✨ Get Suggestion'}
          </button>
        </div>
      ) : (
        <div className="ai-panel-suggestion">
          {suggestion.issueIdentified && (
            <div className="ai-suggestion-meta">
              <strong>Issue identified:</strong> {suggestion.issueIdentified}
            </div>
          )}
          {suggestion.suggestedApproach && (
            <div className="ai-suggestion-meta">
              <strong>Approach:</strong> {suggestion.suggestedApproach}
            </div>
          )}

          <div className="ai-suggestion-edit">
            <label>Suggested message (you can edit):</label>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={5}
              maxLength={2000}
            />
          </div>

          <div className="ai-panel-actions">
            <button
              className="ai-accept-btn"
              onClick={handleAccept}
              disabled={!editedText.trim()}
            >
              Accept & Copy to Chat
            </button>
            <button className="ai-dismiss-btn" onClick={handleDismiss}>
              Dismiss
            </button>
          </div>

          <p className="ai-panel-note">
            Message will be copied to chat input. You must send it manually.
          </p>
        </div>
      )}
    </div>
  )
}

export default MisunderstandingAiSuggestion
