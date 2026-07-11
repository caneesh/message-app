import { useState, useEffect, useCallback, useMemo } from 'react'
import { getArchivedPhotos, groupPhotosByDate } from '../services/photoArchiveService'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function PhotoThumbnail({ chatId, photo, onClick, isSelected }) {
  const { url, loading, error } = useSecureFileUrl(
    photo.storagePath ? chatId : null,
    photo.storagePath
  )

  const displayUrl = photo.url || url
  const dateStr = formatDate(photo.createdAt)

  if (loading) {
    return <div className="photo-archive-thumb loading" />
  }

  if (error || !displayUrl) {
    return (
      <div className="photo-archive-thumb error">
        <span className="photo-archive-thumb-error-icon">✕</span>
      </div>
    )
  }

  return (
    <div
      className={`photo-archive-thumb ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(photo, displayUrl)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(photo, displayUrl) }}
    >
      <img src={displayUrl} alt={photo.fileName || 'Photo'} loading="lazy" />
      <div className="photo-archive-thumb-overlay">
        <span className="photo-archive-thumb-date">{dateStr}</span>
      </div>
    </div>
  )
}

function PhotoGroup({ title, count, photos, chatId, onPhotoClick, selectedId }) {
  if (photos.length === 0) return null

  return (
    <div className="photo-archive-group">
      <div className="photo-archive-group-header">
        <h3 className="photo-archive-group-title">{title}</h3>
        <span className="photo-archive-group-count">{count} photo{count !== 1 ? 's' : ''}</span>
      </div>
      <div className="photo-archive-grid">
        {photos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            chatId={chatId}
            photo={photo}
            onClick={onPhotoClick}
            isSelected={selectedId === photo.id}
          />
        ))}
      </div>
    </div>
  )
}

function PhotoViewer({ photo, photoUrl, chatId, onClose, onPrev, onNext, hasPrev, hasNext, currentUser }) {
  const { url: secureUrl, loading: urlLoading } = useSecureFileUrl(
    photo.storagePath && !photoUrl ? chatId : null,
    photo.storagePath
  )

  const displayUrl = photoUrl || photo.url || secureUrl
  const isOwn = photo.senderId === currentUser?.uid
  const dateStr = formatDate(photo.createdAt)
  const timeStr = formatTime(photo.createdAt)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  return (
    <div className="photo-viewer-overlay" onClick={onClose}>
      <div className="photo-viewer-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="photo-viewer-header">
          <div className="photo-viewer-info">
            <span className={`photo-viewer-sender ${isOwn ? 'own' : 'other'}`}>
              {isOwn ? 'You' : 'Friend'}
            </span>
            <span className="photo-viewer-date">{dateStr} at {timeStr}</span>
          </div>
          <button className="photo-viewer-close" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <div className="photo-viewer-image-container">
          {hasPrev && (
            <button className="photo-viewer-nav prev" onClick={onPrev} aria-label="Previous photo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {urlLoading && !displayUrl ? (
            <div className="photo-viewer-loading">
              <div className="photo-archive-loading-spinner" />
            </div>
          ) : displayUrl ? (
            <img
              src={displayUrl}
              alt={photo.fileName || 'Archived photo'}
              className="photo-viewer-image"
            />
          ) : (
            <div className="photo-viewer-error">Unable to load photo</div>
          )}

          {hasNext && (
            <button className="photo-viewer-nav next" onClick={onNext} aria-label="Next photo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Footer with metadata */}
        <div className="photo-viewer-footer">
          {photo.archiveReason && (
            <span className="photo-viewer-badge">
              {photo.archiveReason === 'read' ? 'Archived after reading' :
               photo.archiveReason === 'clear_all' ? 'Cleared from chat' :
               'Archived'}
            </span>
          )}
          {photo.clearedAt && !photo.archiveReason && (
            <span className="photo-viewer-badge">Cleared from chat</span>
          )}
        </div>
      </div>
    </div>
  )
}

function PhotoArchive({ currentUser, chatId, onClose }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [photoUrls, setPhotoUrls] = useState({})

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!chatId || !currentUser?.uid) return

      setLoading(true)
      setError(null)

      const result = await getArchivedPhotos(chatId, currentUser.uid)

      if (result.success) {
        setPhotos(result.photos)
      } else {
        setError(result.error || 'Unable to load archived photos.')
      }

      setLoading(false)
    }

    fetchPhotos()
  }, [chatId, currentUser?.uid])

  const handlePhotoClick = useCallback((photo, url) => {
    const index = photos.findIndex(p => p.id === photo.id)
    setSelectedIndex(index)
    setPhotoUrls(prev => ({ ...prev, [photo.id]: url }))
  }, [photos])

  const closeViewer = useCallback(() => setSelectedIndex(null), [])

  const goToPrev = useCallback(() => {
    if (selectedIndex > 0) setSelectedIndex(selectedIndex - 1)
  }, [selectedIndex])

  const goToNext = useCallback(() => {
    if (selectedIndex < photos.length - 1) setSelectedIndex(selectedIndex + 1)
  }, [selectedIndex, photos.length])

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null
  const selectedPhotoUrl = selectedPhoto ? photoUrls[selectedPhoto.id] : null

  const groupedPhotos = useMemo(() => groupPhotosByDate(photos), [photos])
  const hasPhotos = photos.length > 0

  // Mobile message
  if (!isDesktop) {
    return (
      <div className="photo-archive-page">
        <div className="photo-archive-header">
          <button className="photo-archive-back" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
        <div className="photo-archive-mobile-message">
          <div className="photo-archive-mobile-icon">🖥️</div>
          <h3>Desktop Only</h3>
          <p>This archive is available on desktop for a better viewing experience.</p>
          <button className="photo-archive-mobile-btn" onClick={onClose}>
            Back to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="photo-archive-page">
      {/* Header */}
      <div className="photo-archive-header">
        <button className="photo-archive-back" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="photo-archive-title-section">
          <h1>Photo Archive</h1>
          {hasPhotos && !loading && (
            <span className="photo-archive-total">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="photo-archive-content">
        {loading && (
          <div className="photo-archive-loading">
            <div className="photo-archive-loading-spinner" />
            <p>Loading your archive...</p>
          </div>
        )}

        {error && !loading && (
          <div className="photo-archive-state">
            <div className="photo-archive-state-icon error">⚠️</div>
            <h3>Unable to load photos</h3>
            <p>{error}</p>
            <button className="photo-archive-state-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && !hasPhotos && (
          <div className="photo-archive-state">
            <div className="photo-archive-state-icon">📷</div>
            <h3>No archived photos</h3>
            <p>When you clear messages with photos, they'll be safely kept here.</p>
          </div>
        )}

        {!loading && !error && hasPhotos && (
          <div className="photo-archive-groups">
            <PhotoGroup
              title="Today"
              count={groupedPhotos.today.length}
              photos={groupedPhotos.today}
              chatId={chatId}
              onPhotoClick={handlePhotoClick}
              selectedId={selectedPhoto?.id}
            />
            <PhotoGroup
              title="This Week"
              count={groupedPhotos.thisWeek.length}
              photos={groupedPhotos.thisWeek}
              chatId={chatId}
              onPhotoClick={handlePhotoClick}
              selectedId={selectedPhoto?.id}
            />
            <PhotoGroup
              title="Older"
              count={groupedPhotos.older.length}
              photos={groupedPhotos.older}
              chatId={chatId}
              onPhotoClick={handlePhotoClick}
              selectedId={selectedPhoto?.id}
            />
          </div>
        )}
      </div>

      {/* Photo Viewer */}
      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          photoUrl={photoUrls[selectedPhoto.id]}
          chatId={chatId}
          onClose={closeViewer}
          onPrev={goToPrev}
          onNext={goToNext}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < photos.length - 1}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

export default PhotoArchive
