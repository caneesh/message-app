import { useState, useEffect, useRef } from 'react'
import { db, storage } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'

const PREVIEW_MAX_LENGTH = 80

function truncateText(text, maxLength = PREVIEW_MAX_LENGTH) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function isImageType(contentType) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'].includes(contentType)
}

function MessageList({ currentUser, chatId, onReply }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMessages(messageList)
        setLoading(false)
      },
      (err) => {
        console.error('Firestore error:', err)
        if (err.code === 'permission-denied') {
          setError('You do not have access to this chat.')
        } else {
          setError('Failed to load messages.')
        }
        setLoading(false)
      }
    )

    return unsubscribe
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate()
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const handleDelete = async (message) => {
    if (!window.confirm('Delete this message?')) return

    setDeletingId(message.id)
    try {
      // Delete from Firestore first
      await deleteDoc(doc(db, 'chats', chatId, 'messages', message.id))

      // If it's a file message, also delete from Storage
      if (message.type === 'file' && message.file?.storagePath) {
        try {
          const storageRef = ref(storage, message.file.storagePath)
          await deleteObject(storageRef)
        } catch (storageErr) {
          console.warn('Failed to delete file from storage:', storageErr)
        }
      }
    } catch (err) {
      console.error('Delete error:', err)
      if (err.code === 'permission-denied') {
        alert('You do not have permission to delete this message.')
      } else {
        alert('Failed to delete message. Please try again.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleReply = (message) => {
    const previewText = message.type === 'file' && message.file
      ? `📎 ${message.file.fileName}`
      : message.text
    onReply({
      messageId: message.id,
      senderId: message.senderId,
      textPreview: truncateText(previewText),
    })
  }

  const renderFileContent = (file) => {
    if (!file || !file.url) {
      return <div className="file-loading">Loading file...</div>
    }

    if (isImageType(file.contentType)) {
      return (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-image-link">
          <img src={file.url} alt={file.fileName} className="file-image" />
        </a>
      )
    }

    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-card">
        <span className="file-icon">
          {file.contentType === 'application/pdf' ? '📄' : '📝'}
        </span>
        <div className="file-info">
          <span className="file-name">{file.fileName}</span>
          <span className="file-size">{formatFileSize(file.size)}</span>
        </div>
      </a>
    )
  }

  if (loading) {
    return <div className="message-list loading">Loading messages...</div>
  }

  if (error) {
    return <div className="message-list error">{error}</div>
  }

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">No messages yet. Say hello!</div>
      ) : (
        messages.map((message) => {
          const isOwn = message.senderId === currentUser.uid
          const replyTo = message.replyTo
          const isReplyToOwn = replyTo?.senderId === currentUser.uid
          const isFileMessage = message.type === 'file'

          return (
            <div
              key={message.id}
              className={`message ${isOwn ? 'own' : 'other'} ${isFileMessage ? 'file-message' : ''}`}
            >
              {replyTo && (
                <div className="reply-quote">
                  <span className="reply-quote-label">
                    {isReplyToOwn ? 'You' : 'Friend'}
                  </span>
                  <span className="reply-quote-text">{replyTo.textPreview}</span>
                </div>
              )}
              <div className="message-header">
                <span className="message-sender">{message.senderPhone}</span>
                <div className="message-actions">
                  <button
                    className="reply-btn"
                    onClick={() => handleReply(message)}
                    title="Reply"
                  >
                    ↩
                  </button>
                  {isOwn && (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(message)}
                      disabled={deletingId === message.id}
                      title="Delete message"
                    >
                      {deletingId === message.id ? '...' : '×'}
                    </button>
                  )}
                </div>
              </div>
              {isFileMessage ? (
                renderFileContent(message.file)
              ) : (
                <div className="message-text">{message.text}</div>
              )}
              <div className="message-time">{formatTime(message.createdAt)}</div>
            </div>
          )
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList
