import { useState, useRef, useEffect, useCallback } from 'react'
import { db, storage } from '../firebase/firebaseConfig'
import { collection, addDoc, doc, setDoc, deleteDoc, getDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import ToneRepairAiButton from './ToneRepairAiButton'

const MAX_MESSAGE_LENGTH = 2000

const HARSH_PATTERNS = [
  { pattern: /why didn't you/gi, softer: "Just checking — were you able to" },
  { pattern: /you never/gi, softer: "I feel like I may not be getting through clearly about" },
  { pattern: /you always/gi, softer: "It sometimes feels like" },
  { pattern: /this is wrong/gi, softer: "I think there may be an issue here" },
  { pattern: /what's wrong with you/gi, softer: "I'm a bit confused about" },
  { pattern: /I can't believe you/gi, softer: "I was surprised when" },
  { pattern: /you should have/gi, softer: "It might have helped if" },
  { pattern: /you forgot/gi, softer: "Did you get a chance to remember" },
]

const softenMessage = (text) => {
  let softened = text
  let wasTransformed = false

  for (const { pattern, softer } of HARSH_PATTERNS) {
    if (pattern.test(softened)) {
      softened = softened.replace(pattern, softer)
      wasTransformed = true
    }
  }

  if (!wasTransformed) {
    const hasHarshIndicators =
      text === text.toUpperCase() && text.length > 3 ||
      (text.match(/!/g) || []).length >= 2 ||
      /\?{2,}/.test(text)

    if (hasHarshIndicators) {
      softened = "Hey, I wanted to say this gently: " + text.toLowerCase().replace(/!+/g, '.').replace(/\?{2,}/g, '?')
      wasTransformed = true
    }
  }

  if (!wasTransformed && text.length > 10) {
    softened = "Hey, " + text.charAt(0).toLowerCase() + text.slice(1)
    wasTransformed = true
  }

  return { softened, wasTransformed }
}

const STRESSED_MOODS = ['😟', '😴']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'application/pdf',
  'text/plain',
]

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

const TYPING_TIMEOUT = 2000

const QUICK_ACTIONS = [
  { key: 'call_me', text: '📞 Call me', priority: false },
  { key: 'need_help', text: '🆘 I need help', priority: true },
  { key: 'reached_safely', text: '✅ Reached safely', priority: false },
  { key: 'running_late', text: '⏰ Running late', priority: false },
  { key: 'on_the_way', text: '🚗 On the way', priority: false },
  { key: 'busy_now', text: '🔇 Busy now', priority: false },
]

function MessageInput({ currentUser, chatId, activeReplyTo, clearReply }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showToneOptions, setShowToneOptions] = useState(false)
  const [toneSuggestion, setToneSuggestion] = useState(null)
  const [partnerMood, setPartnerMood] = useState(null)
  const [showMoodNudge, setShowMoodNudge] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    const fetchPartnerMood = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId))
        if (!chatDoc.exists()) return

        const members = chatDoc.data().members || []
        const partnerUid = members.find(m => m !== currentUser.uid)
        if (!partnerUid) return

        const today = new Date().toISOString().split('T')[0]
        const checkInsRef = collection(db, 'chats', chatId, 'checkIns')
        const q = query(
          checkInsRef,
          where('userId', '==', partnerUid),
          where('dateKey', '==', today),
          limit(1)
        )
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const checkIn = snapshot.docs[0].data()
          if (STRESSED_MOODS.includes(checkIn.mood)) {
            setPartnerMood(checkIn.mood)
          }
        }
      } catch (err) {
        console.error('Error fetching partner mood:', err)
      }
    }
    fetchPartnerMood()
  }, [chatId, currentUser.uid])

  const setTypingStatus = useCallback(async (isTyping) => {
    try {
      const typingRef = doc(db, 'chats', chatId, 'typing', currentUser.uid)
      if (isTyping) {
        await setDoc(typingRef, {
          uid: currentUser.uid,
          isTyping: true,
          updatedAt: serverTimestamp(),
        })
      } else {
        await deleteDoc(typingRef)
      }
    } catch (err) {
      console.error('Error updating typing status:', err)
    }
  }, [chatId, currentUser.uid])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTypingRef.current) {
        isTypingRef.current = false
        setTypingStatus(false)
      }
    }
  }, [setTypingStatus])

  const trimmedText = text.trim()
  const isOverLimit = trimmedText.length > MAX_MESSAGE_LENGTH
  const isReplyToOwn = activeReplyTo?.senderId === currentUser.uid

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!trimmedText || sending || isOverLimit) return

    setSending(true)
    try {
      const messageData = {
        type: 'text',
        text: trimmedText,
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
      }

      if (activeReplyTo) {
        messageData.replyTo = {
          messageId: activeReplyTo.messageId,
          senderId: activeReplyTo.senderId,
          textPreview: activeReplyTo.textPreview,
        }
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
      setText('')
      clearReply()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      setTypingStatus(false)
    } catch (err) {
      console.error('Failed to send message:', err)
      if (err.code === 'permission-denied') {
        setError('You do not have permission to send messages.')
      } else {
        setError('Failed to send message. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleChange = (e) => {
    const newText = e.target.value
    setText(newText)
    if (error) setError('')
    setToneSuggestion(null)
    setShowToneOptions(false)

    // Check for harsh patterns when partner is stressed
    if (partnerMood && !nudgeDismissed && newText.trim().length > 10) {
      const hasHarshIndicators =
        newText === newText.toUpperCase() && newText.length > 5 ||
        (newText.match(/!/g) || []).length >= 2 ||
        HARSH_PATTERNS.some(({ pattern }) => pattern.test(newText))

      if (hasHarshIndicators) {
        setShowMoodNudge(true)
      }
    } else {
      setShowMoodNudge(false)
    }

    // Debounced typing status - only write to Firestore when status changes
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (newText.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true
        setTypingStatus(true)
      }
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false
        setTypingStatus(false)
      }, TYPING_TIMEOUT)
    } else if (isTypingRef.current) {
      isTypingRef.current = false
      setTypingStatus(false)
    }
  }

  const handleToneOption = (option) => {
    setShowToneOptions(false)
    const result = softenMessage(text)
    if (result.wasTransformed) {
      setToneSuggestion({ original: text, softened: result.softened, option })
    } else {
      setToneSuggestion({ original: text, softened: "Hey, " + text, option })
    }
  }

  const acceptToneSuggestion = () => {
    if (toneSuggestion) {
      setText(toneSuggestion.softened)
      setToneSuggestion(null)
      setShowMoodNudge(false)
    }
  }

  const cancelToneSuggestion = () => {
    setToneSuggestion(null)
  }

  const dismissMoodNudge = () => {
    setShowMoodNudge(false)
    setNudgeDismissed(true)
  }

  const handleQuickAction = async (action) => {
    if (sending) return
    setShowQuickActions(false)
    setSending(true)
    setError('')

    try {
      const messageData = {
        type: 'text',
        text: action.text,
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
    } catch (err) {
      console.error('Failed to send quick action:', err)
      setError('Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input
    e.target.value = ''

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Allowed: JPG, PNG, WebP, PDF, TXT')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 5 MB.')
      return
    }

    setError('')
    setSending(true)
    setUploadProgress(0)

    try {
      // Generate a unique ID for the file path
      const fileId = generateId()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `chatFiles/${chatId}/${fileId}/${safeFileName}`
      const storageRef = ref(storage, storagePath)

      // Upload file with progress
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          )
          setUploadProgress(progress)
        },
        (uploadError) => {
          console.error('Upload error:', uploadError)
          setError('Failed to upload file. Please try again.')
          setSending(false)
          setUploadProgress(null)
        },
        async () => {
          // Upload complete - get download URL and create message
          try {
            const downloadURL = await getDownloadURL(storageRef)

            const messageData = {
              type: 'file',
              text: '',
              senderId: currentUser.uid,
              senderPhone: currentUser.phoneNumber,
              createdAt: serverTimestamp(),
              file: {
                storagePath,
                fileName: file.name,
                contentType: file.type,
                size: file.size,
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
            clearReply()
          } catch (createErr) {
            console.error('Failed to create message:', createErr)
            setError('File uploaded but failed to save message.')
          } finally {
            setSending(false)
            setUploadProgress(null)
          }
        }
      )
    } catch (err) {
      console.error('Failed to start upload:', err)
      setError('Failed to send file. Please try again.')
      setSending(false)
      setUploadProgress(null)
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="message-input-wrapper">
      {error && <div className="input-error">{error}</div>}
      {isOverLimit && (
        <div className="input-error">
          Message too long ({trimmedText.length}/{MAX_MESSAGE_LENGTH})
        </div>
      )}
      {showMoodNudge && partnerMood && (
        <div className="mood-nudge">
          <span>
            {partnerMood === '😟' ? "They seem stressed today." : "They seem tired today."} Consider sending this gently.
          </span>
          <div className="mood-nudge-actions">
            <button onClick={() => setShowToneOptions(true)}>Soften</button>
            <button onClick={dismissMoodNudge}>Dismiss</button>
          </div>
        </div>
      )}
      {toneSuggestion && (
        <div className="tone-suggestion">
          <div className="tone-suggestion-label">Suggested softer version:</div>
          <div className="tone-suggestion-text">{toneSuggestion.softened}</div>
          <div className="tone-suggestion-actions">
            <button className="tone-accept" onClick={acceptToneSuggestion}>Accept</button>
            <button className="tone-cancel" onClick={cancelToneSuggestion}>Keep Original</button>
          </div>
        </div>
      )}
      {uploadProgress !== null && (
        <div className="upload-progress">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="upload-progress-text">Uploading... {uploadProgress}%</span>
        </div>
      )}
      {showQuickActions && (
        <div className="quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              className={`quick-action-btn ${action.priority ? 'priority' : ''}`}
              onClick={() => handleQuickAction(action)}
              disabled={sending}
            >
              {action.text}
            </button>
          ))}
        </div>
      )}
      {showToneOptions && (
        <div className="tone-options">
          <button onClick={() => handleToneOption('softer')}>Make softer</button>
          <button onClick={() => handleToneOption('clearer')}>Make clearer</button>
          <button onClick={() => handleToneOption('caring')}>Make more caring</button>
          <button onClick={() => setShowToneOptions(false)}>Cancel</button>
        </div>
      )}
      {activeReplyTo && (
        <div className="reply-preview">
          <div className="reply-preview-content">
            <span className="reply-preview-label">
              Replying to {isReplyToOwn ? 'yourself' : 'friend'}
            </span>
            <span className="reply-preview-text">{activeReplyTo.textPreview}</span>
          </div>
          <button className="reply-cancel-btn" onClick={clearReply} title="Cancel reply">
            ×
          </button>
        </div>
      )}
      <form className="message-input-container" onSubmit={handleSubmit}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={ALLOWED_TYPES.join(',')}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="quick-toggle-btn"
          onClick={() => setShowQuickActions(!showQuickActions)}
          disabled={sending}
          title="Quick actions"
          aria-label="Quick actions"
          aria-expanded={showQuickActions}
        >
          ⚡
        </button>
        <button
          type="button"
          className="attach-btn"
          onClick={openFilePicker}
          disabled={sending}
          title="Attach file"
          aria-label="Attach file"
        >
          📎
        </button>
        {trimmedText.length > 5 && (
          <>
            <button
              type="button"
              className="tone-btn"
              onClick={() => setShowToneOptions(!showToneOptions)}
              disabled={sending}
              title="Soften tone (local)"
              aria-label="Soften message tone"
            >
              💝
            </button>
            <ToneRepairAiButton
              currentUser={currentUser}
              chatId={chatId}
              text={text}
              onSuggestion={(suggestion) => setToneSuggestion(suggestion)}
              disabled={sending}
            />
          </>
        )}
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={handleChange}
          disabled={sending}
          aria-label="Message input"
        />
        <button
          type="submit"
          disabled={sending || !trimmedText || isOverLimit}
          aria-label={sending ? 'Sending message' : 'Send message'}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default MessageInput
