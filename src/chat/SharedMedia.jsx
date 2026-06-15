import { useState, useEffect, useMemo, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, orderBy, limit, getDocs, startAfter, where, onSnapshot } from 'firebase/firestore'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'
import { useDeletedMediaForMe } from '../hooks/useDeletedMediaForMe'
import ZoomableImagePreview from './ZoomableImagePreview'
import VoiceNoteTranscript from './VoiceNoteTranscript'
import { requestTranscription } from '../services/transcriptionService'
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

const MEDIA_BATCH_SIZE = 50
const MAX_ITEMS = 500

function MediaThumbnail({ chatId, file, onClick, onDeleteForMe }) {
  const { url, loading, error } = useSecureFileUrl(chatId, file?.storagePath)
  const [showMenu, setShowMenu] = useState(false)

  if (loading) {
    return <div className="media-thumbnail loading" />
  }

  if (error || !url) {
    return <div className="media-thumbnail error">Failed</div>
  }

  const isVideo = isVideoContentType(file?.contentType)

  const handleMenuClick = (e) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleDeleteForMe = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    onDeleteForMe()
  }

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
      <button className="media-thumbnail-menu-btn" onClick={handleMenuClick} aria-label="More options">
        ⋯
      </button>
      {showMenu && (
        <div className="media-thumbnail-menu" onClick={(e) => e.stopPropagation()}>
          <button onClick={handleDeleteForMe}>🙈 Delete for me</button>
        </div>
      )}
    </div>
  )
}

function MediaPreviewModal({ chatId, message, onClose, onViewInChat, onDeleteForMe }) {
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
          <div className="media-preview-actions">
            <button className="media-preview-view-btn" onClick={() => onViewInChat(message.id)}>
              View in Chat
            </button>
            <button className="media-preview-delete-btn" onClick={onDeleteForMe}>
              🙈 Delete for me
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VoiceNoteItem({ chatId, message, currentUser, onViewInChat, onDeleteForMe, onTranscriptionUpdate }) {
  const voice = message?.voice
  const { url, loading, error } = useSecureFileUrl(chatId, voice?.storagePath)
  const [isRequesting, setIsRequesting] = useState(false)

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

  const handleTranscribe = async () => {
    if (!chatId || !message?.id || !currentUser?.uid) return
    if (isRequesting || message.transcriptionStatus === 'pending') return

    setIsRequesting(true)
    try {
      const result = await requestTranscription(chatId, message.id, currentUser.uid)
      if (result.success && onTranscriptionUpdate) {
        onTranscriptionUpdate(message.id, 'pending')
      }
    } catch (err) {
      console.error('Transcription request failed:', err)
    } finally {
      setIsRequesting(false)
    }
  }

  const canTranscribe = message?.id && currentUser?.uid && (
    !message.transcriptionStatus ||
    message.transcriptionStatus === 'none' ||
    message.transcriptionStatus === 'failed'
  )

  const showTranscript = message.transcriptionStatus === 'completed' ||
    message.transcriptionStatus === 'pending' ||
    message.transcriptionStatus === 'failed' ||
    isRequesting

  const senderDisplay = message.senderId === currentUser?.uid ? 'You' : (message.senderPhone || 'Friend')

  return (
    <div className="shared-voice-item">
      <div className="shared-voice-header">
        <div className="shared-voice-icon">🎤</div>
        <div className="shared-voice-meta">
          <span className="shared-item-sender">{senderDisplay}</span>
          <span className="shared-item-date">{formatDate(message.createdAt)}</span>
        </div>
        <div className="shared-item-actions">
          <button className="shared-item-view-btn" onClick={() => onViewInChat(message.id)}>
            View
          </button>
          <button className="shared-item-delete-btn" onClick={onDeleteForMe}>
            🙈
          </button>
        </div>
      </div>
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
      <div className="shared-voice-transcript">
        {showTranscript ? (
          <VoiceNoteTranscript
            transcriptText={message.transcriptText}
            status={message.transcriptionStatus}
            errorCode={message.transcriptErrorCode}
            onRetry={handleTranscribe}
            isRequesting={isRequesting}
          />
        ) : canTranscribe && (
          <button
            className="shared-voice-transcribe-btn"
            onClick={handleTranscribe}
            type="button"
            disabled={isRequesting}
          >
            Transcribe
          </button>
        )}
      </div>
    </div>
  )
}

function DocumentItem({ chatId, message, onViewInChat, onDeleteForMe }) {
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
        <button className="shared-item-delete-btn" onClick={onDeleteForMe}>
          🙈
        </button>
      </div>
    </div>
  )
}

function LinkItem({ message, link, onViewInChat, onDeleteForMe }) {
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
      <div className="shared-item-actions">
        <button className="shared-item-view-btn" onClick={() => onViewInChat(message.id)}>
          View
        </button>
        <button className="shared-item-delete-btn" onClick={onDeleteForMe}>
          🙈
        </button>
      </div>
    </div>
  )
}

function ZoomableImagePreviewWithUrl({ chatId, message, images, currentIndex, onNavigate, onClose, onViewInChat, onDeleteForMe }) {
  const file = message?.file
  const { url, loading, error } = useSecureFileUrl(chatId, file?.storagePath)

  if (loading) {
    return (
      <div className="zoomable-preview-overlay">
        <div className="zoomable-preview-loading">Loading...</div>
      </div>
    )
  }

  if (error || !url) {
    return (
      <div className="zoomable-preview-overlay" onClick={onClose}>
        <div className="zoomable-preview-loading">Failed to load image</div>
      </div>
    )
  }

  return (
    <ZoomableImagePreview
      imageUrl={url}
      alt={file?.fileName || 'Image preview'}
      onClose={onClose}
      onViewInChat={onViewInChat}
      onDeleteForMe={onDeleteForMe}
      showActions={true}
      images={images}
      currentIndex={currentIndex}
      onNavigate={onNavigate}
    />
  )
}

function SharedMedia({ currentUser, chatId, onClose, onViewInChat }) {
  const [activeTab, setActiveTab] = useState('media')
  const [previewMessage, setPreviewMessage] = useState(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Separate state for each tab
  const [mediaItems, setMediaItems] = useState([])
  const [mediaLoading, setMediaLoading] = useState(true)
  const [mediaLoadingMore, setMediaLoadingMore] = useState(false)
  const [mediaHasMore, setMediaHasMore] = useState(true)
  const [mediaLastDoc, setMediaLastDoc] = useState(null)

  const [voiceItems, setVoiceItems] = useState([])
  const [voiceLoading, setVoiceLoading] = useState(true)
  const [voiceLoadingMore, setVoiceLoadingMore] = useState(false)
  const [voiceHasMore, setVoiceHasMore] = useState(true)
  const [voiceLastDoc, setVoiceLastDoc] = useState(null)

  const [textMessages, setTextMessages] = useState([])
  const [textLoading, setTextLoading] = useState(true)
  const [textLoadingMore, setTextLoadingMore] = useState(false)
  const [textHasMore, setTextHasMore] = useState(true)
  const [textLastDoc, setTextLastDoc] = useState(null)

  const { isDeletedForMe, deleteForMe } = useDeletedMediaForMe(chatId, currentUser?.uid)

  const handleDeleteForMe = useCallback(async (message) => {
    if (!window.confirm('Delete this from your view? It will still be visible to the other person.')) {
      return
    }

    const isVideo = isVideoContentType(message.file?.contentType)
    const mediaKind = isVideo ? 'video' : 'image'

    const success = await deleteForMe(message.id, mediaKind)
    if (success) {
      setPreviewMessage(null)
    }
  }, [deleteForMe])

  const handleDeleteLinkForMe = useCallback(async (message) => {
    if (!window.confirm('Delete this link from your view? It will still be visible to the other person.')) {
      return
    }

    await deleteForMe(message.id, 'link')
  }, [deleteForMe])

  const handleDeleteDocumentForMe = useCallback(async (message) => {
    if (!window.confirm('Delete this document from your view? It will still be visible to the other person.')) {
      return
    }

    await deleteForMe(message.id, 'document')
  }, [deleteForMe])

  const handleDeleteVoiceForMe = useCallback(async (message) => {
    if (!window.confirm('Delete this voice note from your view? It will still be visible to the other person.')) {
      return
    }

    await deleteForMe(message.id, 'voice')
  }, [deleteForMe])

  const handleTranscriptionUpdate = useCallback((messageId, status) => {
    setVoiceItems(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, transcriptionStatus: status }
        : msg
    ))
  }, [])

  // Load media (photos & videos) - type 'file' or 'video'
  const loadMedia = useCallback(async (isInitial = true) => {
    if (!chatId) return

    if (isInitial) {
      setMediaLoading(true)
    } else {
      setMediaLoadingMore(true)
    }

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages')

      // Query for file and video types
      let q
      if (isInitial || !mediaLastDoc) {
        q = query(
          messagesRef,
          where('type', 'in', ['file', 'video']),
          orderBy('createdAt', 'desc'),
          limit(MEDIA_BATCH_SIZE)
        )
      } else {
        q = query(
          messagesRef,
          where('type', 'in', ['file', 'video']),
          orderBy('createdAt', 'desc'),
          startAfter(mediaLastDoc),
          limit(MEDIA_BATCH_SIZE)
        )
      }

      const snapshot = await getDocs(q)
      const newItems = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(msg => {
          // Only include images and videos, not documents
          const contentType = msg.file?.contentType || ''
          return isImageContentType(contentType) || isVideoContentType(contentType)
        })

      const gotFullBatch = snapshot.docs.length === MEDIA_BATCH_SIZE

      if (isInitial) {
        setMediaItems(newItems)
      } else {
        setMediaItems(prev => [...prev, ...newItems])
      }

      setMediaLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
      setMediaHasMore(gotFullBatch)
    } catch (err) {
      console.error('Error loading media:', err)
    } finally {
      setMediaLoading(false)
      setMediaLoadingMore(false)
    }
  }, [chatId, mediaLastDoc])

  // Load voice notes
  const loadVoice = useCallback(async (isInitial = true) => {
    if (!chatId) return

    if (isInitial) {
      setVoiceLoading(true)
    } else {
      setVoiceLoadingMore(true)
    }

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages')

      let q
      if (isInitial || !voiceLastDoc) {
        q = query(
          messagesRef,
          where('type', '==', 'voice'),
          orderBy('createdAt', 'desc'),
          limit(MEDIA_BATCH_SIZE)
        )
      } else {
        q = query(
          messagesRef,
          where('type', '==', 'voice'),
          orderBy('createdAt', 'desc'),
          startAfter(voiceLastDoc),
          limit(MEDIA_BATCH_SIZE)
        )
      }

      const snapshot = await getDocs(q)
      const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const gotFullBatch = snapshot.docs.length === MEDIA_BATCH_SIZE

      if (isInitial) {
        setVoiceItems(newItems)
      } else {
        setVoiceItems(prev => [...prev, ...newItems])
      }

      setVoiceLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
      setVoiceHasMore(gotFullBatch)
    } catch (err) {
      console.error('Error loading voice notes:', err)
    } finally {
      setVoiceLoading(false)
      setVoiceLoadingMore(false)
    }
  }, [chatId, voiceLastDoc])

  // Load text messages (for links) and file messages (for documents)
  const loadTextAndDocs = useCallback(async (isInitial = true) => {
    if (!chatId) return

    if (isInitial) {
      setTextLoading(true)
    } else {
      setTextLoadingMore(true)
    }

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages')

      let q
      if (isInitial || !textLastDoc) {
        q = query(
          messagesRef,
          where('type', 'in', ['text', 'file']),
          orderBy('createdAt', 'desc'),
          limit(MEDIA_BATCH_SIZE)
        )
      } else {
        q = query(
          messagesRef,
          where('type', 'in', ['text', 'file']),
          orderBy('createdAt', 'desc'),
          startAfter(textLastDoc),
          limit(MEDIA_BATCH_SIZE)
        )
      }

      const snapshot = await getDocs(q)
      const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const gotFullBatch = snapshot.docs.length === MEDIA_BATCH_SIZE

      if (isInitial) {
        setTextMessages(newItems)
      } else {
        setTextMessages(prev => [...prev, ...newItems])
      }

      setTextLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
      setTextHasMore(gotFullBatch)
    } catch (err) {
      console.error('Error loading text/docs:', err)
    } finally {
      setTextLoading(false)
      setTextLoadingMore(false)
    }
  }, [chatId, textLastDoc])

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'media' && mediaItems.length === 0 && mediaLoading) {
      loadMedia(true)
    } else if (activeTab === 'voice' && voiceItems.length === 0 && voiceLoading) {
      loadVoice(true)
    } else if ((activeTab === 'links' || activeTab === 'documents') && textMessages.length === 0 && textLoading) {
      loadTextAndDocs(true)
    }
  }, [activeTab, chatId])

  // Subscribe to voice items for real-time transcription updates
  const hasVoiceItems = voiceItems.length > 0
  useEffect(() => {
    if (activeTab !== 'voice' || !chatId || !hasVoiceItems) return

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(
      messagesRef,
      where('type', '==', 'voice'),
      orderBy('createdAt', 'desc'),
      limit(MEDIA_BATCH_SIZE)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setVoiceItems(prev => {
        const prevMap = new Map(prev.map(item => [item.id, item]))
        updatedItems.forEach(item => {
          prevMap.set(item.id, item)
        })
        return Array.from(prevMap.values()).sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0
          const bTime = b.createdAt?.toMillis?.() || 0
          return bTime - aTime
        })
      })
    }, (err) => {
      console.error('Error subscribing to voice items:', err)
    })

    return () => unsubscribe()
  }, [activeTab, chatId, hasVoiceItems])

  // Initial load for media tab
  useEffect(() => {
    loadMedia(true)
  }, [chatId])

  // Filter out deleted items from each category
  const filteredMediaItems = useMemo(() =>
    mediaItems.filter(msg => !isDeletedForMe(msg.id)),
    [mediaItems, isDeletedForMe]
  )

  const filteredVoiceItems = useMemo(() =>
    voiceItems.filter(msg => !isDeletedForMe(msg.id)),
    [voiceItems, isDeletedForMe]
  )

  // Extract links from text messages, filter out deleted
  const linkItems = useMemo(() => {
    const links = []
    textMessages.forEach(msg => {
      if (msg.type === 'text' && msg.text && !isDeletedForMe(msg.id)) {
        const extractedLinks = extractLinksFromText(msg.text)
        extractedLinks.forEach(link => {
          links.push({ message: msg, link })
        })
      }
    })
    return links
  }, [textMessages, isDeletedForMe])

  // Extract documents from file messages, filter out deleted
  const documentItems = useMemo(() => {
    return textMessages.filter(msg => {
      if (msg.type !== 'file' || !msg.file) return false
      if (isDeletedForMe(msg.id)) return false
      const contentType = msg.file.contentType || ''
      return isDocumentContentType(contentType) ||
        (!isImageContentType(contentType) && !isVideoContentType(contentType))
    })
  }, [textMessages, isDeletedForMe])

  // Filter by search
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      return {
        mediaItems: filteredMediaItems,
        linkItems,
        documentItems,
        voiceItems: filteredVoiceItems
      }
    }

    return {
      mediaItems: filteredMediaItems.filter(m =>
        m.file?.fileName?.toLowerCase().includes(q)
      ),
      linkItems: linkItems.filter(l =>
        l.link.toLowerCase().includes(q) ||
        l.message.text?.toLowerCase().includes(q)
      ),
      documentItems: documentItems.filter(d =>
        d.file?.fileName?.toLowerCase().includes(q)
      ),
      voiceItems: filteredVoiceItems
    }
  }, [searchQuery, filteredMediaItems, linkItems, documentItems, filteredVoiceItems])

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
        {activeTab === 'media' && (
          mediaLoading ? (
            <div className="shared-media-loading">Loading...</div>
          ) : filteredItems.mediaItems.length === 0 ? (
            <div className="shared-media-empty">No photos or videos shared yet.</div>
          ) : (
            <>
              <div className="media-grid">
                {filteredItems.mediaItems.map((msg) => {
                  const isImage = isImageContentType(msg.file?.contentType)
                  const imageItems = filteredItems.mediaItems.filter(m => isImageContentType(m.file?.contentType))
                  const imageIndex = isImage ? imageItems.findIndex(m => m.id === msg.id) : 0

                  return (
                    <MediaThumbnail
                      key={msg.id}
                      chatId={chatId}
                      file={msg.file}
                      onClick={() => {
                        setPreviewMessage(msg)
                        setPreviewIndex(imageIndex)
                      }}
                      onDeleteForMe={() => handleDeleteForMe(msg)}
                    />
                  )
                })}
              </div>
              {mediaHasMore && (
                <div className="shared-media-load-more">
                  <button
                    onClick={() => loadMedia(false)}
                    disabled={mediaLoadingMore}
                    className="load-more-btn"
                  >
                    {mediaLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )
        )}

        {activeTab === 'links' && (
          textLoading ? (
            <div className="shared-media-loading">Loading...</div>
          ) : filteredItems.linkItems.length === 0 ? (
            <div className="shared-media-empty">No links shared yet.</div>
          ) : (
            <>
              <div className="links-list">
                {filteredItems.linkItems.map((item, index) => (
                  <LinkItem
                    key={`${item.message.id}-${index}`}
                    message={item.message}
                    link={item.link}
                    onViewInChat={handleViewInChat}
                    onDeleteForMe={() => handleDeleteLinkForMe(item.message)}
                  />
                ))}
              </div>
              {textHasMore && (
                <div className="shared-media-load-more">
                  <button
                    onClick={() => loadTextAndDocs(false)}
                    disabled={textLoadingMore}
                    className="load-more-btn"
                  >
                    {textLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )
        )}

        {activeTab === 'documents' && (
          textLoading ? (
            <div className="shared-media-loading">Loading...</div>
          ) : filteredItems.documentItems.length === 0 ? (
            <div className="shared-media-empty">No documents shared yet.</div>
          ) : (
            <>
              <div className="documents-list">
                {filteredItems.documentItems.map(msg => (
                  <DocumentItem
                    key={msg.id}
                    chatId={chatId}
                    message={msg}
                    onViewInChat={handleViewInChat}
                    onDeleteForMe={() => handleDeleteDocumentForMe(msg)}
                  />
                ))}
              </div>
              {textHasMore && (
                <div className="shared-media-load-more">
                  <button
                    onClick={() => loadTextAndDocs(false)}
                    disabled={textLoadingMore}
                    className="load-more-btn"
                  >
                    {textLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )
        )}

        {activeTab === 'voice' && (
          voiceLoading ? (
            <div className="shared-media-loading">Loading...</div>
          ) : filteredItems.voiceItems.length === 0 ? (
            <div className="shared-media-empty">No voice notes shared yet.</div>
          ) : (
            <>
              <div className="voice-list">
                {filteredItems.voiceItems.map(msg => (
                  <VoiceNoteItem
                    key={msg.id}
                    chatId={chatId}
                    message={msg}
                    currentUser={currentUser}
                    onViewInChat={handleViewInChat}
                    onDeleteForMe={() => handleDeleteVoiceForMe(msg)}
                    onTranscriptionUpdate={handleTranscriptionUpdate}
                  />
                ))}
              </div>
              {voiceHasMore && (
                <div className="shared-media-load-more">
                  <button
                    onClick={() => loadVoice(false)}
                    disabled={voiceLoadingMore}
                    className="load-more-btn"
                  >
                    {voiceLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>

      {previewMessage && (
        isVideoContentType(previewMessage.file?.contentType) ? (
          <MediaPreviewModal
            chatId={chatId}
            message={previewMessage}
            onClose={() => setPreviewMessage(null)}
            onViewInChat={handleViewInChat}
            onDeleteForMe={() => handleDeleteForMe(previewMessage)}
          />
        ) : (
          <ZoomableImagePreviewWithUrl
            chatId={chatId}
            message={previewMessage}
            images={filteredItems.mediaItems.filter(m => isImageContentType(m.file?.contentType))}
            currentIndex={previewIndex}
            onNavigate={(newIndex) => {
              const imageItems = filteredItems.mediaItems.filter(m => isImageContentType(m.file?.contentType))
              if (imageItems[newIndex]) {
                setPreviewMessage(imageItems[newIndex])
                setPreviewIndex(newIndex)
              }
            }}
            onClose={() => setPreviewMessage(null)}
            onViewInChat={() => handleViewInChat(previewMessage.id)}
            onDeleteForMe={() => handleDeleteForMe(previewMessage)}
          />
        )
      )}
    </div>
  )
}

export default SharedMedia
