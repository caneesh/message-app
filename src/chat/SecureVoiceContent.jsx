import { useState, useRef, useEffect } from 'react'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'
import VoiceNoteTranscript from './VoiceNoteTranscript'
import { requestTranscription } from '../services/transcriptionService'

const isDev = import.meta.env.DEV

function formatVoiceDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /^((?!chrome|android).)*safari/i.test(ua)
}

function isFormatSupported(contentType) {
  if (!contentType) return true // Assume supported if unknown

  const isSafariBrowser = isIOS() || isSafari()

  // WebM is not supported on Safari/iOS
  if (isSafariBrowser && contentType.includes('webm')) {
    return false
  }

  return true
}

function SecureVoiceContent({
  chatId,
  voice,
  messageId,
  transcriptionStatus,
  transcriptText,
  transcriptErrorCode,
  currentUserId
}) {
  const audioRef = useRef(null)
  const [playError, setPlayError] = useState(false)
  const [errorDetails, setErrorDetails] = useState(null)
  const [isRequesting, setIsRequesting] = useState(false)

  // Use stored URL for old messages, secure URL for new ones
  const needsSecureUrl = !voice?.url && voice?.storagePath
  const { url: secureUrl, loading, error: fetchError } = useSecureFileUrl(
    needsSecureUrl ? chatId : null,
    needsSecureUrl ? voice?.storagePath : null
  )

  const audioUrl = voice?.url || secureUrl
  const contentType = voice?.contentType || 'audio/webm'

  // Check if format is supported on this device
  const formatSupported = isFormatSupported(contentType)

  useEffect(() => {
    if (isDev && audioUrl) {
      console.log('[SecureVoiceContent] Audio ready:', {
        contentType,
        formatSupported,
        isIOS: isIOS(),
        isSafari: isSafari(),
        storagePath: voice?.storagePath,
      })
    }
  }, [audioUrl, contentType, formatSupported, voice?.storagePath])

  const handleError = (e) => {
    const error = e.target.error
    const errorInfo = {
      code: error?.code,
      message: error?.message,
      contentType,
      isIOS: isIOS(),
      isSafari: isSafari(),
    }

    if (isDev) {
      console.error('[SecureVoiceContent] Playback error:', errorInfo)
    }

    setErrorDetails(errorInfo)
    setPlayError(true)
  }

  const handleTranscribe = async () => {
    if (!chatId || !messageId || !currentUserId) return
    if (isRequesting || transcriptionStatus === 'pending') return

    setIsRequesting(true)
    try {
      await requestTranscription(chatId, messageId, currentUserId)
    } catch (err) {
      console.error('Transcription request failed:', err)
    } finally {
      setIsRequesting(false)
    }
  }

  const canTranscribe = messageId && currentUserId && (
    !transcriptionStatus ||
    transcriptionStatus === 'none' ||
    transcriptionStatus === 'failed'
  )

  const showTranscript = transcriptionStatus === 'completed' ||
    transcriptionStatus === 'pending' ||
    transcriptionStatus === 'failed' ||
    isRequesting

  if (!voice?.storagePath && !voice?.url) {
    return <div className="voice-loading">Voice note not available</div>
  }

  if (needsSecureUrl && loading) {
    return <div className="voice-loading">Loading voice note...</div>
  }

  if (needsSecureUrl && fetchError) {
    return <div className="voice-error-state">Failed to load voice note</div>
  }

  // Show unsupported message for WebM on Safari/iOS before even trying to play
  if (!formatSupported) {
    return (
      <div className="voice-message voice-unsupported-format">
        <span className="voice-icon" aria-hidden="true">🎤</span>
        <span className="voice-unsupported">
          This voice note format ({contentType}) is not supported on this device.
          <a
            href={audioUrl}
            download={`voice-note.${contentType.includes('webm') ? 'webm' : 'm4a'}`}
            className="voice-download-link"
          >
            Download
          </a>
        </span>
        <span className="voice-duration">{formatVoiceDuration(voice.durationSeconds)}</span>
      </div>
    )
  }

  if (playError) {
    return (
      <div className="voice-message voice-error-state">
        <span className="voice-icon" aria-hidden="true">🎤</span>
        <span className="voice-unsupported">
          Cannot play on this device.
          <a
            href={audioUrl}
            download="voice-note"
            className="voice-download-link"
          >
            Download
          </a>
        </span>
        <span className="voice-duration">{formatVoiceDuration(voice.durationSeconds)}</span>
      </div>
    )
  }

  return (
    <div className="voice-message-container">
      <div className="voice-message">
        <span className="voice-icon" aria-hidden="true">🎤</span>
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="voice-audio-player"
          preload="metadata"
          playsInline
          onError={handleError}
        />
        <span className="voice-duration">{formatVoiceDuration(voice.durationSeconds)}</span>
      </div>

      {showTranscript ? (
        <VoiceNoteTranscript
          transcriptText={transcriptText}
          status={transcriptionStatus}
          errorCode={transcriptErrorCode}
          onRetry={handleTranscribe}
          isRequesting={isRequesting}
        />
      ) : canTranscribe && (
        <button
          className="voice-transcribe-btn"
          onClick={handleTranscribe}
          type="button"
          disabled={isRequesting}
        >
          Transcribe
        </button>
      )}
    </div>
  )
}

export default SecureVoiceContent
