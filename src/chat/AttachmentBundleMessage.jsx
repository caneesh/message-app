import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'

function AttachmentThumbnail({ chatId, attachment, onClick }) {
  const { url, loading } = useSecureFileUrl(
    attachment?.storagePath ? chatId : null,
    attachment?.storagePath
  )

  if (loading) {
    return <div className="attachment-thumb loading" />
  }

  if (attachment.kind === 'image' && url) {
    return (
      <div className="attachment-thumb image" onClick={onClick}>
        <img src={url} alt={attachment.fileName} />
      </div>
    )
  }

  if (attachment.kind === 'video') {
    return (
      <div className="attachment-thumb video" onClick={onClick}>
        <span className="attachment-thumb-icon">🎬</span>
      </div>
    )
  }

  if (attachment.kind === 'audio') {
    return (
      <div className="attachment-thumb audio" onClick={onClick}>
        <span className="attachment-thumb-icon">🎵</span>
      </div>
    )
  }

  return (
    <div className="attachment-thumb document" onClick={onClick}>
      <span className="attachment-thumb-icon">📄</span>
    </div>
  )
}

function AttachmentViewer({ chatId, attachments, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0)
  const current = attachments[currentIndex]
  const { url, loading } = useSecureFileUrl(
    current?.storagePath ? chatId : null,
    current?.storagePath
  )

  const goNext = () => {
    if (currentIndex < attachments.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') goNext()
    else if (e.key === 'ArrowLeft') goPrev()
    else if (e.key === 'Escape') onClose()
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="attachment-viewer-overlay" onClick={onClose}>
      <div className="attachment-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="attachment-viewer-header">
          <span className="attachment-viewer-counter">
            {currentIndex + 1} / {attachments.length}
          </span>
          <button className="attachment-viewer-close" onClick={onClose}>✕</button>
        </div>

        <div className="attachment-viewer-content">
          {loading ? (
            <div className="attachment-viewer-loading">Loading...</div>
          ) : current.kind === 'image' && url ? (
            <img src={url} alt={current.fileName} className="attachment-viewer-image" />
          ) : current.kind === 'video' && url ? (
            <video src={url} controls className="attachment-viewer-video" />
          ) : current.kind === 'audio' && url ? (
            <div className="attachment-viewer-audio">
              <span className="attachment-viewer-audio-icon">🎵</span>
              <audio src={url} controls />
            </div>
          ) : (
            <div className="attachment-viewer-document">
              <span className="attachment-viewer-doc-icon">📄</span>
              <span className="attachment-viewer-doc-name">{current.fileName}</span>
              <span className="attachment-viewer-doc-size">{formatSize(current.size)}</span>
              {url && (
                <a
                  href={url}
                  download={current.fileName}
                  className="attachment-viewer-download"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
              )}
            </div>
          )}
        </div>

        <div className="attachment-viewer-info">
          <span className="attachment-viewer-filename">{current.fileName}</span>
          <span className="attachment-viewer-size">{formatSize(current.size)}</span>
        </div>

        <div className="attachment-viewer-nav">
          <button
            className="attachment-viewer-prev"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            ‹
          </button>
          <button
            className="attachment-viewer-next"
            onClick={goNext}
            disabled={currentIndex === attachments.length - 1}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AttachmentBundleMessage({ chatId, messageId, attachmentCount, status }) {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  useEffect(() => {
    const attachmentsRef = collection(db, 'chats', chatId, 'messages', messageId, 'attachments')
    const q = query(attachmentsRef, orderBy('order', 'asc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAttachments(items)
      setLoading(false)
    }, (err) => {
      console.error('Error loading attachments:', err)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId, messageId])

  const openViewer = (index) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  if (loading) {
    return (
      <div className="attachment-bundle loading">
        <span>Loading attachments...</span>
      </div>
    )
  }

  if (status === 'uploading') {
    return (
      <div className="attachment-bundle uploading">
        <span className="attachment-bundle-icon">📎</span>
        <span>Uploading {attachmentCount} file{attachmentCount > 1 ? 's' : ''}...</span>
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <div className="attachment-bundle empty">
        <span>No attachments</span>
      </div>
    )
  }

  const displayAttachments = attachments.slice(0, 4)
  const remainingCount = attachments.length - 4

  return (
    <>
      <div className="attachment-bundle">
        <div className={`attachment-bundle-grid count-${Math.min(attachments.length, 4)}`}>
          {displayAttachments.map((att, index) => (
            <AttachmentThumbnail
              key={att.id}
              chatId={chatId}
              attachment={att}
              onClick={() => openViewer(index)}
            />
          ))}
          {remainingCount > 0 && (
            <div
              className="attachment-bundle-more"
              onClick={() => openViewer(4)}
            >
              +{remainingCount}
            </div>
          )}
        </div>
        <div className="attachment-bundle-label">
          📎 {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
        </div>
      </div>

      {viewerOpen && (
        <AttachmentViewer
          chatId={chatId}
          attachments={attachments}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
