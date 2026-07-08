import React, { useState, useEffect, useRef, useCallback } from 'react'
import { db, storage } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  limitToLast,
  where,
  Timestamp,
} from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import MessageToTaskAiAction from './MessageToTaskAiAction'
import SecureFileContent from './SecureFileContent'
import SecureVoiceContent from './SecureVoiceContent'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'
import { useDeletedMediaForMe } from '../hooks/useDeletedMediaForMe'
import { isImageContentType, isVideoContentType } from '../utils/messageExtractors'
import { isEmojiOnlyMessage } from '../utils/emojiUtils'
import ZoomableImagePreview from './ZoomableImagePreview'
import { bulkDeleteForMe, bulkDeleteForEveryone, canDeleteAllForEveryone } from '../services/messageService'
import { useSavedMessages } from '../hooks/useSavedMessages'
import { useMessageReminders, getReminderTime } from '../hooks/useMessageReminders'
import { useMessageClearState } from '../hooks/useMessageClearState'
import { useRevealState } from '../hooks/useRevealState'
import { useReadArchiveState } from '../hooks/useReadArchiveState'
import { archiveAllRead } from '../services/readArchiveService'

function ReplyQuoteThumbnail({ chatId, fileInfo }) {
  const { url, loading } = useSecureFileUrl(
    fileInfo?.storagePath ? chatId : null,
    fileInfo?.storagePath
  )

  if (!fileInfo || loading || !url) return null

  if (fileInfo.type === 'image') {
    return <img src={url} alt="" className="reply-quote-thumbnail" />
  }

  if (fileInfo.type === 'video') {
    return (
      <div className="reply-quote-thumbnail reply-quote-thumbnail-video">
        <span>🎬</span>
      </div>
    )
  }

  return null
}

const PREVIEW_MAX_LENGTH = 80
const MESSAGE_LIMIT = 100
const ALLOWED_REACTIONS = ['❤️', '🤗', '😢', '✨', '🙏', '😂', '❤️‍🔥']
const WARM_REACTION_LABELS = {
  '❤️': 'Felt this',
  '🤗': 'Comfort',
  '😢': 'This hurt',
  '✨': 'Beautiful',
  '🙏': 'Thank you',
  '😂': 'Funny',
  '❤️‍🔥': 'Intense love',
}
const INTENSE_LOVE_EMOJI = '❤️‍🔥'
const MESSAGE_INTENTS = [
  { value: 'normal', label: 'Normal', icon: '' },
  { value: 'important', label: 'Important', icon: '❗' },
  { value: 'need_reply', label: 'Needs reply', icon: '💬' },
  { value: 'urgent', label: 'Urgent', icon: '🔴' },
  { value: 'just_sharing', label: 'Just sharing', icon: '💭' },
  { value: 'sensitive', label: 'Sensitive', icon: '🤫' },
  { value: 'love', label: 'Love', icon: '💕' },
]
const CONVERSION_TYPES = ['reminder', 'decision', 'memory', 'promise']
const EMOTIONAL_RECEIPTS = [
  { value: 'understood', label: 'I understood' },
  { value: 'need_time', label: 'I need time' },
  { value: 'disagree', label: 'I disagree' },
  { value: 'feel_hurt', label: 'I feel hurt' },
  { value: 'appreciate', label: 'I appreciate this' },
  { value: 'talk_later', label: "Let's talk later" },
]

function truncateText(text, maxLength = PREVIEW_MAX_LENGTH) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function formatVoiceDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function linkifyText(text) {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?"')\]])/g
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="message-link"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

function MessageList({ currentUser, chatId, onReply, searchQuery = '', dateFilter = null, scrollToMessageId = null, onScrollComplete = null, onViewThought = null }) {
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({})
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showReactionPicker, setShowReactionPicker] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [friendLastReadAt, setFriendLastReadAt] = useState(null)
  const [myLastReadAtOnMount, setMyLastReadAtOnMount] = useState(null)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [firstUnreadId, setFirstUnreadId] = useState(null)
  const [showPinnedPanel, setShowPinnedPanel] = useState(false)

  // === SCROLL STATE FLAGS ===
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const [readStateLoaded, setReadStateLoaded] = useState(false)
  const [initialScrollDone, setInitialScrollDone] = useState(false)
  const [userHasManuallyScrolled, setUserHasManuallyScrolled] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(null)
  const [convertModal, setConvertModal] = useState(null)
  const [convertTitle, setConvertTitle] = useState('')
  const [convertBody, setConvertBody] = useState('')
  const [convertOwner, setConvertOwner] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')
  const [emotionalReceipts, setEmotionalReceipts] = useState({})
  const [showReceiptPicker, setShowReceiptPicker] = useState(null)
  const [chatMembers, setChatMembers] = useState([])
  const [capsules, setCapsules] = useState([])
  const [showCapsulePicker, setShowCapsulePicker] = useState(null)
  const [addingToCapsule, setAddingToCapsule] = useState(false)
  const [showAiTaskExtract, setShowAiTaskExtract] = useState(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState(null)
  const [replyNotFoundId, setReplyNotFoundId] = useState(null)
  const [mobileActionSheet, setMobileActionSheet] = useState(null)
  const [customEmojiInput, setCustomEmojiInput] = useState(null)
  const [customEmoji, setCustomEmoji] = useState('')
  const [emojiError, setEmojiError] = useState('')
  const [revealedMessages, setRevealedMessages] = useState({})
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState(new Map())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const {
    isDeletedForMe,
    deleteForMe,
    undoDelete
  } = useDeletedMediaForMe(chatId, currentUser?.uid)
  const {
    isSaved,
    toggleSave,
    savedMessages: savedMessagesList
  } = useSavedMessages(chatId, currentUser?.uid)
  const {
    hasReminder,
    getReminders,
    createReminder,
    cancelReminder
  } = useMessageReminders(chatId, currentUser?.uid)
  const {
    isCleared: isMessageCleared,
    filterVisible: filterVisibleMessages,
    loading: clearStateLoading
  } = useMessageClearState(chatId, currentUser?.uid)
  const {
    isRevealed,
    revealMessage
  } = useRevealState(chatId, currentUser?.uid)
  const {
    isMessageHiddenFromMain,
    filterVisibleInMain
  } = useReadArchiveState(chatId, currentUser?.uid)
  const [showReminderPicker, setShowReminderPicker] = useState(null)
  const [showSavedMessages, setShowSavedMessages] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(null)
  const [editHistory, setEditHistory] = useState([])
  const [loadingEditHistory, setLoadingEditHistory] = useState(false)
  const [showHurtModal, setShowHurtModal] = useState(null)
  const messagesEndRef = useRef(null)
  const messagesStartRef = useRef(null)
  const messageListRef = useRef(null)
  const messageRefs = useRef({})
  const emojiInputRef = useRef(null)
  const initialScrollPendingRef = useRef(false)
  const scrollRetryCountRef = useRef(0)
  const lastMessageCountRef = useRef(0)
  const lastOwnMessageIdRef = useRef(null)
  const scrollCorrectionTimeoutRef = useRef(null)
  const wasNearBottomRef = useRef(true)
  const previousLastMessageIdRef = useRef(null)

  // Reset scroll state when chatId changes
  useEffect(() => {
    console.log('[SCROLL] ChatId changed, resetting scroll state')
    setMessagesLoaded(false)
    setReadStateLoaded(false)
    setInitialScrollDone(false)
    setUserHasManuallyScrolled(false)
    setNewMessagesCount(0)
    initialScrollPendingRef.current = false
    scrollRetryCountRef.current = 0
    lastMessageCountRef.current = 0
    previousLastMessageIdRef.current = null
    wasNearBottomRef.current = true
    if (scrollCorrectionTimeoutRef.current) {
      clearTimeout(scrollCorrectionTimeoutRef.current)
    }
  }, [chatId])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setMessagesLoaded(false)

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    let q

    if (dateFilter && dateFilter.startDate) {
      const startOfDay = new Date(dateFilter.startDate)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(dateFilter.endDate || dateFilter.startDate)
      endOfDay.setHours(23, 59, 59, 999)

      q = query(
        messagesRef,
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('createdAt', 'asc')
      )
    } else {
      q = query(messagesRef, orderBy('createdAt', 'asc'), limitToLast(MESSAGE_LIMIT))
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMessages(messageList)
        setLoading(false)
        setMessagesLoaded(true)
        console.log('[SCROLL] Messages loaded:', messageList.length)

        // Subscribe to reactions and emotional receipts for each message
        messageList.forEach((msg) => {
          subscribeToReactions(msg.id)
          subscribeToEmotionalReceipts(msg.id)
        })
      },
      (err) => {
        console.error('Firestore error:', err)
        if (err.code === 'permission-denied') {
          setError('You do not have access to this chat.')
        } else {
          setError('Failed to load messages.')
        }
        setMessagesLoaded(true)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [chatId, dateFilter])

  const reactionUnsubscribes = useRef({})
  const receiptUnsubscribes = useRef({})

  const subscribeToReactions = (messageId) => {
    if (reactionUnsubscribes.current[messageId]) return

    const reactionsRef = collection(db, 'chats', chatId, 'messages', messageId, 'reactions')
    const unsubscribe = onSnapshot(reactionsRef, (snapshot) => {
      const reactionList = snapshot.docs.map((doc) => doc.data())
      setReactions((prev) => ({ ...prev, [messageId]: reactionList }))
    })

    reactionUnsubscribes.current[messageId] = unsubscribe
  }

  const subscribeToEmotionalReceipts = (messageId) => {
    if (receiptUnsubscribes.current[messageId]) return

    const receiptsRef = collection(db, 'chats', chatId, 'messages', messageId, 'emotionalReceipts')
    const unsubscribe = onSnapshot(receiptsRef, (snapshot) => {
      const receiptList = snapshot.docs.map((doc) => doc.data())
      setEmotionalReceipts((prev) => ({ ...prev, [messageId]: receiptList }))
    }, () => {})

    receiptUnsubscribes.current[messageId] = unsubscribe
  }

  useEffect(() => {
    return () => {
      Object.values(reactionUnsubscribes.current).forEach((unsub) => unsub())
      Object.values(receiptUnsubscribes.current).forEach((unsub) => unsub())
    }
  }, [])

  useEffect(() => {
    const fetchChatMembers = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId))
        if (chatDoc.exists()) {
          setChatMembers(chatDoc.data().members || [])
        }
      } catch (err) {
        console.error('Error fetching chat members:', err)
      }
    }
    fetchChatMembers()
  }, [chatId])

  useEffect(() => {
    const capsulesRef = collection(db, 'chats', chatId, 'capsules')
    const q = query(capsulesRef, orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCapsules(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    }, () => {})
    return unsubscribe
  }, [chatId])

  // === SCROLL HELPER: scrolls the container, not the window ===
  const scrollToMessageById = useCallback((messageId, options = {}) => {
    const { behavior = 'auto', block = 'start', highlight = true } = options
    const container = messageListRef.current
    const element = messageRefs.current[messageId]

    if (!container || !element) {
      console.log('[SCROLL] scrollToMessageById failed - missing container or element:', {
        messageId: messageId?.slice?.(-6),
        hasContainer: !!container,
        hasElement: !!element,
      })
      return false
    }

    const elementOffsetTop = element.offsetTop
    let targetScrollTop

    if (block === 'center') {
      targetScrollTop = elementOffsetTop - (container.clientHeight / 2) + (element.offsetHeight / 2)
    } else if (block === 'start') {
      targetScrollTop = elementOffsetTop - 60 // padding for divider
    } else {
      targetScrollTop = elementOffsetTop - container.clientHeight + element.offsetHeight + 20
    }

    const maxScroll = container.scrollHeight - container.clientHeight
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll))

    container.scrollTop = targetScrollTop

    console.log('[SCROLL] scrollToMessageById:', {
      messageId: messageId?.slice?.(-6),
      block,
      targetScrollTop,
      actualScrollTop: container.scrollTop,
    })

    if (highlight) {
      setHighlightedMessageId(messageId)
      setTimeout(() => setHighlightedMessageId(null), 2000)
    }
    return true
  }, [])

  // === SCROLL CONTAINER TO BOTTOM ===
  const scrollContainerToBottom = useCallback(() => {
    const container = messageListRef.current
    if (!container) return false
    const maxScroll = container.scrollHeight - container.clientHeight
    container.scrollTop = maxScroll
    console.log('[SCROLL] scrollContainerToBottom:', { maxScroll, actual: container.scrollTop })
    return true
  }, [])

  // === INITIAL SCROLL EFFECT ===
  useEffect(() => {
    // Wait for all conditions
    if (!messagesLoaded || !readStateLoaded) {
      console.log('[SCROLL] Waiting for data:', { messagesLoaded, readStateLoaded })
      return
    }
    if (initialScrollDone) return
    if (scrollToMessageId) return // External scroll takes priority
    if (initialScrollPendingRef.current) return

    initialScrollPendingRef.current = true
    scrollRetryCountRef.current = 0

    console.log('[SCROLL] Starting initial scroll:', {
      messagesCount: messages.length,
      firstUnreadId: firstUnreadId?.slice?.(-6) || null,
    })

    const performInitialScroll = () => {
      if (userHasManuallyScrolled) {
        console.log('[SCROLL] Cancelled - user manually scrolled')
        setInitialScrollDone(true)
        initialScrollPendingRef.current = false
        return
      }

      const container = messageListRef.current
      if (!container || container.scrollHeight === 0) {
        scrollRetryCountRef.current++
        if (scrollRetryCountRef.current < 20) {
          requestAnimationFrame(performInitialScroll)
        } else {
          console.log('[SCROLL] Gave up waiting for container')
          setInitialScrollDone(true)
          initialScrollPendingRef.current = false
        }
        return
      }

      if (firstUnreadId) {
        const element = messageRefs.current[firstUnreadId]
        if (element) {
          const targetScrollTop = Math.max(0, element.offsetTop - 60)
          container.scrollTop = targetScrollTop
          setHighlightedMessageId(firstUnreadId)
          setTimeout(() => setHighlightedMessageId(null), 2000)

          console.log('[SCROLL] SUCCESS - scrolled to first unread:', {
            messageId: firstUnreadId?.slice?.(-6),
            targetScrollTop,
            actualScrollTop: container.scrollTop,
          })

          // Delayed correction (cancelled if user scrolls)
          scrollCorrectionTimeoutRef.current = setTimeout(() => {
            if (!userHasManuallyScrolled) {
              const c = messageListRef.current
              if (c && Math.abs(c.scrollTop - targetScrollTop) > 50) {
                console.log('[SCROLL] Applying delayed correction')
                c.scrollTop = targetScrollTop
              }
            }
          }, 150)

          setInitialScrollDone(true)
          initialScrollPendingRef.current = false
        } else {
          scrollRetryCountRef.current++
          if (scrollRetryCountRef.current < 20) {
            requestAnimationFrame(performInitialScroll)
          } else {
            console.log('[SCROLL] Element not found, scrolling to bottom')
            scrollContainerToBottom()
            setInitialScrollDone(true)
            initialScrollPendingRef.current = false
          }
        }
      } else {
        // No unread - scroll to bottom
        scrollContainerToBottom()
        console.log('[SCROLL] SUCCESS - no unread, scrolled to bottom')
        setInitialScrollDone(true)
        initialScrollPendingRef.current = false
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(performInitialScroll)
      })
    })
  }, [messagesLoaded, readStateLoaded, initialScrollDone, firstUnreadId, scrollToMessageId, userHasManuallyScrolled, messages.length, scrollContainerToBottom])

  // === NEW MESSAGE HANDLING ===
  useEffect(() => {
    // Track previous last message ID for comparison
    const currentLastMessage = messages[messages.length - 1]
    const currentLastMessageId = currentLastMessage?.id || null
    const previousLastMessageId = previousLastMessageIdRef.current

    // Update ref for next comparison
    previousLastMessageIdRef.current = currentLastMessageId

    // Skip if no messages, not initialized, or no change in last message
    if (!messages.length || !initialScrollDone) {
      lastMessageCountRef.current = messages.length
      return
    }

    // No new message (same last message ID)
    if (currentLastMessageId === previousLastMessageId) {
      lastMessageCountRef.current = messages.length
      return
    }

    // We have a new last message
    const newLastMessage = currentLastMessage
    const isOwnMessage = newLastMessage?.senderId === currentUser.uid

    // Capture the near-bottom state BEFORE this render (from scroll handler)
    const wasNearBottom = wasNearBottomRef.current

    // Debug logging
    console.log('[SCROLL] New message detected:', {
      currentUserId: currentUser.uid?.slice?.(-6),
      previousLastMessageId: previousLastMessageId?.slice?.(-6) || null,
      newLastMessageId: currentLastMessageId?.slice?.(-6),
      newLastMessageSenderId: newLastMessage?.senderId?.slice?.(-6),
      isOwnMessage,
      initialScrollDone,
      wasNearBottom,
    })

    // Calculate how many new messages
    const prevCount = lastMessageCountRef.current
    const newMsgCount = messages.length - prevCount
    lastMessageCountRef.current = messages.length

    // RULE B: User sent a message - ALWAYS scroll to bottom
    if (isOwnMessage) {
      console.log('[SCROLL] message-sent: scrolling to bottom (force)')
      // Use double RAF to ensure DOM has rendered the new message
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollContainerToBottom()
          // Clear any new message indicator
          setNewMessagesCount(0)
        })
      })
      return
    }

    // RULE C: Incoming message from other user
    if (wasNearBottom) {
      // Near bottom - auto scroll
      console.log('[SCROLL] incoming-near-bottom: auto-scrolling')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollContainerToBottom()
          setNewMessagesCount(0)
        })
      })
    } else {
      // Not near bottom - show indicator, don't scroll
      const incomingCount = newMsgCount > 0 ? newMsgCount : 1
      setNewMessagesCount(prev => prev + incomingCount)
      console.log('[SCROLL] incoming-not-near-bottom: showing indicator, count:', incomingCount)
    }
  }, [messages, initialScrollDone, currentUser.uid, scrollContainerToBottom])

  // === SCROLL EVENT HANDLER ===
  useEffect(() => {
    const container = messageListRef.current
    if (!container) return

    let lastScrollTop = container.scrollTop

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromTop = scrollTop
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Track near-bottom state BEFORE new messages arrive (for incoming message scroll decision)
      wasNearBottomRef.current = distanceFromBottom < 150

      // Detect manual scroll
      if (initialScrollDone && Math.abs(scrollTop - lastScrollTop) > 10) {
        if (!userHasManuallyScrolled) {
          setUserHasManuallyScrolled(true)
          if (scrollCorrectionTimeoutRef.current) {
            clearTimeout(scrollCorrectionTimeoutRef.current)
            console.log('[SCROLL] User scrolled, cancelled correction')
          }
        }
      }
      lastScrollTop = scrollTop

      setShowScrollTop(distanceFromTop > 200)
      setShowScrollBottom(distanceFromBottom > 200)

      if (distanceFromBottom < 100) {
        setNewMessagesCount(0)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages, initialScrollDone, userHasManuallyScrolled])

  const scrollToTop = () => {
    const container = messageListRef.current
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToBottom = () => {
    scrollContainerToBottom()
    setNewMessagesCount(0)
    wasNearBottomRef.current = true
  }

  const scrollToFirstUnread = () => {
    if (firstUnreadId) {
      scrollToMessageById(firstUnreadId, { behavior: 'smooth', block: 'start' })
    } else {
      scrollContainerToBottom()
    }
    setNewMessagesCount(0)
    // Reset manual scroll flag so future incoming messages auto-scroll
    wasNearBottomRef.current = true
  }

  // === EXTERNAL SCROLL REQUEST (SharedMedia, search, reply) ===
  useEffect(() => {
    if (!scrollToMessageId || !messagesLoaded) return

    console.log('[SCROLL] External scroll request:', scrollToMessageId?.slice?.(-6))

    // External scroll takes priority
    setInitialScrollDone(true)
    setUserHasManuallyScrolled(true)

    const tryScroll = (retries = 0) => {
      const success = scrollToMessageById(scrollToMessageId, { behavior: 'smooth', block: 'center' })
      if (success) {
        setTimeout(() => onScrollComplete?.(), 2000)
      } else if (retries < 15) {
        requestAnimationFrame(() => tryScroll(retries + 1))
      } else {
        onScrollComplete?.()
      }
    }
    tryScroll()
  }, [scrollToMessageId, messagesLoaded, scrollToMessageById, onScrollComplete])

  // Subscribe to chat document for friend's lastReadAt
  useEffect(() => {
    const chatRef = doc(db, 'chats', chatId)
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const lastReadAt = data.lastReadAt || {}
        const friendUid = Object.keys(lastReadAt).find((uid) => uid !== currentUser.uid)
        if (friendUid && lastReadAt[friendUid]) {
          setFriendLastReadAt(lastReadAt[friendUid])
        }
      }
    })
    return unsubscribe
  }, [chatId, currentUser.uid])

  // Fetch initial lastReadAt on mount (before updating it)
  useEffect(() => {
    setReadStateLoaded(false)
    const fetchInitialReadState = async () => {
      try {
        const chatRef = doc(db, 'chats', chatId)
        const chatSnap = await getDoc(chatRef)
        if (chatSnap.exists()) {
          const lastReadAt = chatSnap.data().lastReadAt || {}
          if (lastReadAt[currentUser.uid]) {
            setMyLastReadAtOnMount(lastReadAt[currentUser.uid])
          } else {
            setMyLastReadAtOnMount(null)
          }
        } else {
          setMyLastReadAtOnMount(null)
        }
        console.log('[SCROLL] Read state loaded')
      } catch (err) {
        console.error('Error fetching initial read state:', err)
        setMyLastReadAtOnMount(null)
      } finally {
        setReadStateLoaded(true)
      }
    }
    fetchInitialReadState()
  }, [chatId, currentUser.uid])

  // Calculate first unread message
  useEffect(() => {
    if (!readStateLoaded) return

    if (!messages.length) {
      setFirstUnreadId(null)
      return
    }

    // If no lastReadAt, all messages from others are unread
    const myLastReadMs = myLastReadAtOnMount?.toMillis?.() || 0
    const firstUnread = messages.find((msg) => {
      if (msg.senderId === currentUser.uid) return false
      const msgMs = msg.createdAt?.toMillis?.() || 0
      return myLastReadAtOnMount ? msgMs > myLastReadMs : true
    })

    console.log('[SCROLL] Calculated firstUnreadId:', {
      myLastReadAt: myLastReadAtOnMount ? 'exists' : 'null',
      firstUnreadId: firstUnread?.id?.slice?.(-6) || null,
    })

    setFirstUnreadId(firstUnread?.id || null)
  }, [messages, myLastReadAtOnMount, currentUser.uid, readStateLoaded])

  // Update own lastReadAt when viewing chat (debounced)
  // Only after initial scroll is done and user is near bottom
  const lastReadAtUpdateRef = useRef(null)
  useEffect(() => {
    // Don't update until initial scroll is complete
    if (!initialScrollDone) return

    // Check if user is near bottom
    const container = messageListRef.current
    if (container) {
      const { scrollHeight, scrollTop, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      if (distanceFromBottom > 200) return
    }

    if (lastReadAtUpdateRef.current) {
      clearTimeout(lastReadAtUpdateRef.current)
    }
    lastReadAtUpdateRef.current = setTimeout(async () => {
      try {
        const chatRef = doc(db, 'chats', chatId)
        // Use dot-path notation to only update this user's field
        await updateDoc(chatRef, {
          [`lastReadAt.${currentUser.uid}`]: serverTimestamp(),
        })
        console.log('[SCROLL] Updated lastReadAt')
      } catch (err) {
        console.error('Error updating lastReadAt:', err)
      }
    }, 1500)
    return () => {
      if (lastReadAtUpdateRef.current) {
        clearTimeout(lastReadAtUpdateRef.current)
      }
    }
  }, [chatId, currentUser.uid, messages, initialScrollDone])

  // Auto-archive read messages when leaving chat (if enabled)
  useEffect(() => {
    const autoArchiveEnabled = localStorage.getItem('autoArchiveReadMessages') === 'true'
    if (!autoArchiveEnabled) return

    // On unmount, archive read messages
    return () => {
      const archiveOnLeave = async () => {
        if (!chatId || !currentUser?.uid) return

        try {
          const myLastReadAtMs = myLastReadAtOnMount?.toMillis?.() || myLastReadAtOnMount || 0
          const friendLastReadAtMs = friendLastReadAt?.toMillis?.() || friendLastReadAt || 0

          if (!myLastReadAtMs && !friendLastReadAtMs) return

          // Find messages that should be archived based on read status
          const readMessageIds = messages
            .filter(msg => {
              const createdAtMs = msg.createdAt?.toMillis?.() || msg.createdAt || 0
              if (isMessageHiddenFromMain(msg.id)) return false

              const isOwnMessage = msg.senderId === currentUser.uid

              if (isOwnMessage) {
                // My sent messages: archive only after OTHER person has read them
                return friendLastReadAtMs && createdAtMs <= friendLastReadAtMs
              } else {
                // Received messages: archive after I have read them
                return myLastReadAtMs && createdAtMs <= myLastReadAtMs
              }
            })
            .map(msg => msg.id)

          if (readMessageIds.length > 0) {
            await archiveAllRead(chatId, currentUser.uid, readMessageIds, 'read')
            console.log('[AUTO-ARCHIVE] Archived', readMessageIds.length, 'read messages')
          }
        } catch (err) {
          console.error('[AUTO-ARCHIVE] Error:', err)
        }
      }

      archiveOnLeave()
    }
  }, [chatId, currentUser?.uid, messages, myLastReadAtOnMount, friendLastReadAt, isMessageHiddenFromMain])

  // Subscribe to pinned messages
  useEffect(() => {
    const pinnedRef = collection(db, 'chats', chatId, 'pinnedMessages')
    const unsubscribe = onSnapshot(pinnedRef, (snapshot) => {
      const pinned = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setPinnedMessages(pinned)
    })
    return unsubscribe
  }, [chatId])

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
      await deleteDoc(doc(db, 'chats', chatId, 'messages', message.id))

      if (message.type === 'file' && message.file?.storagePath) {
        try {
          const storageRef = ref(storage, message.file.storagePath)
          await deleteObject(storageRef)
        } catch (storageErr) {
          console.warn('Failed to delete file from storage:', storageErr)
        }
      }

      if (message.type === 'voice' && message.voice?.storagePath) {
        try {
          const storageRef = ref(storage, message.voice.storagePath)
          await deleteObject(storageRef)
        } catch (storageErr) {
          console.warn('Failed to delete voice note from storage:', storageErr)
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
    let previewText = message.text
    let fileInfo = null

    if (message.type === 'file' && message.file) {
      const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'].includes(message.file.contentType)
      if (isImage) {
        previewText = '📷 Photo'
        fileInfo = {
          storagePath: message.file.storagePath,
          contentType: message.file.contentType,
          type: 'image'
        }
      } else {
        previewText = `📎 ${message.file.fileName}`
      }
    } else if (message.type === 'video' && message.file) {
      previewText = '🎬 Video'
      fileInfo = {
        storagePath: message.file.storagePath,
        contentType: message.file.contentType,
        type: 'video'
      }
    } else if (message.type === 'attachment_bundle') {
      const count = message.attachmentCount || 0
      previewText = count > 1 ? `📎 ${count} attachments` : '📎 Attachment'
      if (message.firstPreviewStoragePath) {
        fileInfo = { storagePath: message.firstPreviewStoragePath, contentType: 'image/*', type: 'image' }
      }
    } else if (message.type === 'voice' && message.voice) {
      previewText = `🎤 Voice note (${formatVoiceDuration(message.voice.durationSeconds)})`
    }

    onReply({
      messageId: message.id,
      senderId: message.senderId,
      textPreview: truncateText(previewText),
      fileInfo,
    })
  }

  const handleEdit = (message) => {
    setEditingId(message.id)
    setEditText(message.text)
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleEditSubmit = async (message) => {
    const trimmedText = editText.trim()
    if (!trimmedText || trimmedText.length > 2000) return

    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', message.id)

      // Save previous text to edit history
      const historyRef = collection(db, 'chats', chatId, 'messages', message.id, 'editHistory')
      await addDoc(historyRef, {
        versionId: '',
        previousText: message.text,
        editedBy: currentUser.uid,
        editedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })

      // Update the message
      await updateDoc(messageRef, {
        text: trimmedText,
        edited: true,
        editedAt: serverTimestamp(),
      })
      setEditingId(null)
      setEditText('')
    } catch (err) {
      console.error('Edit error:', err)
      if (err.code === 'permission-denied') {
        alert('You do not have permission to edit this message.')
      } else {
        alert('Failed to edit message. Please try again.')
      }
    }
  }

  const isMessagePinned = (messageId) => {
    return pinnedMessages.some((p) => p.messageId === messageId)
  }

  const handlePin = async (message) => {
    const pinnedRef = doc(db, 'chats', chatId, 'pinnedMessages', message.id)
    const isPinned = isMessagePinned(message.id)

    try {
      if (isPinned) {
        await deleteDoc(pinnedRef)
      } else {
        let textPreview = truncateText(message.text)
        if (message.type === 'file' && message.file) {
          textPreview = `📎 ${message.file.fileName}`
        } else if (message.type === 'video' && message.file) {
          textPreview = `🎬 ${message.file.fileName}`
        } else if (message.type === 'voice' && message.voice) {
          textPreview = `🎤 Voice note (${formatVoiceDuration(message.voice.durationSeconds)})`
        }
        await setDoc(pinnedRef, {
          messageId: message.id,
          pinnedBy: currentUser.uid,
          pinnedAt: serverTimestamp(),
          textPreview,
          senderId: message.senderId,
          type: message.type,
        })
      }
    } catch (err) {
      console.error('Pin error:', err)
    }
  }

  const handleReaction = async (messageId, emoji) => {
    setShowReactionPicker(null)
    setCustomEmojiInput(null)
    setCustomEmoji('')
    setEmojiError('')
    setMobileActionSheet(null)
    const reactionRef = doc(db, 'chats', chatId, 'messages', messageId, 'reactions', currentUser.uid)

    const currentReactions = reactions[messageId] || []
    const myReaction = currentReactions.find((r) => r.uid === currentUser.uid)

    try {
      if (myReaction?.emoji === emoji) {
        // Remove reaction if same emoji
        await deleteDoc(reactionRef)
      } else {
        // Add or update reaction
        await setDoc(reactionRef, {
          uid: currentUser.uid,
          emoji,
          createdAt: serverTimestamp(),
        })
        // Trigger animation for intense love reaction
        if (emoji === INTENSE_LOVE_EMOJI) {
          setIntenseLoveAnimation(messageId)
          setTimeout(() => setIntenseLoveAnimation(null), 1000)
        }
      }
    } catch (err) {
      console.error('Reaction error:', err)
    }
  }

  const isEmojiOnly = (str) => {
    if (!str || str.length === 0 || str.length > 8) return false
    const emojiPattern = /^[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]+$/u
    return emojiPattern.test(str)
  }

  const openCustomEmoji = (messageId) => {
    setShowReactionPicker(null)
    setCustomEmojiInput(messageId)
    setCustomEmoji('')
    setEmojiError('')
    setTimeout(() => emojiInputRef.current?.focus(), 50)
  }

  const submitCustomEmoji = (messageId) => {
    const trimmed = customEmoji.trim()
    if (!trimmed) {
      setEmojiError('Enter an emoji')
      return
    }
    if (!isEmojiOnly(trimmed)) {
      setEmojiError('Emoji only')
      return
    }
    handleReaction(messageId, trimmed)
  }

  const openConvertModal = (message, type) => {
    setShowMoreMenu(null)
    let textContent = message.text || ''
    if (message.type === 'file' && message.file) {
      textContent = `📎 ${message.file.fileName}`
    } else if (message.type === 'voice' && message.voice) {
      textContent = `🎤 Voice note (${formatVoiceDuration(message.voice.durationSeconds)})`
    }

    setConvertTitle(truncateText(textContent, 200))
    setConvertBody(textContent)
    setConvertOwner(currentUser.uid)
    setConvertModal({ message, type })
    setConvertError('')
  }

  const closeConvertModal = () => {
    setConvertModal(null)
    setConvertTitle('')
    setConvertBody('')
    setConvertOwner('')
    setConvertError('')
  }

  const handleConvert = async () => {
    if (!convertModal) return
    const { message, type } = convertModal
    const trimmedTitle = convertTitle.trim()

    if (!trimmedTitle) {
      setConvertError('Title is required')
      return
    }
    if (trimmedTitle.length > 200) {
      setConvertError('Title must be 200 characters or less')
      return
    }

    setConverting(true)
    setConvertError('')

    try {
      if (type === 'reminder') {
        await addDoc(collection(db, 'chats', chatId, 'reminders'), {
          title: trimmedTitle,
          notes: convertBody.trim(),
          dueAt: null,
          priority: 'normal',
          completed: false,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          sourceMessageId: message.id,
        })
      } else if (type === 'decision') {
        await addDoc(collection(db, 'chats', chatId, 'decisions'), {
          title: trimmedTitle,
          decision: convertBody.trim() || trimmedTitle,
          reason: '',
          status: 'active',
          relatedMessageId: message.id,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } else if (type === 'memory') {
        await addDoc(collection(db, 'chats', chatId, 'memories'), {
          title: trimmedTitle,
          description: convertBody.trim(),
          date: serverTimestamp(),
          sourceMessageId: message.id,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } else if (type === 'promise') {
        await addDoc(collection(db, 'chats', chatId, 'promises'), {
          title: trimmedTitle,
          description: convertBody.trim(),
          ownerUid: convertOwner || currentUser.uid,
          sourceMessageId: message.id,
          sourceMessageTextPreview: truncateText(convertBody, 200),
          status: 'pending',
          dueAt: null,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      closeConvertModal()
    } catch (err) {
      console.error('Conversion error:', err)
      setConvertError('Failed to save. Please try again.')
    } finally {
      setConverting(false)
    }
  }

  const handleEmotionalReceipt = async (messageId, receiptValue) => {
    setShowReceiptPicker(null)
    const receiptRef = doc(db, 'chats', chatId, 'messages', messageId, 'emotionalReceipts', currentUser.uid)

    const currentReceipts = emotionalReceipts[messageId] || []
    const myReceipt = currentReceipts.find((r) => r.uid === currentUser.uid)

    try {
      if (myReceipt?.receipt === receiptValue) {
        await deleteDoc(receiptRef)
      } else {
        await setDoc(receiptRef, {
          uid: currentUser.uid,
          receipt: receiptValue,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
    } catch (err) {
      console.error('Emotional receipt error:', err)
    }
  }

  const handleAddToCapsule = async (message, capsuleId) => {
    setShowCapsulePicker(null)
    setShowMoreMenu(null)
    setAddingToCapsule(true)

    let textContent = message.text || ''
    if (message.type === 'file' && message.file) {
      textContent = `📎 ${message.file.fileName}`
    } else if (message.type === 'voice' && message.voice) {
      textContent = `🎤 Voice note (${formatVoiceDuration(message.voice.durationSeconds)})`
    }

    try {
      await addDoc(collection(db, 'chats', chatId, 'capsules', capsuleId, 'links'), {
        targetType: 'message',
        targetId: message.id,
        textPreview: truncateText(textContent, 100),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error adding to capsule:', err)
      alert('Failed to add to capsule')
    } finally {
      setAddingToCapsule(false)
    }
  }

  const handleCopyMessage = async (message) => {
    let textContent = message.text || ''
    if (message.type === 'file' && message.file) {
      textContent = message.file.fileName
    } else if (message.type === 'voice' && message.voice) {
      textContent = `Voice note (${formatVoiceDuration(message.voice.durationSeconds)})`
    }
    try {
      await navigator.clipboard.writeText(textContent)
    } catch (err) {
      console.error('Copy failed:', err)
    }
    setShowMoreMenu(null)
    setMobileActionSheet(null)
  }

  const isImageMessage = (message) => {
    return message.type === 'file' && message.file && isImageContentType(message.file.contentType)
  }

  const isVideoMessage = (message) => {
    return (message.type === 'video' || message.type === 'file') &&
           message.file && isVideoContentType(message.file.contentType)
  }

  const isMediaMessage = (message) => {
    return isImageMessage(message) || isVideoMessage(message)
  }

  const getMediaKind = (message) => {
    if (isVideoMessage(message)) return 'video'
    if (isImageMessage(message)) return 'image'
    return null
  }

  const handleDeleteMediaForMe = async (message) => {
    const mediaKind = getMediaKind(message)
    const mediaLabel = mediaKind === 'video' ? 'video' : 'image'
    if (!window.confirm(`Delete this ${mediaLabel} from your view? It will still be visible to the other person.`)) return
    setShowMoreMenu(null)
    setMobileActionSheet(null)
    await deleteForMe(message.id, mediaKind)
  }

  const handleUndoDeleteForMe = async (messageId) => {
    await undoDelete(messageId)
  }

  const handleSaveToHeart = async (messageId) => {
    setShowMoreMenu(null)
    setMobileActionSheet(null)
    await toggleSave(messageId)
  }

  const handleReminderOption = async (messageId, option) => {
    setShowReminderPicker(null)
    setShowMoreMenu(null)
    setMobileActionSheet(null)
    if (option === 'custom') {
      return
    }
    const remindAt = getReminderTime(option)
    if (remindAt) {
      await createReminder(messageId, remindAt)
    }
  }

  const handleCancelReminder = async (messageId) => {
    const msgReminders = getReminders(messageId)
    for (const reminder of msgReminders) {
      await cancelReminder(reminder.id)
    }
    setShowMoreMenu(null)
    setMobileActionSheet(null)
  }

  const handleViewEditHistory = async (messageId) => {
    setLoadingEditHistory(true)
    setShowEditHistory(messageId)
    try {
      const historyRef = collection(db, 'chats', chatId, 'messages', messageId, 'editHistory')
      const q = query(historyRef, orderBy('editedAt', 'desc'))
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setEditHistory(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoadingEditHistory(false)
      }, () => {
        setEditHistory([])
        setLoadingEditHistory(false)
      })
      return unsubscribe
    } catch (err) {
      console.error('Error loading edit history:', err)
      setEditHistory([])
      setLoadingEditHistory(false)
    }
  }

  const handleHurtAction = (action, message) => {
    setShowHurtModal(null)
    setShowMoreMenu(null)
    setMobileActionSheet(null)

    switch (action) {
      case 'hide':
        deleteForMe(message.id)
        break
      case 'reply_gently':
        onReply(message)
        break
      case 'talk':
        onReply(message)
        break
      default:
        break
    }
  }

  const closeMobileActionSheet = () => {
    setMobileActionSheet(null)
  }

  // Selection mode handlers
  const enterSelectionMode = (initialMessage = null) => {
    setSelectionMode(true)
    setShowMoreMenu(null)
    setMobileActionSheet(null)
    if (initialMessage) {
      setSelectedMessages(new Map([[initialMessage.id, initialMessage]]))
    } else {
      setSelectedMessages(new Map())
    }
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedMessages(new Map())
    setShowDeleteModal(false)
  }

  const toggleMessageSelection = (message) => {
    setSelectedMessages(prev => {
      const next = new Map(prev)
      if (next.has(message.id)) {
        next.delete(message.id)
      } else {
        next.set(message.id, message)
      }
      return next
    })
  }

  const handleBulkDelete = async (deleteMode) => {
    if (selectedMessages.size === 0) return

    setBulkDeleting(true)
    const messagesArray = Array.from(selectedMessages.values())

    try {
      let result
      if (deleteMode === 'for_me') {
        result = await bulkDeleteForMe(chatId, messagesArray, currentUser.uid)
      } else {
        result = await bulkDeleteForEveryone(chatId, messagesArray, currentUser.uid)
      }

      if (result.success) {
        exitSelectionMode()
      } else if (result.error) {
        alert(result.error)
      } else if (result.deletedCount > 0) {
        exitSelectionMode()
      }
    } catch (err) {
      console.error('Bulk delete error:', err)
      alert('Failed to delete messages. Please try again.')
    } finally {
      setBulkDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const canDeleteSelectedForEveryone = () => {
    const messagesArray = Array.from(selectedMessages.values())
    return canDeleteAllForEveryone(messagesArray, currentUser.uid)
  }

  const handleExportSelected = () => {
    if (selectedMessages.size === 0) return

    const messagesArray = Array.from(selectedMessages.values())
      .filter(msg => !isDeletedForMe(msg.id))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return aTime - bTime
      })

    // Build export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      messageCount: messagesArray.length,
      messages: messagesArray.map(msg => ({
        id: msg.id,
        type: msg.type,
        text: msg.text || '',
        senderId: msg.senderId,
        senderPhone: msg.senderPhone,
        createdAt: msg.createdAt?.toDate?.()?.toISOString() || null,
        ...(msg.type === 'voice' && msg.transcriptText ? { transcriptText: msg.transcriptText } : {}),
        ...(msg.file ? { fileName: msg.file.fileName, contentType: msg.file.contentType } : {}),
        ...(msg.replyTo ? { replyTo: { textPreview: msg.replyTo.textPreview } } : {}),
        ...(msg.messageIntent && msg.messageIntent !== 'normal' ? { messageIntent: msg.messageIntent } : {}),
      }))
    }

    // Build markdown version
    let markdown = `# Exported Messages\n\n`
    markdown += `Exported on: ${new Date().toLocaleString()}\n`
    markdown += `Message count: ${messagesArray.length}\n\n---\n\n`

    messagesArray.forEach(msg => {
      const isOwn = msg.senderId === currentUser.uid
      const senderLabel = isOwn ? 'You' : 'Friend'
      const time = msg.createdAt?.toDate?.()?.toLocaleString() || 'Unknown time'

      markdown += `**${senderLabel}** - ${time}\n\n`

      if (msg.type === 'voice' && msg.transcriptText) {
        markdown += `*Voice transcript:* ${msg.transcriptText}\n\n`
      } else if (msg.file) {
        markdown += `📎 *File:* ${msg.file.fileName}\n\n`
      } else {
        markdown += `${msg.text}\n\n`
      }

      markdown += `---\n\n`
    })

    // Create JSON download
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const jsonUrl = URL.createObjectURL(jsonBlob)
    const jsonLink = document.createElement('a')
    jsonLink.href = jsonUrl
    jsonLink.download = `messages-export-${new Date().toISOString().split('T')[0]}.json`
    jsonLink.click()
    URL.revokeObjectURL(jsonUrl)

    // Create Markdown download
    setTimeout(() => {
      const mdBlob = new Blob([markdown], { type: 'text/markdown' })
      const mdUrl = URL.createObjectURL(mdBlob)
      const mdLink = document.createElement('a')
      mdLink.href = mdUrl
      mdLink.download = `messages-export-${new Date().toISOString().split('T')[0]}.md`
      mdLink.click()
      URL.revokeObjectURL(mdUrl)
    }, 100)

    exitSelectionMode()
  }

  const scrollToMessage = (messageId) => {
    if (!messageId) return

    const element = messageRefs.current[messageId]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMessageId(messageId)
      setTimeout(() => setHighlightedMessageId(null), 2000)
    } else {
      setReplyNotFoundId(messageId)
      setTimeout(() => setReplyNotFoundId(null), 2000)
    }
  }

  const renderEmotionalReceipts = (messageId) => {
    const messageReceipts = emotionalReceipts[messageId] || []
    if (messageReceipts.length === 0) return null

    return (
      <div className="emotional-receipts">
        {messageReceipts.map((r) => {
          const receiptInfo = EMOTIONAL_RECEIPTS.find((er) => er.value === r.receipt)
          const isOwn = r.uid === currentUser.uid
          return (
            <span key={r.uid} className={`emotional-receipt ${isOwn ? 'own' : ''}`}>
              {receiptInfo?.label || r.receipt}
              {!isOwn && <span className="receipt-from"> (friend)</span>}
            </span>
          )
        })}
      </div>
    )
  }

  const renderReactions = (messageId) => {
    const messageReactions = reactions[messageId] || []
    if (messageReactions.length === 0) return null

    // Group reactions by emoji
    const grouped = {}
    messageReactions.forEach((r) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = []
      grouped[r.emoji].push(r.uid)
    })

    return (
      <div className="reactions-display">
        {Object.entries(grouped).map(([emoji, uids]) => {
          const isIntenseLove = emoji === INTENSE_LOVE_EMOJI
          const isOwn = uids.includes(currentUser.uid)
          return (
            <span
              key={emoji}
              className={`reaction-chip ${isOwn ? 'own' : ''} ${isIntenseLove ? 'intense-love' : ''}`}
              onClick={() => handleReaction(messageId, emoji)}
              title={isIntenseLove ? 'Intense love' : undefined}
            >
              {emoji} {uids.length > 1 && uids.length}
            </span>
          )
        })}
      </div>
    )
  }

  const [intenseLoveAnimation, setIntenseLoveAnimation] = useState(null)

  const handleReveal = (messageId) => {
    setRevealedMessages(prev => ({ ...prev, [messageId]: true }))
  }

  const isMessageExpired = (message) => {
    if (!message.expiresAt) return false
    const expiresAt = message.expiresAt.toDate ? message.expiresAt.toDate() : new Date(message.expiresAt)
    return new Date() > expiresAt
  }

  const isMessageLocked = (message) => {
    if (!message.unlockAt) return false
    const unlockAt = message.unlockAt.toDate ? message.unlockAt.toDate() : new Date(message.unlockAt)
    return new Date() < unlockAt
  }

  const formatUnlockDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const formatExpiresIn = (timestamp) => {
    if (!timestamp) return ''
    const expiresAt = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = expiresAt - now
    if (diffMs <= 0) return 'Expired'
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const renderSpecialMessage = (message) => {
    const isOwn = message.senderId === currentUser.uid
    const specialType = message.specialType

    if (specialType === 'letter') {
      return (
        <div className="special-letter">
          {message.title && <div className="special-letter-title">{message.title}</div>}
          <div className="special-letter-body">{message.text}</div>
          <div className="special-letter-signature">
            {isOwn ? 'With love' : 'From your love'}
          </div>
        </div>
      )
    }

    if (specialType === 'hold_reveal') {
      const isRevealed = revealedMessages[message.id]
      if (!isRevealed) {
        return (
          <div className="special-hold-reveal">
            <div className="special-hidden-content">
              <span className="special-hidden-icon">🙈</span>
              <span className="special-hidden-text">Hidden message</span>
            </div>
            <button
              className="special-reveal-btn"
              onClick={() => handleReveal(message.id)}
              onMouseDown={(e) => {
                const timer = setTimeout(() => handleReveal(message.id), 500)
                e.currentTarget.dataset.timer = timer
              }}
              onMouseUp={(e) => {
                clearTimeout(e.currentTarget.dataset.timer)
              }}
              onMouseLeave={(e) => {
                clearTimeout(e.currentTarget.dataset.timer)
              }}
              aria-label="Hold or tap to reveal message"
            >
              Hold to reveal
            </button>
          </div>
        )
      }
      return (
        <div className="special-revealed">
          <div className="special-revealed-label">Revealed</div>
          <div className="special-revealed-text">{message.text}</div>
        </div>
      )
    }

    if (specialType === 'timed_unlock') {
      const locked = isMessageLocked(message)
      if (locked) {
        return (
          <div className="special-locked">
            <span className="special-locked-icon">🔒</span>
            <span className="special-locked-text">A special message awaits...</span>
            <span className="special-unlock-date">Opens {formatUnlockDate(message.unlockAt)}</span>
          </div>
        )
      }
      return (
        <div className="special-unlocked">
          <span className="special-unlocked-icon">🔓</span>
          {message.title && <div className="special-unlocked-title">{message.title}</div>}
          <div className="special-unlocked-text">{message.text}</div>
        </div>
      )
    }

    if (specialType === 'disappearing') {
      const expired = isMessageExpired(message)
      if (expired) {
        return (
          <div className="special-disappeared">
            <span className="special-disappeared-icon">✨</span>
            <span className="special-disappeared-text">This note has faded away</span>
          </div>
        )
      }
      return (
        <div className="special-disappearing">
          <div className="special-disappearing-text">{message.text}</div>
          {message.expiresAt && (
            <div className="special-expires">
              Disappears in {formatExpiresIn(message.expiresAt)}
            </div>
          )}
        </div>
      )
    }

    return <div className="message-text">{linkifyText(message.text)}</div>
  }

  const REVEAL_KIND_ICONS = {
    puzzle: '🧩',
    surprise: '🎉',
    spoiler: '🤐',
    secret: '🤫',
    question: '❓',
  }

  const REVEAL_KIND_LABELS = {
    puzzle: 'Puzzle',
    surprise: 'Surprise',
    spoiler: 'Spoiler',
    secret: 'Secret',
    question: 'Question',
  }

  const renderRevealMessage = (message) => {
    const revealed = isRevealed(message.id)
    const kind = message.revealKind || 'secret'
    const icon = REVEAL_KIND_ICONS[kind] || '🎁'
    const kindLabel = REVEAL_KIND_LABELS[kind] || 'Reveal'

    const handleRevealClick = () => {
      revealMessage(message.id)
    }

    return (
      <div className={`reveal-message reveal-message--${kind} ${revealed ? 'reveal-message--revealed' : ''}`}>
        {message.revealTitle && (
          <div className="reveal-message-title">{message.revealTitle}</div>
        )}

        <div className="reveal-message-prompt">
          <span className="reveal-message-icon">{icon}</span>
          <span className="reveal-message-prompt-text">{message.revealPrompt}</span>
        </div>

        {!revealed ? (
          <button
            className="reveal-message-btn"
            onClick={handleRevealClick}
            aria-label={`Tap to reveal ${kindLabel.toLowerCase()}`}
          >
            {kind === 'puzzle' || kind === 'question' ? 'Show answer' : 'Tap to reveal'}
          </button>
        ) : (
          <div className="reveal-message-content">
            <div className="reveal-message-divider">
              <span className="reveal-message-divider-label">
                {kind === 'puzzle' || kind === 'question' ? 'Answer' : 'Revealed'}
              </span>
            </div>
            <div className="reveal-message-hidden-text">{linkifyText(message.hiddenContent)}</div>
          </div>
        )}
      </div>
    )
  }

  // Filter messages: exclude cleared messages, archived messages, and apply search query
  // First, filter out messages cleared by "Clear All"
  const clearedVisible = filterVisibleMessages(messages)
  // Then, filter out messages hidden from main view via read archive
  const visibleMessages = filterVisibleInMain(clearedVisible)

  // Then apply search query filter (includes text, links, file names, and voice transcripts)
  const filteredMessages = searchQuery.trim()
    ? visibleMessages.filter((msg) => {
        if (isDeletedForMe(msg.id)) return false
        if (isMessageCleared(msg)) return false
        if (isMessageHiddenFromMain(msg.id)) return false
        const query = searchQuery.toLowerCase()
        // Text messages
        if (msg.text && msg.text.toLowerCase().includes(query)) {
          return true
        }
        // File names
        if (msg.file?.fileName && msg.file.fileName.toLowerCase().includes(query)) {
          return true
        }
        // Voice note transcripts
        if (msg.type === 'voice' && msg.transcriptionStatus === 'completed' && msg.transcriptText) {
          if (msg.transcriptText.toLowerCase().includes(query)) {
            return true
          }
        }
        return false
      })
    : visibleMessages.filter(msg => !isDeletedForMe(msg.id) && !isMessageCleared(msg) && !isMessageHiddenFromMain(msg.id))

  if (loading) {
    return <div className="message-list loading">Loading messages...</div>
  }

  if (error) {
    return <div className="message-list error">{error}</div>
  }

  return (
    <div className={`message-list ${selectionMode ? 'selection-mode' : ''}`} ref={messageListRef}>
      <div ref={messagesStartRef} />

      {/* Selection mode bar */}
      {selectionMode && (
        <div className="selection-bar">
          <button className="selection-bar-cancel" onClick={exitSelectionMode}>
            ✕
          </button>
          <span className="selection-bar-count">
            {selectedMessages.size} selected
          </span>
          <button
            className="selection-bar-export"
            onClick={handleExportSelected}
            disabled={selectedMessages.size === 0}
          >
            📤 Export
          </button>
          <button
            className="selection-bar-delete"
            onClick={() => setShowDeleteModal(true)}
            disabled={selectedMessages.size === 0 || bulkDeleting}
          >
            🗑 Delete
          </button>
        </div>
      )}

      {/* Floating scroll buttons */}
      {showScrollTop && (
        <button
          className="scroll-fab scroll-fab-top"
          onClick={scrollToTop}
          aria-label="Go to first message"
        >
          ↑
        </button>
      )}
      {showScrollBottom && !newMessagesCount && (
        <button
          className="scroll-fab scroll-fab-bottom"
          onClick={scrollToBottom}
          aria-label="Go to latest message"
        >
          ↓
        </button>
      )}
      {newMessagesCount > 0 && (
        <button
          className="new-messages-indicator"
          onClick={scrollToFirstUnread}
          aria-label={`${newMessagesCount} new ${newMessagesCount === 1 ? 'message' : 'messages'}`}
        >
          {newMessagesCount} new {newMessagesCount === 1 ? 'message' : 'messages'} ↓
        </button>
      )}

      {pinnedMessages.length > 0 && (
        <div className="pinned-panel">
          <button
            className="pinned-toggle"
            onClick={() => setShowPinnedPanel(!showPinnedPanel)}
          >
            📌 {pinnedMessages.length} pinned {pinnedMessages.length === 1 ? 'message' : 'messages'}
            <span className="pinned-chevron">{showPinnedPanel ? '▲' : '▼'}</span>
          </button>
          {showPinnedPanel && (
            <div className="pinned-list">
              {pinnedMessages.map((pinned) => (
                <div key={pinned.id} className="pinned-item">
                  <span className="pinned-preview">{pinned.textPreview}</span>
                  <button
                    className="pinned-unpin"
                    onClick={() => deleteDoc(doc(db, 'chats', chatId, 'pinnedMessages', pinned.id))}
                    title="Unpin"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {messages.length === 0 ? (
        <div className="no-messages">No messages yet. Say hello!</div>
      ) : filteredMessages.length === 0 ? (
        <div className="no-messages">No matching messages</div>
      ) : (
        filteredMessages.map((message) => {
          const isOwn = message.senderId === currentUser.uid
          const replyTo = message.replyTo
          const isReplyToOwn = replyTo?.senderId === currentUser.uid
          const isFileMessage = message.type === 'file'
          const isVideoMessage = message.type === 'video'
          const isVoiceMessage = message.type === 'voice'
          const isSpecialMessage = message.type === 'special'
          const isRevealMessage = message.type === 'reveal'
          const hasHeartEmoji = message.text && /[\u2764\u2765\u2763\u{1F493}-\u{1F49F}\u{1FA75}-\u{1FA77}\u{1F90D}\u{1F90E}\u{1F9E1}\u{2764}\u{1FAC0}]/u.test(message.text)
          const isLoveIntent = message.messageIntent === 'love'
          const isLoveStyle = (hasHeartEmoji || isLoveIntent) && !isSpecialMessage && !isRevealMessage
          const isTextMessage = message.type === 'text' || (!isFileMessage && !isVideoMessage && !isVoiceMessage && !isSpecialMessage && !isRevealMessage)
          const emojiOnly = isTextMessage && isEmojiOnlyMessage(message.text)

          const isSelected = selectedMessages.has(message.id)
          const isFirstUnread = firstUnreadId === message.id

          // Message intent classes for attention effects
          const intent = message.messageIntent
          const intentClass = intent && intent !== 'normal' && intent !== 'love'
            ? `message--${intent.replace('_', '-')}`
            : ''
          // Check if message is unread (from other user, after my last read)
          const isUnreadFromOther = !isOwn && myLastReadAtOnMount && message.createdAt &&
            message.createdAt.toMillis?.() > (myLastReadAtOnMount.toMillis?.() || 0)
          const unreadClass = isUnreadFromOther && intentClass ? 'message--unread' : ''

          return (
            <React.Fragment key={message.id}>
              {isFirstUnread && (
                <div className="unread-divider">
                  <span className="unread-divider-text">New messages</span>
                </div>
              )}
              <div
              ref={(el) => { if (el) messageRefs.current[message.id] = el }}
              className={`message ${isOwn ? 'own' : 'other'} ${isFileMessage ? 'file-message' : ''} ${isVideoMessage ? 'video-message' : ''} ${isVoiceMessage ? 'voice-message' : ''} ${isSpecialMessage ? `special-message special-${message.specialType}` : ''} ${isRevealMessage ? `reveal-message-wrapper reveal-kind-${message.revealKind || 'secret'}` : ''} ${highlightedMessageId === message.id ? 'highlighted' : ''} ${intenseLoveAnimation === message.id ? 'intense-love-animation' : ''} ${isLoveStyle ? 'message--love' : ''} ${emojiOnly ? 'message--emoji-only' : ''} ${isSelected ? 'selected' : ''} ${intentClass} ${unreadClass}`}
              onClick={selectionMode ? () => toggleMessageSelection(message) : undefined}
            >
              {/* Selection checkbox */}
              {selectionMode && (
                <label className="message-checkbox" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMessageSelection(message)}
                  />
                  <span className="message-checkbox-mark" />
                </label>
              )}

              {/* Floating toolbar - visible on hover/focus (desktop) */}
              {!selectionMode && (
              <div className="message-toolbar" role="toolbar" aria-label="Message actions">
                <button
                  className="toolbar-btn"
                  onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                  aria-label="Add reaction"
                >
                  😊
                </button>
                <button
                  className="toolbar-btn"
                  onClick={() => handleReply(message)}
                  aria-label="Reply to message"
                >
                  ↩
                </button>
                <button
                  className="toolbar-btn"
                  onClick={() => handlePin(message)}
                  aria-label={isMessagePinned(message.id) ? 'Unpin message' : 'Pin message'}
                >
                  {isMessagePinned(message.id) ? '📌' : '📍'}
                </button>
                <button
                  className="toolbar-btn"
                  onClick={() => setShowMoreMenu(showMoreMenu === message.id ? null : message.id)}
                  aria-label="More actions"
                >
                  ⋯
                </button>
              </div>
              )}

              {/* Mobile more button - always visible on touch devices */}
              {!selectionMode && (
              <button
                className="mobile-more-btn"
                onClick={() => setMobileActionSheet({ message, isOwn, isFileMessage, isVideoMessage, isVoiceMessage })}
                aria-label="Message actions"
              >
                ⋯
              </button>
              )}

              {replyTo && (
                <div
                  className="reply-quote reply-quote-clickable"
                  onClick={() => scrollToMessage(replyTo.messageId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') scrollToMessage(replyTo.messageId) }}
                >
                  {replyTo.fileInfo && (
                    <ReplyQuoteThumbnail chatId={chatId} fileInfo={replyTo.fileInfo} />
                  )}
                  <div className="reply-quote-content">
                    <span className="reply-quote-label">
                      {isReplyToOwn ? 'You' : 'Friend'}
                    </span>
                    <span className="reply-quote-text">{replyTo.textPreview}</span>
                  </div>
                  {replyNotFoundId === replyTo.messageId && (
                    <span className="reply-not-found">Original message is not loaded.</span>
                  )}
                </div>
              )}
              {message.thoughtRef && (
                <div
                  className="thought-ref-card"
                  onClick={() => onViewThought?.(message.thoughtRef.thoughtId, message.thoughtRef.blockId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onViewThought?.(message.thoughtRef.thoughtId, message.thoughtRef.blockId) }}
                >
                  <span className="thought-ref-icon">💭</span>
                  <div className="thought-ref-content">
                    <span className="thought-ref-label">Reply to Thought</span>
                    <span className="thought-ref-quote">{message.thoughtRef.quote}</span>
                  </div>
                </div>
              )}
              <div className="message-header">
                <span className="message-sender">{message.senderPhone}</span>
              </div>
              {showMoreMenu === message.id && (
                <div className="more-menu" role="menu">
                  {isOwn && !isFileMessage && !isVoiceMessage && (
                    <button role="menuitem" onClick={() => { setShowMoreMenu(null); handleEdit(message) }}>
                      ✎ Edit
                    </button>
                  )}
                  {isOwn && (
                    <button role="menuitem" onClick={() => { setShowMoreMenu(null); handleDelete(message) }} disabled={deletingId === message.id}>
                      🗑 Delete
                    </button>
                  )}
                  <button role="menuitem" onClick={() => handleCopyMessage(message)}>
                    📋 Copy
                  </button>
                  {isMediaMessage(message) && !isDeletedForMe(message.id) && (
                    <button role="menuitem" onClick={() => handleDeleteMediaForMe(message)}>
                      🗑 Delete for me
                    </button>
                  )}
                  <div className="more-menu-divider" />
                  <button role="menuitem" onClick={() => openConvertModal(message, 'reminder')}>
                    ⏰ Save as Reminder
                  </button>
                  <button role="menuitem" onClick={() => openConvertModal(message, 'decision')}>
                    ⚖️ Save as Decision
                  </button>
                  <button role="menuitem" onClick={() => openConvertModal(message, 'memory')}>
                    💭 Save to Memories
                  </button>
                  <button role="menuitem" onClick={() => openConvertModal(message, 'promise')}>
                    🤝 Track as Promise
                  </button>
                  <div className="more-menu-divider" />
                  <button role="menuitem" onClick={() => {
                    setShowMoreMenu(null)
                    setShowReceiptPicker(showReceiptPicker === message.id ? null : message.id)
                  }}>
                    💌 Send Receipt
                  </button>
                  {capsules.length > 0 && (
                    <button role="menuitem" onClick={() => {
                      setShowMoreMenu(null)
                      setShowCapsulePicker(showCapsulePicker === message.id ? null : message.id)
                    }}>
                      📦 Add to Capsule
                    </button>
                  )}
                  <button role="menuitem" onClick={() => {
                    setShowMoreMenu(null)
                    setShowAiTaskExtract(showAiTaskExtract === message.id ? null : message.id)
                  }}>
                    ✨ AI Extract Tasks
                  </button>
                  <div className="more-menu-divider" />
                  <button role="menuitem" onClick={() => enterSelectionMode(message)}>
                    ☑ Select
                  </button>
                </div>
              )}
              {showAiTaskExtract === message.id && (
                <MessageToTaskAiAction
                  currentUser={currentUser}
                  chatId={chatId}
                  message={message}
                  onClose={() => setShowAiTaskExtract(null)}
                />
              )}
              {showCapsulePicker === message.id && (
                <div className="capsule-picker">
                  {capsules.map((capsule) => (
                    <button
                      key={capsule.id}
                      className="capsule-option"
                      onClick={() => handleAddToCapsule(message, capsule.id)}
                      disabled={addingToCapsule}
                      style={{ borderLeftColor: capsule.color }}
                    >
                      {capsule.title}
                    </button>
                  ))}
                </div>
              )}
              {showReceiptPicker === message.id && (
                <div className="receipt-picker">
                  {EMOTIONAL_RECEIPTS.map((receipt) => (
                    <button
                      key={receipt.value}
                      className="receipt-option"
                      onClick={() => handleEmotionalReceipt(message.id, receipt.value)}
                    >
                      {receipt.label}
                    </button>
                  ))}
                </div>
              )}
              {showReactionPicker === message.id && (
                <div className="reaction-picker">
                  {ALLOWED_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      className={`reaction-option ${emoji === INTENSE_LOVE_EMOJI ? 'intense-love' : ''}`}
                      onClick={() => handleReaction(message.id, emoji)}
                      aria-label={emoji === INTENSE_LOVE_EMOJI ? 'Intense love' : undefined}
                      title={emoji === INTENSE_LOVE_EMOJI ? 'Intense love' : undefined}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    className="reaction-option reaction-more-btn"
                    onClick={() => openCustomEmoji(message.id)}
                    title="More emojis"
                  >
                    +
                  </button>
                </div>
              )}
              {customEmojiInput === message.id && (
                <div className="custom-emoji-picker">
                  <input
                    ref={emojiInputRef}
                    type="text"
                    className="custom-emoji-field"
                    value={customEmoji}
                    onChange={(e) => { setCustomEmoji(e.target.value); setEmojiError('') }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitCustomEmoji(message.id)
                      if (e.key === 'Escape') { setCustomEmojiInput(null); setCustomEmoji(''); setEmojiError('') }
                    }}
                    placeholder="😀"
                    maxLength={8}
                  />
                  <button className="custom-emoji-ok" onClick={() => submitCustomEmoji(message.id)}>✓</button>
                  <button className="custom-emoji-close" onClick={() => { setCustomEmojiInput(null); setCustomEmoji(''); setEmojiError('') }}>✕</button>
                  {emojiError && <span className="custom-emoji-error">{emojiError}</span>}
                </div>
              )}
              {isDeletedForMe(message.id) ? (
                <div className="deleted-message-placeholder">
                  <span className="deleted-message-icon">🗑</span>
                  <span className="deleted-message-text">Message hidden from your view</span>
                  <button
                    className="deleted-message-undo"
                    onClick={(e) => { e.stopPropagation(); handleUndoDeleteForMe(message.id) }}
                  >
                    Undo
                  </button>
                </div>
              ) : isSpecialMessage ? (
                renderSpecialMessage(message)
              ) : isRevealMessage ? (
                renderRevealMessage(message)
              ) : (isFileMessage || isVideoMessage) ? (
                <SecureFileContent
                  chatId={chatId}
                  file={message.file}
                  onImageClick={(url, fileName) => setImagePreview({ url, fileName, messageId: message.id })}
                />
              ) : isVoiceMessage ? (
                <SecureVoiceContent
                  chatId={chatId}
                  voice={message.voice}
                  messageId={message.id}
                  transcriptionStatus={message.transcriptionStatus}
                  transcriptText={message.transcriptText}
                  transcriptErrorCode={message.transcriptErrorCode}
                  currentUserId={currentUser?.uid}
                />
              ) : editingId === message.id ? (
                <div className="edit-container">
                  <input
                    type="text"
                    className="edit-input"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSubmit(message)
                      if (e.key === 'Escape') handleEditCancel()
                    }}
                    maxLength={2000}
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button className="edit-save-btn" onClick={() => handleEditSubmit(message)}>Save</button>
                    <button className="edit-cancel-btn" onClick={handleEditCancel}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {message.messageIntent && message.messageIntent !== 'normal' && message.messageIntent !== 'love' && (
                    <div className={`message-intent-badge ${message.messageIntent}`}>
                      {MESSAGE_INTENTS.find(i => i.value === message.messageIntent)?.icon}
                      {' '}
                      {MESSAGE_INTENTS.find(i => i.value === message.messageIntent)?.label}
                    </div>
                  )}
                  <div className="message-text">{linkifyText(message.text)}</div>
                  {message.edited && (
                    <span
                      className="edited-label"
                      onClick={() => handleViewEditHistory(message.id)}
                      title="View edit history"
                    >
                      edited
                    </span>
                  )}
                </>
              )}
              {(isSaved(message.id) || hasReminder(message.id)) && (
                <div className="message-indicators">
                  {isSaved(message.id) && <span className="message-indicator saved" title="Saved to Heart">❤️</span>}
                  {hasReminder(message.id) && <span className="message-indicator reminder" title="Reply reminder set">⏰</span>}
                </div>
              )}
              {renderReactions(message.id)}
              {renderEmotionalReceipts(message.id)}
              <div className="message-time">
                {formatTime(message.createdAt)}
                {isOwn && message.createdAt && friendLastReadAt && (
                  friendLastReadAt.toMillis?.() >= message.createdAt.toMillis?.() && (
                    <span className="read-indicator"> ✓✓</span>
                  )
                )}
              </div>
            </div>
            </React.Fragment>
          )
        })
      )}
      <div ref={messagesEndRef} />
      {convertModal && (
        <div className="convert-modal-overlay" onClick={closeConvertModal}>
          <div className="convert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="convert-modal-header">
              <h3>
                Save as {convertModal.type.charAt(0).toUpperCase() + convertModal.type.slice(1)}
              </h3>
              <button className="convert-modal-close" onClick={closeConvertModal}>×</button>
            </div>
            {convertError && <div className="convert-error">{convertError}</div>}
            <div className="convert-modal-body">
              <label>Title</label>
              <input
                type="text"
                value={convertTitle}
                onChange={(e) => setConvertTitle(e.target.value)}
                maxLength={200}
                className="convert-input"
                autoFocus
              />
              {convertModal.type !== 'decision' && (
                <>
                  <label>{convertModal.type === 'memory' ? 'Description' : 'Notes'}</label>
                  <textarea
                    value={convertBody}
                    onChange={(e) => setConvertBody(e.target.value)}
                    className="convert-textarea"
                    rows={3}
                  />
                </>
              )}
              {convertModal.type === 'promise' && (
                <>
                  <label>Who made this promise?</label>
                  <select
                    value={convertOwner}
                    onChange={(e) => setConvertOwner(e.target.value)}
                    className="convert-select"
                  >
                    <option value={currentUser.uid}>I promised</option>
                    {chatMembers.filter(m => m !== currentUser.uid).map(uid => (
                      <option key={uid} value={uid}>Friend promised</option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <div className="convert-modal-actions">
              <button
                className="convert-cancel-btn"
                onClick={closeConvertModal}
                disabled={converting}
              >
                Cancel
              </button>
              <button
                className="convert-save-btn"
                onClick={handleConvert}
                disabled={converting}
              >
                {converting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Action Sheet */}
      {mobileActionSheet && (
        <div className="action-sheet-overlay" onClick={closeMobileActionSheet}>
          <div className="action-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Message actions">
            <div className="action-sheet-header">
              <span>Message Actions</span>
              <button className="action-sheet-close" onClick={closeMobileActionSheet} aria-label="Close">×</button>
            </div>
            <div className="action-sheet-content">
              {/* Quick Reactions */}
              <div className="action-sheet-emoji-row">
                {ALLOWED_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    className={`action-sheet-emoji ${emoji === INTENSE_LOVE_EMOJI ? 'intense-love' : ''}`}
                    onClick={() => handleReaction(mobileActionSheet.message.id, emoji)}
                    aria-label={emoji === INTENSE_LOVE_EMOJI ? 'Intense love' : undefined}
                    title={emoji === INTENSE_LOVE_EMOJI ? 'Intense love' : undefined}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  className="action-sheet-emoji action-sheet-emoji-more"
                  onClick={() => { closeMobileActionSheet(); openCustomEmoji(mobileActionSheet.message.id) }}
                >
                  +
                </button>
              </div>
              <div className="action-sheet-divider" />
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); handleReply(mobileActionSheet.message) }}>
                ↩ Reply
              </button>
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); handlePin(mobileActionSheet.message) }}>
                {isMessagePinned(mobileActionSheet.message.id) ? '📌 Unpin' : '📍 Pin'}
              </button>
              <button className="action-sheet-btn" onClick={() => handleCopyMessage(mobileActionSheet.message)}>
                📋 Copy
              </button>
              {mobileActionSheet.isOwn && !mobileActionSheet.isFileMessage && !mobileActionSheet.isVoiceMessage && (
                <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); handleEdit(mobileActionSheet.message) }}>
                  ✎ Edit
                </button>
              )}
              {mobileActionSheet.isOwn && (
                <button className="action-sheet-btn action-sheet-btn-danger" onClick={() => { closeMobileActionSheet(); handleDelete(mobileActionSheet.message) }}>
                  🗑 Delete
                </button>
              )}
              {isMediaMessage(mobileActionSheet.message) && !isDeletedForMe(mobileActionSheet.message.id) && (
                <button className="action-sheet-btn" onClick={() => handleDeleteMediaForMe(mobileActionSheet.message)}>
                  🗑 Delete for me
                </button>
              )}
              <div className="action-sheet-divider" />
              <button className="action-sheet-btn" onClick={() => handleSaveToHeart(mobileActionSheet.message.id)}>
                {isSaved(mobileActionSheet.message.id) ? '💔 Remove from Saved' : '❤️ Save to Heart'}
              </button>
              {hasReminder(mobileActionSheet.message.id) ? (
                <button className="action-sheet-btn" onClick={() => handleCancelReminder(mobileActionSheet.message.id)}>
                  🔕 Cancel Reminder
                </button>
              ) : (
                <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); setShowReminderPicker(mobileActionSheet.message.id) }}>
                  ⏰ Reply Later
                </button>
              )}
              {!mobileActionSheet.isOwn && (
                <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); setShowHurtModal(mobileActionSheet.message) }}>
                  💔 This hurt me
                </button>
              )}
              <div className="action-sheet-divider" />
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); openConvertModal(mobileActionSheet.message, 'reminder') }}>
                ⏰ Save as Reminder
              </button>
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); openConvertModal(mobileActionSheet.message, 'decision') }}>
                ⚖️ Save as Decision
              </button>
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); openConvertModal(mobileActionSheet.message, 'memory') }}>
                💭 Save to Memories
              </button>
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); openConvertModal(mobileActionSheet.message, 'promise') }}>
                🤝 Track as Promise
              </button>
              <div className="action-sheet-divider" />
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); setShowReceiptPicker(mobileActionSheet.message.id) }}>
                💌 Send Receipt
              </button>
              {capsules.length > 0 && (
                <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); setShowCapsulePicker(mobileActionSheet.message.id) }}>
                  📦 Add to Capsule
                </button>
              )}
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); setShowAiTaskExtract(mobileActionSheet.message.id) }}>
                ✨ AI Extract Tasks
              </button>
              <div className="action-sheet-divider" />
              <button className="action-sheet-btn" onClick={() => { closeMobileActionSheet(); enterSelectionMode(mobileActionSheet.message) }}>
                ☑ Select
              </button>
            </div>
            <button className="action-sheet-cancel" onClick={closeMobileActionSheet}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {imagePreview && (
        <ZoomableImagePreview
          imageUrl={imagePreview.url}
          alt={imagePreview.fileName || 'Image preview'}
          onClose={() => setImagePreview(null)}
          showActions={false}
        />
      )}

      {/* Bulk delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content bulk-delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete {selectedMessages.size} {selectedMessages.size === 1 ? 'message' : 'messages'}?</h3>
            <p className="modal-body">
              Choose how you want to delete the selected messages.
            </p>
            <div className="bulk-delete-options">
              <button
                className="bulk-delete-option"
                onClick={() => handleBulkDelete('for_me')}
                disabled={bulkDeleting}
              >
                <span className="bulk-delete-option-icon">🙈</span>
                <span className="bulk-delete-option-text">
                  <strong>Delete for me</strong>
                  <small>Messages will be hidden from your view only</small>
                </span>
              </button>
              {canDeleteSelectedForEveryone() && (
                <button
                  className="bulk-delete-option bulk-delete-option-danger"
                  onClick={() => handleBulkDelete('for_everyone')}
                  disabled={bulkDeleting}
                >
                  <span className="bulk-delete-option-icon">🗑</span>
                  <span className="bulk-delete-option-text">
                    <strong>Delete for everyone</strong>
                    <small>Messages will be permanently deleted</small>
                  </span>
                </button>
              )}
            </div>
            <button
              className="modal-cancel-btn"
              onClick={() => setShowDeleteModal(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </button>
            {bulkDeleting && (
              <div className="bulk-delete-progress">Deleting...</div>
            )}
          </div>
        </div>
      )}

      {/* Reminder Picker Modal */}
      {showReminderPicker && (
        <div className="modal-overlay" onClick={() => setShowReminderPicker(null)}>
          <div className="modal-content reminder-picker-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Reply Later</h3>
            <p className="modal-body">When should we remind you?</p>
            <div className="reminder-options">
              <button className="reminder-option" onClick={() => handleReminderOption(showReminderPicker, 'later_today')}>
                <span className="reminder-option-icon">🕐</span>
                <span>Later today</span>
              </button>
              <button className="reminder-option" onClick={() => handleReminderOption(showReminderPicker, 'tonight')}>
                <span className="reminder-option-icon">🌙</span>
                <span>Tonight</span>
              </button>
              <button className="reminder-option" onClick={() => handleReminderOption(showReminderPicker, 'tomorrow')}>
                <span className="reminder-option-icon">☀️</span>
                <span>Tomorrow</span>
              </button>
            </div>
            <button className="modal-cancel-btn" onClick={() => setShowReminderPicker(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* This Hurt Me Modal */}
      {showHurtModal && (
        <div className="modal-overlay" onClick={() => setShowHurtModal(null)}>
          <div className="modal-content hurt-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">This hurt me</h3>
            <p className="modal-body">Take a moment. What would feel right?</p>
            <div className="hurt-options">
              <button className="hurt-option" onClick={() => handleHurtAction('hide', showHurtModal)}>
                <span className="hurt-option-icon">🙈</span>
                <span className="hurt-option-text">
                  <strong>Hide from my view</strong>
                  <small>Remove from your chat only</small>
                </span>
              </button>
              <button className="hurt-option" onClick={() => handleHurtAction('reply_gently', showHurtModal)}>
                <span className="hurt-option-icon">💬</span>
                <span className="hurt-option-text">
                  <strong>Reply gently</strong>
                  <small>Open composer to respond</small>
                </span>
              </button>
              <button className="hurt-option" onClick={() => handleHurtAction('talk', showHurtModal)}>
                <span className="hurt-option-icon">🤝</span>
                <span className="hurt-option-text">
                  <strong>Talk about this</strong>
                  <small>"Can we talk about this?"</small>
                </span>
              </button>
            </div>
            <button className="modal-cancel-btn" onClick={() => setShowHurtModal(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit History Modal */}
      {showEditHistory && (
        <div className="modal-overlay" onClick={() => { setShowEditHistory(null); setEditHistory([]) }}>
          <div className="modal-content edit-history-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit History</h3>
            <div className="edit-history-content">
              {loadingEditHistory ? (
                <div className="edit-history-loading">Loading...</div>
              ) : editHistory.length === 0 ? (
                <div className="edit-history-empty">No history available</div>
              ) : (
                editHistory.map((entry) => (
                  <div key={entry.id} className="edit-history-item">
                    <div className="edit-history-text">{entry.previousText}</div>
                    <div className="edit-history-time">
                      {entry.editedAt?.toDate?.().toLocaleString() || 'Unknown time'}
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="modal-cancel-btn" onClick={() => { setShowEditHistory(null); setEditHistory([]) }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Saved Messages Panel */}
      {showSavedMessages && (
        <div className="modal-overlay" onClick={() => setShowSavedMessages(false)}>
          <div className="modal-content saved-messages-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">❤️ Saved Messages</h3>
            <div className="saved-messages-content">
              {savedMessagesList.length === 0 ? (
                <div className="saved-messages-empty">
                  <p>No saved messages yet.</p>
                  <p>Tap "Save to Heart" on any message to save it here.</p>
                </div>
              ) : (
                savedMessagesList.map((saved) => {
                  const message = messages.find(m => m.id === saved.messageId)
                  return (
                    <div key={saved.id} className="saved-message-item">
                      {message ? (
                        <>
                          <div className="saved-message-text">{truncateText(message.text, 150)}</div>
                          <div className="saved-message-actions">
                            <button
                              className="saved-message-view"
                              onClick={() => {
                                setShowSavedMessages(false)
                                if (messageRefs.current[message.id]) {
                                  messageRefs.current[message.id].scrollIntoView({ behavior: 'smooth', block: 'center' })
                                  setHighlightedMessageId(message.id)
                                  setTimeout(() => setHighlightedMessageId(null), 2000)
                                }
                              }}
                            >
                              View in chat
                            </button>
                            <button
                              className="saved-message-remove"
                              onClick={() => toggleSave(saved.messageId)}
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="saved-message-unavailable">Message no longer available</div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <button className="modal-cancel-btn" onClick={() => setShowSavedMessages(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageList
