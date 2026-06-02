import { useState, useEffect, useMemo, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'
import {
  extractLinksFromText,
  getDomainFromUrl,
  isImageContentType,
  isVideoContentType,
  isDocumentContentType,
  formatFileSize,
  formatDuration,
  truncateText
} from '../utils/messageExtractors'

const BATCH_SIZE = 100
const MAX_MESSAGES = 500

function MediaThumbnail({ chatId, file, onClick }) {
  const { url, loading, error } = useSecureFileUrl(chatId, file?.storagePath)

  if (loading) {
    return <div className="media-thumbnail loading" />
  }

  if (error || !url) {
    return <div className="media-thumbnail error">Failed</div>
  }

  const isVideo = isVideoContentType(file?.contentType)

  return (
    <div className="media-thumbnail" onClick={onClick}>
      {isVideo ? (
        <>
          <video src={url} preload="metadata" />
          <div className="media-play-icon">▶</div>
        </>
      ) : (
        <img src={url} alt={file?.fileName || 'Image'} />
      )}
    </div>
  )
}

function MediaPreviewModal({ chatId, message, onClose, onViewInChat }) {
  const file = message?.file
  const { url, loading, error } = useSecureFileUrl(chatId, file?.storagePath)
  const isVideo = isVideoContentType(file?.contentType)

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  if (!message) return null

  return (
    <div className="media-preview-overlay" onClick={onClose}>
      <div className="media-preview-modal" onClick={e => e.stopPropagation()}>
        <button className="media-preview-close" onClick={onClose}>×</button>

        <div className="media-preview-content">
          {loading ? (
            <div className="media-preview-loading">Loading...</div>
          ) : error ? (
            <div className="media-preview-error">Failed to load media</div>
          ) : isVideo ? (
            <video src={url} controls autoPlay playsInline className="media-preview-video" />
          ) : (
            <img src={url} alt={file?.fileName} className="media-preview-image" />
          )}
        </div>

        <div className="media-preview-info">
          <div className="media-preview-meta">
            <span className="media-preview-sender">
              {message.senderId === 'currentUser' ? 'You' : 'Friend'}
            </span>
            <span className="media-preview-date">{formatDate(message.createdAt)}</span>
          </div>
          {file?.fileName && (
            <div className="media-preview-filename">{file.fileName}</div>
          )}
          <button className="media-preview-view-btn" onClick={() => onViewInChat(message.id)}>
            View in Chat
          </button>
        </div>
      </div>
    </div>
  )
}

function VoiceNoteItem({ chatId, message, onViewInChat }) {
  const voice = message?.voice
  const { url, loading, error } = useSecureFileUrl(chatId, voice?.storagePath)

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="shared-voice-item">
      <div className="shared-voice-icon">🎤</div>
      <div className="shared-voice-content">
        <div className="shared-voice-duration">{formatDuration(voice?.durationSeconds)}</div>
        {loading ? (
          <div className="shared-voice-loading">Loading...</div>
        ) : error ? (
          <div className="shared-voice-error">Failed to load</div>
        ) : (
          <audio src={url} controls preload="metadata" className="shared-voice-player" />
        )}
      </div>
      <div className="shared-voice-meta">
        <span className="shared-item-sender">
          {message.senderPhone || 'Unknown'}
        </span>
        <span className="shared-item-date">{formatDate(message.createdAt)}</span>
      </div>
      <button className="shared-item-view-btn" onClick={() => onViewInChat(message.id)}>
        View
      </button>
    </div>
  )
}

function DocumentItem({ chatId, message, onViewInChat }) {
  const file = message?.file
  const { url, loading, error } = useSecureFileUrl(chatId, file?.storagePath)

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return ''
    }
  }

  const getFileIcon = (contentType) => {
    if (contentType === 'application/pdf') return '📄'
    if (contentType === 'text/plain') return '📝'
    return '📎'
  }

  return (
    <div className="shared-document-item">
      <div className="shared-document-icon">{getFileIcon(file?.contentType)}</div>
      <div className="shared-document-content">
        <div className="shared-document-name">{file?.fileName || 'Document'}</div>
        <div className="shared-document-meta">
          <span>{formatFileSize(file?.size)}</span>
          <span>{formatDate(message.createdAt)}</span>
        </div>
      </div>
      <div className="shared-document-actions">
        {loading ? (
          <span className="shared-document-loading">...</span>
        ) : error ? (
          <span className="shared-document-error">Error</span>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className="shared-document-open">
            Open
          </a>
        )}
        <button className="shared-item-view-btn" onClick={() => onViewInChat(message.id)}>
          View
        </button>
      </div>
    </div>
  )
}

function LinkItem({ message, link, onViewInChat }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return ''
    }
  }

  const domain = getDomainFromUrl(link)
  const displayUrl = link.length > 60 ? link.slice(0, 60) + '...' : link

  return (
    <div className="shared-link-item">
      <div className="shared-link-icon">🔗</div>
      <div className="shared-link-content">
        <div className="shared-link-domain">{domain}</div>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="shared-link-url"
          onClick={e => e.stopPropagation()}
        >
          {displayUrl}
        </a>
        {message.text && (
          <div className="shared-link-context">{truncateText(message.text, 80)}</div>
        )}
      </div>
      <div className="shared-link-meta">
        <span className="shared-item-date">{formatDate(message.createdAt)}</span>
      </div>
      <button className="shared-item-view-btn" onClick={() => onViewInChat(message.id)}>
        View
      </button>
    </div>
  )
}

function SharedMedia({ currentUser, chatId, onClose, onViewInChat }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState(null)
  const [activeTab, setActiveTab] = useState('media')
  const [previewMessage, setPreviewMessage] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load messages
  const loadMessages = useCallback(async (isInitial = true) => {
    if (!chatId) return

    if (isInitial) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      let q

      if (isInitial || !lastDoc) {
        q = query(messagesRef, orderBy('createdAt', 'desc'), limit(BATCH_SIZE))
      } else {
        q = query(messagesRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(BATCH_SIZE))
      }

      const snapshot = await getDocs(q)
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      if (isInitial) {
        setMessages(newMessages)
      } else {
        setMessages(prev => [...prev, ...newMessages])
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
      setHasMore(snapshot.docs.length === BATCH_SIZE && messages.length + newMessages.length < MAX_MESSAGES)
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [chatId, lastDoc, messages.length])

  useEffect(() => {
    loadMessages(true)
  }, [chatId])

  // Extract media items
  const { mediaItems, linkItems, documentItems, voiceItems } = useMemo(() => {
    const media = []
    const links = []
    const documents = []
    const voices = []

    messages.forEach(msg => {
      // Media (images and videos)
      if ((msg.type === 'file' || msg.type === 'video') && msg.file) {
        if (isImageContentType(msg.file.contentType) || isVideoContentType(msg.file.contentType)) {
          media.push(msg)
        } else if (isDocumentContentType(msg.file.contentType) || msg.file.contentType) {
          // Documents
          documents.push(msg)
        }
      }

      // Voice notes
      if (msg.type === 'voice' && msg.voice?.storagePath) {
        voices.push(msg)
      }

      // Links from text messages
      if (msg.type === 'text' && msg.text) {
        const extractedLinks = extractLinksFromText(msg.text)
        extractedLinks.forEach(link => {
          links.push({ message: msg, link })
        })
      }
    })

    return {
      mediaItems: media,
      linkItems: links,
      documentItems: documents,
      voiceItems: voices
    }
  }, [messages])

  // Filter by search
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) {
      return { mediaItems, linkItems, documentItems, voiceItems }
    }

    return {
      mediaItems: mediaItems.filter(m =>
        m.file?.fileName?.toLowerCase().includes(query)
      ),
      linkItems: linkItems.filter(l =>
        l.link.toLowerCase().includes(query) ||
        l.message.text?.toLowerCase().includes(query)
      ),
      documentItems: documentItems.filter(d =>
        d.file?.fileName?.toLowerCase().includes(query)
      ),
      voiceItems: voiceItems // Voice notes can't be searched by content
    }
  }, [searchQuery, mediaItems, linkItems, documentItems, voiceItems])

  const handleViewInChat = (messageId) => {
    setPreviewMessage(null)
    onViewInChat(messageId)
    onClose()
  }

  const tabs = [
    { id: 'media', label: 'Photos & Videos', count: filteredItems.mediaItems.length },
    { id: 'links', label: 'Links', count: filteredItems.linkItems.length },
    { id: 'documents', label: 'Documents', count: filteredItems.documentItems.length },
    { id: 'voice', label: 'Voice Notes', count: filteredItems.voiceItems.length }
  ]

  return (
    <div className="shared-media-container">
      <div className="shared-media-header">
        <button className="shared-media-back" onClick={onClose}>←</button>
        <h2>Shared Media</h2>
      </div>

      <div className="shared-media-search">
        <input
          type="text"
          placeholder="Search files, links..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="shared-media-search-input"
        />
      </div>

      <div className="shared-media-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`shared-media-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="shared-media-content">
        {loading ? (
          <div className="shared-media-loading">Loading...</div>
        ) : (
          <>
            {activeTab === 'media' && (
              filteredItems.mediaItems.length === 0 ? (
                <div className="shared-media-empty">No photos or videos shared yet.</div>
              ) : (
                <div className="media-grid">
                  {filteredItems.mediaItems.map(msg => (
                    <MediaThumbnail
                      key={msg.id}
                      chatId={chatId}
                      file={msg.file}
                      onClick={() => setPreviewMessage(msg)}
                    />
                  ))}
                </div>
              )
            )}

            {activeTab === 'links' && (
              filteredItems.linkItems.length === 0 ? (
                <div className="shared-media-empty">No links shared yet.</div>
              ) : (
                <div className="links-list">
                  {filteredItems.linkItems.map((item, index) => (
                    <LinkItem
                      key={`${item.message.id}-${index}`}
                      message={item.message}
                      link={item.link}
                      onViewInChat={handleViewInChat}
                    />
                  ))}
                </div>
              )
            )}

            {activeTab === 'documents' && (
              filteredItems.documentItems.length === 0 ? (
                <div className="shared-media-empty">No documents shared yet.</div>
              ) : (
                <div className="documents-list">
                  {filteredItems.documentItems.map(msg => (
                    <DocumentItem
                      key={msg.id}
                      chatId={chatId}
                      message={msg}
                      onViewInChat={handleViewInChat}
                    />
                  ))}
                </div>
              )
            )}

            {activeTab === 'voice' && (
              filteredItems.voiceItems.length === 0 ? (
                <div className="shared-media-empty">No voice notes shared yet.</div>
              ) : (
                <div className="voice-list">
                  {filteredItems.voiceItems.map(msg => (
                    <VoiceNoteItem
                      key={msg.id}
                      chatId={chatId}
                      message={msg}
                      onViewInChat={handleViewInChat}
                    />
                  ))}
                </div>
              )
            )}

            {hasMore && !loading && (
              <div className="shared-media-load-more">
                <button
                  onClick={() => loadMessages(false)}
                  disabled={loadingMore}
                  className="load-more-btn"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {previewMessage && (
        <MediaPreviewModal
          chatId={chatId}
          message={previewMessage}
          onClose={() => setPreviewMessage(null)}
          onViewInChat={handleViewInChat}
        />
      )}
    </div>
  )
}

export default SharedMedia
