import { useState, useEffect, useRef, useCallback } from 'react'
import { getThoughtReadState, updateThoughtReadState, softDeleteThought, getThoughtReadReceipt } from '../services/thoughtService'
import { calculateReadPercent, buildThoughtQuote, getThoughtPreview } from '../utils/thoughtUtils'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import ThoughtComments from './ThoughtComments'
import ThoughtRemovalModal from './ThoughtRemovalModal'
import ThoughtRemovalBanner from './ThoughtRemovalBanner'
import {
  createRemovalRequest,
  getPendingRemovalRequest,
  cancelRemovalRequest,
  acceptRemovalRequest,
  dismissRemovalRequest
} from '../services/thoughtRemovalService'

const MOOD_EMOJI = {
  normal: '💭',
  warm: '🌤️',
  love: '💕',
  quiet: '🌙',
  missing: '💫'
}

const VISIBILITY_DELAY_MS = 500
const DEBOUNCE_MS = 1500

function getReaderStatusLabel(readPercent) {
  if (readPercent === undefined || readPercent === null) {
    return 'Not opened yet'
  }
  if (readPercent === 0) {
    return 'Opened'
  }
  if (readPercent >= 100) {
    return 'Finished reading'
  }
  return `Read ${Math.round(readPercent)}%`
}

function ThoughtDetail({
  thought,
  currentUser,
  chatId,
  onClose,
  onReplyToThought,
  highlightBlockId,
  onEdit,
  onDeleted,
  onRemovalAccepted,
  onTalkInChat
}) {
  const [readBlockIds, setReadBlockIds] = useState(new Set())
  const [currentVisibleBlock, setCurrentVisibleBlock] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [readerReceipt, setReaderReceipt] = useState(null)
  const [otherMemberUid, setOtherMemberUid] = useState(null)

  // Removal request state
  const [showRemovalModal, setShowRemovalModal] = useState(false)
  const [submittingRemoval, setSubmittingRemoval] = useState(false)
  const [pendingRequest, setPendingRequest] = useState(null)
  const [removalSuccess, setRemovalSuccess] = useState(false)

  const blockRefs = useRef({})
  const visibilityTimers = useRef({})
  const saveTimeoutRef = useRef(null)
  const observerRef = useRef(null)

  const blocks = thought?.blocks || []
  const totalBlocks = blocks.length
  const isAuthor = thought?.authorId === currentUser?.uid
  const isRemoved = thought?.status === 'removed_from_both'

  // Fetch pending removal request
  useEffect(() => {
    if (!thought?.id || !chatId || isRemoved) return

    const fetchRequest = async () => {
      const result = await getPendingRemovalRequest(chatId, thought.id)
      if (result.success && result.request) {
        setPendingRequest(result.request)
      }
    }
    fetchRequest()
  }, [thought?.id, chatId, isRemoved])

  useEffect(() => {
    if (!thought?.id || !currentUser?.uid || !chatId || isRemoved) return
    if (thought?.authorId === currentUser?.uid) return

    const loadReadState = async () => {
      const result = await getThoughtReadState(chatId, currentUser.uid, thought.id)
      if (result.success && result.readState?.readBlockIds) {
        setReadBlockIds(new Set(result.readState.readBlockIds))
      }
    }

    loadReadState()
  }, [thought?.id, thought?.authorId, currentUser?.uid, chatId, isRemoved])

  useEffect(() => {
    const fetchOtherMember = async () => {
      if (!chatId || !currentUser?.uid) return
      try {
        const chatRef = doc(db, 'chats', chatId)
        const chatSnap = await getDoc(chatRef)
        if (chatSnap.exists()) {
          const members = chatSnap.data().members || []
          const other = members.find(uid => uid !== currentUser.uid)
          setOtherMemberUid(other || null)
        }
      } catch (err) {
        console.error('Error fetching chat members:', err)
      }
    }
    fetchOtherMember()
  }, [chatId, currentUser?.uid])

  useEffect(() => {
    if (!isAuthor || !otherMemberUid || !thought?.id || !chatId || isRemoved) return

    const fetchReaderReceipt = async () => {
      const result = await getThoughtReadReceipt(chatId, thought.id, otherMemberUid)
      if (result.success && result.receipt) {
        setReaderReceipt(result.receipt)
      }
    }
    fetchReaderReceipt()
  }, [isAuthor, otherMemberUid, thought?.id, chatId, isRemoved])

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
      if (!thought?.id || !currentUser?.uid || !chatId || isRemoved) return
      if (thought?.authorId === currentUser?.uid) return

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
  }, [thought?.id, thought?.authorId, currentUser?.uid, chatId, blocks, totalBlocks, isRemoved])

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
    if (!blocks.length || isRemoved || isAuthor) return

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
    }
  }, [blocks, markBlockAsRead, isRemoved, isAuthor])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (!thought) return null

  // Show removed placeholder
  if (isRemoved) {
    return (
      <div className="thought-detail-overlay" onClick={onClose}>
        <div className="thought-detail" onClick={(e) => e.stopPropagation()}>
          <div className="thought-detail-header">
            <button className="thought-detail-back" onClick={onClose} aria-label="Back">
              ←
            </button>
          </div>
          <div className="thought-detail-content">
            <div className="thought-removed-placeholder">
              <div className="thought-removed-icon-container">
                <span className="thought-removed-icon">💭</span>
              </div>
              <h3 className="thought-removed-title">This Thought was removed from view.</h3>
              <p className="thought-removed-subtitle">It is no longer shown in your shared Thoughts.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

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

  // Removal request handlers
  const handleRemovalSubmit = async ({ feeling, note }) => {
    setSubmittingRemoval(true)
    const result = await createRemovalRequest(chatId, thought.id, currentUser.uid, { feeling, note })
    setSubmittingRemoval(false)

    if (result.success) {
      setShowRemovalModal(false)
      setRemovalSuccess(true)
      // Close after showing success message
      setTimeout(() => {
        onClose()
      }, 2000)
    }
  }

  const handleCancelRequest = async () => {
    if (!pendingRequest) return
    const result = await cancelRemovalRequest(chatId, thought.id, pendingRequest.id, currentUser.uid)
    if (result.success) {
      setPendingRequest(null)
    }
  }

  const handleAcceptRemoval = async () => {
    if (!pendingRequest) return
    const result = await acceptRemovalRequest(
      chatId,
      thought.id,
      pendingRequest.id,
      currentUser.uid,
      pendingRequest.requestedBy
    )
    if (result.success) {
      onRemovalAccepted?.()
      onClose()
    }
  }

  const handleDismissRequest = async () => {
    if (!pendingRequest) return
    const result = await dismissRemovalRequest(chatId, thought.id, pendingRequest.id, currentUser.uid)
    if (result.success) {
      setPendingRequest(null)
    }
  }

  const handleTalkInChat = () => {
    if (onTalkInChat) {
      onTalkInChat({
        thoughtId: thought.id,
        context: 'removal_request',
        suggestedText: "I saw your request. Can we talk about it?"
      })
    }
    onClose()
  }

  const isRequester = pendingRequest?.requestedBy === currentUser?.uid
  const showRemovalButton = !isAuthor && !pendingRequest && !removalSuccess

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
          {showRemovalButton && (
            <button
              className="thought-detail-removal-btn"
              onClick={() => setShowRemovalModal(true)}
              title="I need this gone"
            >
              🚫
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

        {/* Pending removal request banner */}
        {pendingRequest && (
          <ThoughtRemovalBanner
            request={pendingRequest}
            isRequester={isRequester}
            onAccept={handleAcceptRemoval}
            onDismiss={handleDismissRequest}
            onCancel={handleCancelRequest}
            onTalkInChat={handleTalkInChat}
          />
        )}

        {/* Removal success message */}
        {removalSuccess && (
          <div className="thought-removal-success">
            <span className="removal-success-icon">✓</span>
            <p>Hidden from your view. A removal request was sent.</p>
          </div>
        )}

        <div className="thought-detail-content">
          {thought.title && (
            <h2 className="thought-detail-title">{thought.title}</h2>
          )}

          <div className="thought-detail-meta">
            <span className="thought-detail-author">
              {isAuthor ? 'You' : 'Friend'}
            </span>
            <span className="thought-detail-separator">·</span>
            <span className="thought-detail-date">{formatDate(thought.createdAt)}</span>
            {thought.updatedAt && thought.updatedAt !== thought.createdAt && (
              <span className="thought-detail-edited"> (edited)</span>
            )}
          </div>

          {isAuthor && otherMemberUid && (
            <div className="thought-detail-reader-status">
              {getReaderStatusLabel(readerReceipt?.readPercent)}
            </div>
          )}

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

          <ThoughtComments
            chatId={chatId}
            thoughtId={thought.id}
            currentUser={currentUser}
          />

          {/* Prominent removal button at bottom for non-authors */}
          {showRemovalButton && (
            <div className="thought-removal-trigger-section">
              <button
                className="thought-removal-trigger"
                onClick={() => setShowRemovalModal(true)}
                aria-label="Request to remove this Thought"
              >
                <span className="thought-removal-trigger-icon">💔</span>
                <span className="thought-removal-trigger-content">
                  <span className="thought-removal-trigger-label">I need this gone</span>
                  <span className="thought-removal-trigger-subtext">Ask to remove this Thought from both views</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {showRemovalModal && (
          <ThoughtRemovalModal
            onSubmit={handleRemovalSubmit}
            onCancel={() => setShowRemovalModal(false)}
            submitting={submittingRemoval}
          />
        )}
      </div>
    </div>
  )
}

export default ThoughtDetail
