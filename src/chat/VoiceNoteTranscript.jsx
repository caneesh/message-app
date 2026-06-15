import { useState } from 'react'

const MAX_COLLAPSED_LENGTH = 150

function VoiceNoteTranscript({ transcriptText, status, errorCode, onRetry, isRequesting }) {
  const [expanded, setExpanded] = useState(false)

  if (status === 'pending' || isRequesting) {
    return (
      <div className="voice-transcript voice-transcript--loading">
        <span className="voice-transcript__loading-icon">...</span>
        <span className="voice-transcript__loading-text">Transcribing...</span>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="voice-transcript voice-transcript--error">
        <span className="voice-transcript__error-text">
          Couldn't transcribe this voice note.
        </span>
        {onRetry && (
          <button
            className="voice-transcript__retry-btn"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (status === 'completed' && transcriptText) {
    const isLong = transcriptText.length > MAX_COLLAPSED_LENGTH
    const displayText = expanded || !isLong
      ? transcriptText
      : transcriptText.slice(0, MAX_COLLAPSED_LENGTH) + '...'

    return (
      <div className="voice-transcript voice-transcript--completed">
        <div className="voice-transcript__label">Transcript</div>
        <div className="voice-transcript__text">{displayText}</div>
        {isLong && (
          <button
            className="voice-transcript__toggle-btn"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? 'Show less' : 'Show full transcript'}
          </button>
        )}
        <div className="voice-transcript__note">
          Generated from this voice note
        </div>
      </div>
    )
  }

  return null
}

export default VoiceNoteTranscript
