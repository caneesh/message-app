import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { useReadArchiveState } from '../hooks/useReadArchiveState'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'
import { formatDuration } from '../utils/messageExtractors'

function ArchiveMessageThumbnail({ chatId, message }) {
  const storagePath = message.file?.storagePath || message.voice?.storagePath
  const { url, loading } = useSecureFileUrl(storagePath ? chatId : null, storagePath)

  if (!storagePath) return null

  const isImage = message.type === 'file' && message.file?.contentType?.startsWith('image/')
  const isVideo = message.type === 'video'
  const isVoice = message.type === 'voice'

  if (loading) {
    return <div className="archive-thumbnail loading" />
  }

  if (isImage && url) {
    return (
      <div className="archive-thumbnail image">
        <img src={url} alt="" />
      </div>
    )
  }

  if (isVideo) {
    return (
      <div className="archive-thumbnail video">
        <span className="archive-thumbnail-icon">🎬</span>
      </div>
    )
  }

  if (isVoice) {
    const duration = message.voice?.durationSeconds
    return (
      <div className="archive-thumbnail voice">
        <span className="archive-thumbnail-icon">🎤</span>
        {duration && <span className="archive-thumbnail-duration">{formatDuration(duration)}</span>}
      </div>
    )
  }

  return (
    <div className="archive-thumbnail document">
      <span className="archive-thumbnail-icon">📄</span>
    </div>
  )
}

function ArchiveMessageItem({ message, chatId, currentUserId }) {
  const isOwn = message.senderId === currentUserId
  const hasMedia = message.type === 'file' || message.type === 'video' || message.type === 'voice'

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className={`archive-message ${isOwn ? 'own' : 'other'}`}>
      {hasMedia && <ArchiveMessageThumbnail chatId={chatId} message={message} />}
      <div className="archive-message-content">
        {message.text && <p className="archive-message-text">{message.text}</p>}
        {message.type === 'file' && message.file && !message.file.contentType?.startsWith('image/') && (
          <p className="archive-message-file">📎 {message.file.fileName}</p>
        )}
        <span className="archive-message-time">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  )
}

function ReadArchivePage({ currentUser, chatId, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState('newest')
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const {
    loading: archiveLoading,
    filterVisibleInArchive,
    clearArchive,
    archivedCount
  } = useReadArchiveState(chatId, currentUser?.uid)

  useEffect(() => {
    if (!chatId) {
      setLoading(false)
      return
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setMessages(allMessages)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading messages for archive:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [chatId])

  const archivedMessages = filterVisibleInArchive(messages)

  const sortedMessages = [...archivedMessages].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0
    const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0
    return sortOrder === 'newest' ? bTime - aTime : aTime - bTime
  })

  const handleClearArchive = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }

    setClearing(true)
    try {
      await clearArchive()
      setConfirmClear(false)
    } catch (error) {
      console.error('Error clearing archive:', error)
      alert('Failed to clear archive. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  const isLoading = loading || archiveLoading

  return (
    <div className="read-archive-page">
      <div className="read-archive-header">
        <button className="read-archive-back" onClick={onClose}>
          ← Back
        </button>
        <h2>Hidden Messages</h2>
        <div className="read-archive-controls">
          <select
            className="read-archive-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="read-archive-info">
        <p>
          These messages have been removed from your normal chat view.
          They are still included in exports and can be recovered.
        </p>
        <span className="read-archive-count">{archivedCount} messages</span>
      </div>

      {isLoading ? (
        <div className="read-archive-loading">Loading archived messages...</div>
      ) : sortedMessages.length === 0 ? (
        <div className="read-archive-empty">
          <p>No hidden messages.</p>
          <p className="read-archive-empty-hint">
            Messages will appear here when they are cleared from your chat view.
          </p>
        </div>
      ) : (
        <>
          <div className="read-archive-list">
            {sortedMessages.map(message => (
              <ArchiveMessageItem
                key={message.id}
                message={message}
                chatId={chatId}
                currentUserId={currentUser?.uid}
              />
            ))}
          </div>

          <div className="read-archive-footer">
            {confirmClear ? (
              <div className="read-archive-confirm">
                <p>Clear all hidden messages from this view?</p>
                <p className="read-archive-confirm-note">
                  Messages will still be available in exports.
                </p>
                <div className="read-archive-confirm-actions">
                  <button
                    className="settings-btn secondary"
                    onClick={() => setConfirmClear(false)}
                    disabled={clearing}
                  >
                    Cancel
                  </button>
                  <button
                    className="settings-btn danger"
                    onClick={handleClearArchive}
                    disabled={clearing}
                  >
                    {clearing ? 'Clearing...' : 'Clear Archive'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="settings-btn"
                onClick={handleClearArchive}
                disabled={clearing || sortedMessages.length === 0}
              >
                Clear Archive View
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ReadArchivePage
