import { useState, useRef, useEffect, useCallback } from 'react'
import { db, storage } from '../firebase/firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

const MAX_DURATION_SECONDS = 60
const MAX_FILE_SIZE = 5 * 1024 * 1024

const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
]

function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const mimeType of SUPPORTED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }
  return null
}

function getFileExtension(mimeType) {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('mpeg')) return 'mp3'
  return 'audio'
}

function getBaseMimeType(mimeType) {
  // Strip codec info for Storage rules (e.g., "audio/webm;codecs=opus" -> "audio/webm")
  return mimeType.split(';')[0]
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function VoiceRecorder({ currentUser, chatId, activeReplyTo, clearReply, disabled, onStateChange }) {
  const [state, setState] = useState('idle') // idle, recording, preview, uploading
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [audioUrl, setAudioUrl] = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const audioBlobRef = useRef(null)
  const mimeTypeRef = useRef(null)
  const previewAudioRef = useRef(null)
  const finalDurationRef = useRef(0)

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
  }, [])

  const cleanupAll = useCallback(() => {
    cleanupStream()
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    chunksRef.current = []
    audioBlobRef.current = null
    mimeTypeRef.current = null
    finalDurationRef.current = 0
  }, [audioUrl, cleanupStream])

  useEffect(() => {
    return () => {
      cleanupStream()
    }
  }, [cleanupStream])

  useEffect(() => {
    onStateChange?.(state !== 'idle')
  }, [state, onStateChange])

  const startRecording = async () => {
    setError('')

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setError('Voice recording is not supported on this browser.')
      return
    }
    mimeTypeRef.current = mimeType

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Check if we have any recorded data
        if (chunksRef.current.length === 0) {
          setError('No audio was recorded. Please try again.')
          cleanupAll()
          setState('idle')
          return
        }

        const blob = new Blob(chunksRef.current, { type: mimeType })

        if (blob.size === 0) {
          setError('Recording was empty. Please try again.')
          cleanupAll()
          setState('idle')
          return
        }

        audioBlobRef.current = blob

        if (blob.size > MAX_FILE_SIZE) {
          setError('Recording too large. Please record a shorter message.')
          cleanupAll()
          setState('idle')
          return
        }

        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('preview')

        // Stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.onerror = () => {
        setError('Recording failed. Please try again.')
        cleanupAll()
        setState('idle')
      }

      mediaRecorder.start(100)
      startTimeRef.current = Date.now()
      setDuration(0)
      setState('recording')

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)

        if (elapsed >= MAX_DURATION_SECONDS) {
          stopRecording()
        }
      }, 100)

    } catch (err) {
      console.error('Microphone error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission is required to record a voice note.')
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.')
      } else {
        setError('Could not access microphone. Please try again.')
      }
      cleanupAll()
      setState('idle')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Capture final duration before stopping
    if (startTimeRef.current) {
      finalDurationRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000)
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Request any remaining data before stopping (important for mobile)
      try {
        mediaRecorderRef.current.requestData()
      } catch (e) {
        // Some browsers don't support requestData, ignore
      }
      mediaRecorderRef.current.stop()
    }
  }

  const cancelRecording = () => {
    stopRecording()
    cleanupAll()
    setDuration(0)
    setState('idle')
    setError('')
  }

  const discardPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
    }
    cleanupAll()
    setDuration(0)
    setState('idle')
  }

  const sendVoiceNote = async () => {
    if (!audioBlobRef.current) {
      setError('No recording found. Please try again.')
      return
    }

    setState('uploading')
    setUploadProgress(0)
    setError('')

    try {
      const messageId = generateId()
      const ext = getFileExtension(mimeTypeRef.current)
      const baseMimeType = getBaseMimeType(mimeTypeRef.current)
      const storagePath = `chatVoice/${chatId}/${messageId}/voice-note.${ext}`
      const storageRef = ref(storage, storagePath)

      // Upload original blob with explicit content type metadata
      const blobSize = audioBlobRef.current.size
      const metadata = { contentType: baseMimeType }
      const uploadTask = uploadBytesResumable(storageRef, audioBlobRef.current, metadata)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          setUploadProgress(progress)
        },
        (uploadError) => {
          console.error('Voice upload error:', uploadError)
          const errorMsg = uploadError.code === 'storage/unauthorized'
            ? 'Permission denied. Please check your connection.'
            : 'Failed to upload voice note. Please try again.'
          setError(errorMsg)
          setState('preview')
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(storageRef)

            const messageData = {
              type: 'voice',
              text: '',
              senderId: currentUser.uid,
              senderPhone: currentUser.phoneNumber,
              createdAt: serverTimestamp(),
              voice: {
                storagePath,
                contentType: baseMimeType,
                size: blobSize,
                durationSeconds: finalDurationRef.current || duration,
                url: downloadURL,
              },
            }

            if (activeReplyTo) {
              messageData.replyTo = {
                messageId: activeReplyTo.messageId,
                senderId: activeReplyTo.senderId,
                textPreview: activeReplyTo.textPreview,
              }
            }

            await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
            clearReply?.()
            cleanupAll()
            setDuration(0)
            setState('idle')
          } catch (createErr) {
            console.error('Failed to create voice message:', createErr)
            const errorMsg = createErr.code === 'permission-denied'
              ? 'Permission denied. Voice may be too long.'
              : 'Voice uploaded but failed to save message.'
            setError(errorMsg)
            setState('preview')
          }
        }
      )
    } catch (err) {
      console.error('Voice send error:', err)
      setError('Failed to send voice note. Please try again.')
      setState('preview')
    }
  }

  if (state === 'idle') {
    return (
      <>
        {error && <div className="voice-error">{error}</div>}
        <button
          type="button"
          className="voice-btn"
          onClick={startRecording}
          disabled={disabled}
          title="Record voice note"
          aria-label="Record voice note"
        >
          🎤
        </button>
      </>
    )
  }

  if (state === 'recording') {
    return (
      <div className="voice-recorder recording">
        <div className="voice-recording-indicator">
          <span className="voice-recording-dot" aria-hidden="true" />
          <span className="voice-recording-text">Recording</span>
          <span className="voice-duration">{formatDuration(duration)}</span>
          <span className="voice-max-hint">/ {formatDuration(MAX_DURATION_SECONDS)}</span>
        </div>
        <div className="voice-recording-actions">
          <button
            type="button"
            className="voice-cancel-btn"
            onClick={cancelRecording}
            aria-label="Cancel recording"
          >
            ✕
          </button>
          <button
            type="button"
            className="voice-stop-btn"
            onClick={stopRecording}
            aria-label="Stop recording"
          >
            ⏹
          </button>
        </div>
      </div>
    )
  }

  if (state === 'preview') {
    return (
      <div className="voice-recorder preview">
        {error && <div className="voice-error">{error}</div>}
        <div className="voice-preview-player">
          <audio
            ref={previewAudioRef}
            src={audioUrl}
            controls
            className="voice-audio-preview"
          />
          <span className="voice-duration">{formatDuration(duration)}</span>
        </div>
        <div className="voice-preview-actions">
          <button
            type="button"
            className="voice-discard-btn"
            onClick={discardPreview}
            aria-label="Discard voice note"
          >
            🗑
          </button>
          <button
            type="button"
            className="voice-send-btn"
            onClick={sendVoiceNote}
            aria-label="Send voice note"
          >
            Send
          </button>
        </div>
      </div>
    )
  }

  if (state === 'uploading') {
    return (
      <div className="voice-recorder uploading">
        <div className="voice-upload-progress">
          <div className="voice-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="voice-progress-text">Sending... {uploadProgress}%</span>
        </div>
      </div>
    )
  }

  return null
}

export default VoiceRecorder
