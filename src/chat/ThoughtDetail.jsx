import { useState, useEffect, useRef, useCallback } from 'react'
import { getThoughtReadState, updateThoughtReadState, softDeleteThought } from '../services/thoughtService'
import { calculateReadPercent, buildThoughtQuote, getThoughtPreview } from '../utils/thoughtUtils'

const MOOD_EMOJI = {
  normal: '💭',
  warm: '🌤️',
  love: '💕',
  quiet: '🌙',
  missing: '💫'
}

const VISIBILITY_DELAY_MS = 500
const DEBOUNCE_MS = 1500

function ThoughtDetail({ thought, currentUser, chatId, onClose, onReplyToThought, highlightBlockId, onEdit, onDeleted }) {
  const [readBlockIds, setReadBlockIds] = useState(new Set())
  const [currentVisibleBlock, setCurrentVisibleBlock] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const blockRefs = useRef({})
  const visibilityTimers = useRef({})
  const saveTimeoutRef = useRef(null)
  const observerRef = useRef(null)

  const blocks = thought?.blocks || []
  const totalBlocks = blocks.length
  const isAuthor = thought?.authorId === currentUser?.uid

  useEffect(() => {
    if (!thought?.id || !currentUser?.uid || !chatId) return

    const loadReadState = async () => {
      const result = await getThoughtReadState(chatId, currentUser.uid, thought.id)
      if (result.success && result.readState?.readBlockIds) {
        setReadBlockIds(new Set(result.readState.readBlockIds))
      }
    }

    loadReadState()
  }, [thought?.id, currentUser?.uid, chatId])

  useEffect(() => {
    if (highlightBlockId && blockRefs.current[highlightBlockId]) {
      setTimeout(() => {
        blockRefs.current[highlightBlockId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)
    }
  }, [highlightBlockId])

  const saveReadState = useCallback((blockIds) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!thought?.id || !currentUser?.uid || !chatId) return

      const readBlockIdsArray = Array.from(blockIds)
      const readPercent = calculateReadPercent(readBlockIdsArray, totalBlocks)

      let lastReadBlockIndex = -1
      for (let i = 0; i < blocks.length; i++) {
        if (blockIds.has(blocks[i].blockId)) {
          lastReadBlockIndex = i
        }
      }

      await updateThoughtReadState(chatId, currentUser.uid, thought.id, {
        readBlockIds: readBlockIdsArray,
        readPercent,
        lastReadBlockIndex
      })
    }, DEBOUNCE_MS)
  }, [thought?.id, currentUser?.uid, chatId, blocks, totalBlocks])

  const markBlockAsRead = useCallback((blockId) => {
    setReadBlockIds((prev) => {
      if (prev.has(blockId)) return prev
      const newSet = new Set(prev)
      newSet.add(blockId)
      saveReadState(newSet)
      return newSet
    })
  }, [saveReadState])

  useEffect(() => {
    if (!blocks.length) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const blockId = entry.target.dataset.blockId
          if (!blockId) return

          if (entry.isIntersecting) {
            setCurrentVisibleBlock(blockId)
            if (!visibilityTimers.current[blockId]) {
              visibilityTimers.current[blockId] = setTimeout(() => {
                markBlockAsRead(blockId)
                delete visibilityTimers.current[blockId]
              }, VISIBILITY_DELAY_MS)
            }
          } else {
            if (visibilityTimers.current[blockId]) {
              clearTimeout(visibilityTimers.current[blockId])
              delete visibilityTimers.current[blockId]
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    Object.values(blockRefs.current).forEach((el) => {
      if (el) observerRef.current.observe(el)
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      Object.values(visibilityTimers.current).forEach((timer) => {
        clearTimeout(timer)
      })
      visibilityTimers.current = {}
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [blocks, markBlockAsRead])

  if (!thought) return null

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

  const moodEmoji = MOOD_EMOJI[thought.mood] || MOOD_EMOJI.normal

  const getBlockClass = (block) => {
    const classes = ['thought-detail-paragraph']
    if (readBlockIds.has(block.blockId)) {
      classes.push('thought-paragraph--read')
    }
    if (currentVisibleBlock === block.blockId) {
      classes.push('thought-paragraph--current')
    }
    if (highlightBlockId === block.blockId) {
      classes.push('thought-paragraph--highlight')
    }
    return classes.join(' ')
  }

  const blockNotFound = highlightBlockId && !blocks.some(b => b.blockId === highlightBlockId)

  const handleReplyToThought = () => {
    if (!onReplyToThought) return
    const preview = getThoughtPreview(thought)
    onReplyToThought({
      thoughtId: thought.id,
      authorId: thought.authorId,
      quote: buildThoughtQuote(preview).slice(0, 300),
      title: thought.title || null
    })
  }

  const handleReplyToBlock = (block) => {
    if (!onReplyToThought) return
    onReplyToThought({
      thoughtId: thought.id,
      blockId: block.blockId,
      authorId: thought.authorId,
      quote: buildThoughtQuote(block.text).slice(0, 300),
      title: thought.title || null
    })
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await softDeleteThought(chatId, thought.id, currentUser.uid)
    if (result.success) {
      onDeleted?.()
      onClose()
    } else {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="thought-detail-overlay" onClick={onClose}>
      <div className="thought-detail" onClick={(e) => e.stopPropagation()}>
        <div className="thought-detail-header">
          <button className="thought-detail-back" onClick={onClose} aria-label="Back">
            ←
          </button>
          <span className="thought-detail-mood">{moodEmoji}</span>
          {isAuthor && onEdit && (
            <button
              className="thought-detail-edit-btn"
              onClick={() => onEdit(thought)}
              title="Edit thought"
            >
              ✎
            </button>
          )}
          {isAuthor && (
            <button
              className="thought-detail-delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete thought"
              disabled={deleting}
            >
              🗑
            </button>
          )}
          {onReplyToThought && !isAuthor && (
            <button
              className="thought-detail-reply-btn"
              onClick={handleReplyToThought}
              title="Reply to thought"
            >
              💬 Reply
            </button>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="thought-delete-confirm">
            <p>Delete this thought?</p>
            <div className="thought-delete-confirm-actions">
              <button
                className="thought-delete-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="thought-delete-confirm-btn"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        <div className="thought-detail-content">
          {thought.title && (
            <h2 className="thought-detail-title">{thought.title}</h2>
          )}

          <div className="thought-detail-meta">
            <span className="thought-detail-date">{formatDate(thought.createdAt)}</span>
            {thought.updatedAt && thought.updatedAt !== thought.createdAt && (
              <span className="thought-detail-edited"> (edited)</span>
            )}
          </div>

          {blockNotFound && (
            <div className="thought-block-not-found">
              The referenced part was edited.
            </div>
          )}

          <div className="thought-detail-blocks">
            {blocks.map((block, index) => (
              <div key={block.blockId || index} className="thought-block-wrapper">
                <p
                  ref={(el) => { blockRefs.current[block.blockId] = el }}
                  data-block-id={block.blockId}
                  className={getBlockClass(block)}
                >
                  {block.text}
                </p>
                {onReplyToThought && !isAuthor && (
                  <button
                    className="thought-block-reply-btn"
                    onClick={() => handleReplyToBlock(block)}
                    title="Reply to this paragraph"
                  >
                    ↩
                  </button>
                )}
              </div>
            ))}
            {blocks.length === 0 && thought.body && (
              <p className="thought-detail-paragraph">{thought.body}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThoughtDetail
