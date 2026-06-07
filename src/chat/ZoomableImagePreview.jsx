import { useState, useRef, useCallback, useEffect } from 'react'

const MIN_SCALE = 1
const MAX_SCALE = 5
const DOUBLE_TAP_SCALE = 2
const ZOOM_STEP = 0.5
const DOUBLE_TAP_TIMEOUT = 300

function ZoomableImagePreview({
  imageUrl,
  alt = 'Image preview',
  onClose,
  onDeleteForMe,
  onViewInChat,
  showActions = true,
  images = null,
  currentIndex = 0,
  onNavigate = null
}) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(true)

  const containerRef = useRef(null)
  const imageRef = useRef(null)
  const lastTapRef = useRef(0)
  const lastTouchDistanceRef = useRef(null)
  const lastTouchCenterRef = useRef(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const positionStartRef = useRef({ x: 0, y: 0 })

  const hasMultipleImages = images && images.length > 1
  const canGoPrev = hasMultipleImages && currentIndex > 0
  const canGoNext = hasMultipleImages && currentIndex < images.length - 1

  const resetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const constrainPosition = useCallback((pos, currentScale) => {
    if (currentScale <= 1) return { x: 0, y: 0 }

    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image) return pos

    const containerRect = container.getBoundingClientRect()
    const scaledWidth = image.naturalWidth * currentScale
    const scaledHeight = image.naturalHeight * currentScale

    const displayWidth = Math.min(image.width * currentScale, scaledWidth)
    const displayHeight = Math.min(image.height * currentScale, scaledHeight)

    const maxX = Math.max(0, (displayWidth - containerRect.width) / 2)
    const maxY = Math.max(0, (displayHeight - containerRect.height) / 2)

    return {
      x: Math.max(-maxX, Math.min(maxX, pos.x)),
      y: Math.max(-maxY, Math.min(maxY, pos.y))
    }
  }, [])

  const zoomIn = useCallback(() => {
    setScale(s => {
      const newScale = Math.min(MAX_SCALE, s + ZOOM_STEP)
      setPosition(p => constrainPosition(p, newScale))
      return newScale
    })
  }, [constrainPosition])

  const zoomOut = useCallback(() => {
    setScale(s => {
      const newScale = Math.max(MIN_SCALE, s - ZOOM_STEP)
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 })
      } else {
        setPosition(p => constrainPosition(p, newScale))
      }
      return newScale
    })
  }, [constrainPosition])

  const handleDoubleTap = useCallback((clientX, clientY) => {
    if (scale > 1) {
      resetZoom()
    } else {
      setScale(DOUBLE_TAP_SCALE)
    }
  }, [scale, resetZoom])

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      lastTouchDistanceRef.current = distance
      lastTouchCenterRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      }
    } else if (e.touches.length === 1) {
      const now = Date.now()
      const touch = e.touches[0]

      if (now - lastTapRef.current < DOUBLE_TAP_TIMEOUT) {
        e.preventDefault()
        handleDoubleTap(touch.clientX, touch.clientY)
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
      }

      if (scale > 1) {
        setIsDragging(true)
        dragStartRef.current = { x: touch.clientX, y: touch.clientY }
        positionStartRef.current = { ...position }
      }
    }
  }, [scale, position, handleDoubleTap])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )

      if (lastTouchDistanceRef.current) {
        const scaleDelta = distance / lastTouchDistanceRef.current
        setScale(s => {
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * scaleDelta))
          return newScale
        })
      }
      lastTouchDistanceRef.current = distance
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault()
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStartRef.current.x
      const deltaY = touch.clientY - dragStartRef.current.y

      const newPos = {
        x: positionStartRef.current.x + deltaX,
        y: positionStartRef.current.y + deltaY
      }
      setPosition(constrainPosition(newPos, scale))
    }
  }, [isDragging, scale, constrainPosition])

  const handleTouchEnd = useCallback((e) => {
    lastTouchDistanceRef.current = null
    lastTouchCenterRef.current = null
    setIsDragging(false)

    if (scale < 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setPosition(p => constrainPosition(p, scale))
    }
  }, [scale, constrainPosition])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setScale(s => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s + delta))
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 })
      }
      return newScale
    })
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (scale > 1 && e.button === 0) {
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      positionStartRef.current = { ...position }
    }
  }, [scale, position])

  const handleMouseMove = useCallback((e) => {
    if (isDragging && scale > 1) {
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      const newPos = {
        x: positionStartRef.current.x + deltaX,
        y: positionStartRef.current.y + deltaY
      }
      setPosition(constrainPosition(newPos, scale))
    }
  }, [isDragging, scale, constrainPosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDoubleClick = useCallback((e) => {
    handleDoubleTap(e.clientX, e.clientY)
  }, [handleDoubleTap])

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case '+':
      case '=':
        zoomIn()
        break
      case '-':
        zoomOut()
        break
      case '0':
        resetZoom()
        break
      case 'ArrowLeft':
        if (canGoPrev) {
          resetZoom()
          onNavigate(currentIndex - 1)
        }
        break
      case 'ArrowRight':
        if (canGoNext) {
          resetZoom()
          onNavigate(currentIndex + 1)
        }
        break
    }
  }, [onClose, zoomIn, zoomOut, resetZoom, canGoPrev, canGoNext, currentIndex, onNavigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    resetZoom()
    setLoading(true)
  }, [imageUrl, resetZoom])

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handlePrev = () => {
    if (canGoPrev) {
      resetZoom()
      onNavigate(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (canGoNext) {
      resetZoom()
      onNavigate(currentIndex + 1)
    }
  }

  return (
    <div
      className="zoomable-preview-overlay"
      onClick={handleOverlayClick}
    >
      <div className="zoomable-preview-header">
        <div className="zoomable-preview-controls">
          <button
            className="zoom-control-btn"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button
            className="zoom-control-btn"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            className="zoom-control-btn zoom-reset-btn"
            onClick={resetZoom}
            disabled={scale === 1}
            aria-label="Reset zoom"
          >
            Reset
          </button>
        </div>
        <button
          className="zoomable-preview-close"
          onClick={onClose}
          aria-label="Close preview"
        >
          ×
        </button>
      </div>

      <div
        className="zoomable-preview-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {loading && (
          <div className="zoomable-preview-loading">Loading...</div>
        )}
        <img
          ref={imageRef}
          src={imageUrl}
          alt={alt}
          className="zoomable-preview-image"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            opacity: loading ? 0 : 1
          }}
          onLoad={() => setLoading(false)}
          draggable={false}
        />
      </div>

      {hasMultipleImages && (
        <>
          <button
            className="zoomable-preview-nav zoomable-preview-prev"
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            className="zoomable-preview-nav zoomable-preview-next"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Next image"
          >
            ›
          </button>
          <div className="zoomable-preview-counter">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}

      {showActions && (
        <div className="zoomable-preview-actions">
          {onViewInChat && (
            <button className="zoomable-action-btn" onClick={onViewInChat}>
              View in Chat
            </button>
          )}
          {onDeleteForMe && (
            <button className="zoomable-action-btn zoomable-action-delete" onClick={onDeleteForMe}>
              Delete for me
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ZoomableImagePreview
