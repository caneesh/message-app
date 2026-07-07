import { useState, useEffect, useRef, useCallback } from 'react'
import { getThoughtReadState, updateThoughtReadState, softDeleteThought, getThoughtReadReceipt } from '../services/thoughtService'
import { calculateReadPercent, buildThoughtQuote, getThoughtPreview, getMoodDisplay, getReadableBlocks } from '../utils/thoughtUtils'
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
import { saveThought, unsaveThought } from '../services/thoughtSavedService'
import { createThoughtReminder, getRemindersForThought, cancelThoughtReminder } from '../services/thoughtReminderService'
import {
  THOUGHT_REACTIONS,
  setThoughtReaction,
  removeThoughtReaction,
  getThoughtReactions,
  countReactionsByType
} from '../services/thoughtReactionService'
import { archiveThought, unarchiveThought } from '../services/thoughtArchiveService'

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
  onTalkInChat,
  isSaved,
  onSaveToggle,
  isArchived,
  onArchiveToggle
}) {
  const [readBlockIds, setReadBlockIds] = useState(new Set())
  const [currentVisibleBlock, setCurrentVisibleBlock] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [readerReceipt, setReaderReceipt] = useState(null)
  const [otherMemberUid, setOtherMemberUid] = useState(null)
  const [savingThought, setSavingThought] = useState(false)
  const [archivingThought, setArchivingThought] = useState(false)
  const [showReminderMenu, setShowReminderMenu] = useState(false)
  const [activeReminders, setActiveReminders] = useState([])
  const [settingReminder, setSettingReminder] = useState(false)
  const [reactions, setReactions] = useState([])
  const [myReaction, setMyReaction] = useState(null)
  const [showReactionPicker, setShowReactionPicker] = useState(false)

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
  // Only count non-empty paragraph blocks for read percentage
  const readableBlocks = getReadableBlocks(thought)
  const totalReadableBlocks = readableBlocks.length
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

  // Fetch active reminders for this thought
  useEffect(() => {
    if (!thought?.id || !currentUser?.uid || !chatId || isRemoved) return

    const fetchReminders = async () => {
      const result = await getRemindersForThought(chatId, currentUser.uid, thought.id)
      if (result.success) {
        setActiveReminders(result.reminders)
      }
    }
    fetchReminders()
  }, [thought?.id, currentUser?.uid, chatId, isRemoved])

  // Fetch reactions for this thought
  useEffect(() => {
    if (!thought?.id || !chatId || isRemoved) return

    const fetchReactions = async () => {
      const result = await getThoughtReactions(chatId, thought.id)
      if (result.success) {
        setReactions(result.reactions)
        const mine = result.reactions.find(r => r.uid === currentUser?.uid)
        setMyReaction(mine?.reaction || null)
      }
    }
    fetchReactions()
  }, [thought?.id, chatId, isRemoved, currentUser?.uid])

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

      // Find which readable blocks have been read
      const readableBlockIds = readableBlocks.map(b => b.blockId)
      const readReadableBlockIds = readBlockIdsArray.filter(id => readableBlockIds.includes(id))

      // Calculate percentage based on readable blocks only
      let readPercent = calculateReadPercent(readReadableBlockIds, totalReadableBlocks)

      // Find the highest read block index
      let lastReadBlockIndex = -1
      for (let i = 0; i < blocks.length; i++) {
        if (blockIds.has(blocks[i].blockId)) {
          lastReadBlockIndex = i
        }
      }

      // If user read the last readable block, force 100%
      const lastReadableBlock = readableBlocks[readableBlocks.length - 1]
      if (lastReadableBlock && blockIds.has(lastReadableBlock.blockId)) {
        readPercent = 100
      }

      // Debug logging
      console.log('[THOUGHT_READ] saveReadState:', {
        thoughtId: thought.id?.slice?.(-6),
        totalBlocks: blocks.length,
        totalReadableBlocks,
        readBlockCount: readBlockIdsArray.length,
        readReadableCount: readReadableBlockIds.length,
        lastReadBlockIndex,
        readPercent,
        readableBlockIds: readableBlockIds.map(id => id?.slice?.(-8)),
        readBlockIds: readBlockIdsArray.map(id => id?.slice?.(-8)),
      })

      await updateThoughtReadState(chatId, currentUser.uid, thought.id, {
        readBlockIds: readBlockIdsArray,
        readPercent,
        lastReadBlockIndex
      })
    }, DEBOUNCE_MS)
  }, [thought?.id, thought?.authorId, currentUser?.uid, chatId, blocks, readableBlocks, totalReadableBlocks, isRemoved])

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

    // Use lower threshold (0.3) to more reliably mark blocks as read
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
      { threshold: 0.3 }
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

  // Mark all blocks as read when user scrolls to bottom of thought
  useEffect(() => {
    if (!blocks.length || isRemoved || isAuthor) return

    const contentEl = document.querySelector('.thought-detail-content')
    if (!contentEl) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentEl
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50

      if (isNearBottom && readableBlocks.length > 0) {
        // Mark all readable blocks as read when user reaches bottom
        setReadBlockIds((prev) => {
          const newSet = new Set(prev)
          let changed = false
          readableBlocks.forEach(block => {
            if (!newSet.has(block.blockId)) {
              newSet.add(block.blockId)
              changed = true
            }
          })
          if (changed) {
            console.log('[THOUGHT_READ] User reached bottom, marking all blocks read')
            saveReadState(newSet)
          }
          return newSet
        })
      }
    }

    contentEl.addEventListener('scroll', handleScroll, { passive: true })
    // Check initial state
    handleScroll()

    return () => contentEl.removeEventListener('scroll', handleScroll)
  }, [blocks, readableBlocks, isRemoved, isAuthor, saveReadState])

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

  const moodInfo = getMoodDisplay(thought.mood)

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

  const handleSaveToggle = async () => {
    if (!thought?.id || !currentUser?.uid || savingThought) return
    setSavingThought(true)
    try {
      if (isSaved) {
        await unsaveThought(chatId, currentUser.uid, thought.id)
      } else {
        await saveThought(chatId, currentUser.uid, thought.id)
      }
      onSaveToggle?.()
    } finally {
      setSavingThought(false)
    }
  }

  const handleArchiveToggle = async () => {
    if (!thought?.id || !currentUser?.uid || archivingThought) return
    setArchivingThought(true)
    try {
      if (isArchived) {
        await unarchiveThought(chatId, currentUser.uid, thought.id)
      } else {
        await archiveThought(chatId, currentUser.uid, thought.id)
      }
      onArchiveToggle?.()
      if (!isArchived) {
        onClose()
      }
    } finally {
      setArchivingThought(false)
    }
  }

  const handleSetReminder = async (hoursFromNow, label) => {
    if (!thought?.id || !currentUser?.uid || settingReminder) return
    setSettingReminder(true)
    try {
      const remindAt = new Date()
      remindAt.setHours(remindAt.getHours() + hoursFromNow)
      await createThoughtReminder(chatId, currentUser.uid, thought.id, remindAt, label)
      const result = await getRemindersForThought(chatId, currentUser.uid, thought.id)
      if (result.success) setActiveReminders(result.reminders)
      setShowReminderMenu(false)
    } finally {
      setSettingReminder(false)
    }
  }

  const handleCancelReminder = async (reminderId) => {
    if (!currentUser?.uid) return
    await cancelThoughtReminder(chatId, currentUser.uid, reminderId)
    setActiveReminders(prev => prev.filter(r => r.id !== reminderId))
  }

  const hasActiveReminder = activeReminders.length > 0
  const reactionCounts = countReactionsByType(reactions)

  const handleReactionSelect = async (reactionKey) => {
    if (!thought?.id || !currentUser?.uid) return
    setShowReactionPicker(false)

    if (myReaction === reactionKey) {
      // Remove reaction
      await removeThoughtReaction(chatId, thought.id, currentUser.uid)
      setMyReaction(null)
      setReactions(prev => prev.filter(r => r.uid !== currentUser.uid))
    } else {
      // Set/change reaction
      await setThoughtReaction(chatId, thought.id, currentUser.uid, reactionKey)
      setMyReaction(reactionKey)
      setReactions(prev => {
        const filtered = prev.filter(r => r.uid !== currentUser.uid)
        return [...filtered, { uid: currentUser.uid, reaction: reactionKey }]
      })
    }
  }

  return (
    <div className="thought-detail-overlay" onClick={onClose}>
      <div className="thought-detail" onClick={(e) => e.stopPropagation()}>
        <div className="thought-detail-header">
          <button className="thought-detail-back" onClick={onClose} aria-label="Back">
            ←
          </button>
          <span className="thought-detail-mood" title={moodInfo.label}>{moodInfo.emoji}</span>
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
          <button
            className={`thought-detail-save-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSaveToggle}
            disabled={savingThought}
            title={isSaved ? 'Remove from saved' : 'Save to Heart'}
          >
            {isSaved ? '💜' : '🤍'}
          </button>
          <div className="thought-reminder-container">
            <button
              className={`thought-detail-reminder-btn ${hasActiveReminder ? 'active' : ''}`}
              onClick={() => setShowReminderMenu(!showReminderMenu)}
              title={hasActiveReminder ? 'Reminder set' : 'Remind me'}
            >
              {hasActiveReminder ? '🔔' : '🔕'}
            </button>
            {showReminderMenu && (
              <div className="thought-reminder-menu">
                <button onClick={() => handleSetReminder(1, 'In 1 hour')} disabled={settingReminder}>
                  In 1 hour
                </button>
                <button onClick={() => handleSetReminder(3, 'In 3 hours')} disabled={settingReminder}>
                  In 3 hours
                </button>
                <button onClick={() => handleSetReminder(8, 'Tonight')} disabled={settingReminder}>
                  Tonight
                </button>
                <button onClick={() => handleSetReminder(24, 'Tomorrow')} disabled={settingReminder}>
                  Tomorrow
                </button>
                {hasActiveReminder && (
                  <>
                    <div className="reminder-menu-divider" />
                    {activeReminders.map(r => (
                      <button
                        key={r.id}
                        className="reminder-cancel-btn"
                        onClick={() => handleCancelReminder(r.id)}
                      >
                        Cancel reminder
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            className={`thought-detail-archive-btn ${isArchived ? 'archived' : ''}`}
            onClick={handleArchiveToggle}
            disabled={archivingThought}
            title={isArchived ? 'Unarchive' : 'Archive'}
          >
            {isArchived ? '📥' : '📦'}
          </button>
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

          {/* Reactions Row */}
          <div className="thought-reactions-section">
            <div className="thought-reactions-display">
              {THOUGHT_REACTIONS.map(r => {
                const count = reactionCounts[r.key] || 0
                if (count === 0 && myReaction !== r.key) return null
                return (
                  <button
                    key={r.key}
                    className={`thought-reaction-pill ${myReaction === r.key ? 'mine' : ''}`}
                    onClick={() => handleReactionSelect(r.key)}
                    title={r.label}
                  >
                    <span className="reaction-emoji">{r.emoji}</span>
                    {count > 0 && <span className="reaction-count">{count}</span>}
                  </button>
                )
              })}
            </div>
            <div className="thought-reaction-picker-container">
              <button
                className="thought-reaction-add-btn"
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                title="Add reaction"
              >
                +
              </button>
              {showReactionPicker && (
                <div className="thought-reaction-picker">
                  {THOUGHT_REACTIONS.map(r => (
                    <button
                      key={r.key}
                      className={`reaction-option ${myReaction === r.key ? 'selected' : ''}`}
                      onClick={() => handleReactionSelect(r.key)}
                      title={r.label}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
