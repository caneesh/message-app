import { useState, useEffect, useRef } from 'react'
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
const ALLOWED_REACTIONS = ['👍', '❤️', '❤️‍🔥', '😂', '😮', '😢', '🙏']
const INTENSE_LOVE_EMOJI = '❤️‍🔥'
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
  const [showPinnedPanel, setShowPinnedPanel] = useState(false)
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
  const {
    isDeletedForMe,
    deleteForMe,
    undoDelete
  } = useDeletedMediaForMe(chatId, currentUser?.uid)
  const messagesEndRef = useRef(null)
  const messagesStartRef = useRef(null)
  const messageListRef = useRef(null)
  const messageRefs = useRef({})
  const emojiInputRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle scroll position to show/hide floating buttons
  useEffect(() => {
    const container = messageListRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromTop = scrollTop
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Show "go to top" button when scrolled down more than 200px
      setShowScrollTop(distanceFromTop > 200)
      // Show "go to bottom" button when scrolled up more than 200px from bottom
      setShowScrollBottom(distanceFromBottom > 200)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial position

    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages])

  const scrollToTop = () => {
    messagesStartRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle external scroll-to-message request (from SharedMedia)
  useEffect(() => {
    if (scrollToMessageId && messageRefs.current[scrollToMessageId]) {
      const element = messageRefs.current[scrollToMessageId]
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMessageId(scrollToMessageId)
      setTimeout(() => {
        setHighlightedMessageId(null)
        if (onScrollComplete) onScrollComplete()
      }, 2000)
    } else if (scrollToMessageId && onScrollComplete) {
      // Message not found in current loaded messages
      setTimeout(() => onScrollComplete(), 100)
    }
  }, [scrollToMessageId, onScrollComplete])

  // Subscribe to chat document for lastReadAt
  useEffect(() => {
    const chatRef = doc(db, 'chats', chatId)
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const lastReadAt = data.lastReadAt || {}
        // Find friend's lastReadAt (the other user)
        const friendUid = Object.keys(lastReadAt).find((uid) => uid !== currentUser.uid)
        if (friendUid && lastReadAt[friendUid]) {
          setFriendLastReadAt(lastReadAt[friendUid])
        }
      }
    })
    return unsubscribe
  }, [chatId, currentUser.uid])

  // Update own lastReadAt when viewing chat
  useEffect(() => {
    const updateLastReadAt = async () => {
      try {
        const chatRef = doc(db, 'chats', chatId)
        const chatSnap = await getDoc(chatRef)
        if (chatSnap.exists()) {
          const currentLastReadAt = chatSnap.data().lastReadAt || {}
          await updateDoc(chatRef, {
            lastReadAt: {
              ...currentLastReadAt,
              [currentUser.uid]: serverTimestamp(),
            },
          })
        }
      } catch (err) {
        console.error('Error updating lastReadAt:', err)
      }
    }
    updateLastReadAt()
  }, [chatId, currentUser.uid, messages])

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
      previewText = `📎 ${message.file.fileName}`
      if (['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'].includes(message.file.contentType)) {
        fileInfo = {
          storagePath: message.file.storagePath,
          contentType: message.file.contentType,
          type: 'image'
        }
      }
    } else if (message.type === 'video' && message.file) {
      previewText = `🎬 ${message.file.fileName}`
      fileInfo = {
        storagePath: message.file.storagePath,
        contentType: message.file.contentType,
        type: 'video'
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

  const closeMobileActionSheet = () => {
    setMobileActionSheet(null)
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

  // Filter messages by search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter((msg) => {
        const query = searchQuery.toLowerCase()
        if (msg.type === 'text' && msg.text) {
          return msg.text.toLowerCase().includes(query)
        }
        if (msg.type === 'file' && msg.file?.fileName) {
          return msg.file.fileName.toLowerCase().includes(query)
        }
        return false
      })
    : messages

  if (loading) {
    return <div className="message-list loading">Loading messages...</div>
  }

  if (error) {
    return <div className="message-list error">{error}</div>
  }

  return (
    <div className="message-list" ref={messageListRef}>
      <div ref={messagesStartRef} />

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
      {showScrollBottom && (
        <button
          className="scroll-fab scroll-fab-bottom"
          onClick={scrollToBottom}
          aria-label="Go to latest message"
        >
          ↓
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
          const hasHeartEmoji = message.text && /[\u2764\u2765\u2763\u{1F493}-\u{1F49F}\u{1FA75}-\u{1FA77}\u{1F90D}\u{1F90E}\u{1F9E1}\u{2764}\u{1FAC0}]/u.test(message.text)
          const isLoveStyle = hasHeartEmoji && !isSpecialMessage
          const isTextMessage = message.type === 'text' || (!isFileMessage && !isVideoMessage && !isVoiceMessage && !isSpecialMessage)
          const emojiOnly = isTextMessage && isEmojiOnlyMessage(message.text)

          return (
            <div
              key={message.id}
              ref={(el) => { if (el) messageRefs.current[message.id] = el }}
              className={`message ${isOwn ? 'own' : 'other'} ${isFileMessage ? 'file-message' : ''} ${isVideoMessage ? 'video-message' : ''} ${isVoiceMessage ? 'voice-message' : ''} ${isSpecialMessage ? `special-message special-${message.specialType}` : ''} ${highlightedMessageId === message.id ? 'highlighted' : ''} ${intenseLoveAnimation === message.id ? 'intense-love-animation' : ''} ${isLoveStyle ? 'message--love' : ''} ${emojiOnly ? 'message--emoji-only' : ''}`}
            >
              {/* Floating toolbar - visible on hover/focus (desktop) */}
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

              {/* Mobile more button - always visible on touch devices */}
              <button
                className="mobile-more-btn"
                onClick={() => setMobileActionSheet({ message, isOwn, isFileMessage, isVideoMessage, isVoiceMessage })}
                aria-label="Message actions"
              >
                ⋯
              </button>

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
              {isSpecialMessage ? (
                renderSpecialMessage(message)
              ) : (isFileMessage || isVideoMessage) ? (
                isMediaMessage(message) && isDeletedForMe(message.id) ? (
                  <div className="deleted-image-placeholder">
                    <span className="deleted-image-icon">🗑</span>
                    <span className="deleted-image-text">Media deleted from your view</span>
                    <button
                      className="deleted-image-undo"
                      onClick={() => handleUndoDeleteForMe(message.id)}
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <SecureFileContent
                    chatId={chatId}
                    file={message.file}
                    onImageClick={(url, fileName) => setImagePreview({ url, fileName, messageId: message.id })}
                  />
                )
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
                  <div className="message-text">{linkifyText(message.text)}</div>
                  {message.edited && <span className="edited-label">edited</span>}
                </>
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
    </div>
  )
}

export default MessageList
