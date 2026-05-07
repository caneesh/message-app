import { useState, useRef } from 'react'
import { db, storage } from '../firebase/firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

const MAX_MESSAGE_LENGTH = 2000
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

function MessageInput({ currentUser, chatId, activeReplyTo, clearReply }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)
  const fileInputRef = useRef(null)

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
    setText(e.target.value)
    if (error) setError('')
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
      {uploadProgress !== null && (
        <div className="upload-progress">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="upload-progress-text">Uploading... {uploadProgress}%</span>
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
          className="attach-btn"
          onClick={openFilePicker}
          disabled={sending}
          title="Attach file"
        >
          📎
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={handleChange}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !trimmedText || isOverLimit}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default MessageInput
