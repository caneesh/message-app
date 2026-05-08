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
} from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import MessageToTaskAiAction from './MessageToTaskAiAction'

const PREVIEW_MAX_LENGTH = 80
const MESSAGE_LIMIT = 100
const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
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

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function isImageType(contentType) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'].includes(contentType)
}

function MessageList({ currentUser, chatId, onReply, searchQuery = '' }) {
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
  const messagesEndRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limitToLast(MESSAGE_LIMIT))

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
  }, [chatId])

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
    const previewText = message.type === 'file' && message.file
      ? `📎 ${message.file.fileName}`
      : message.text
    onReply({
      messageId: message.id,
      senderId: message.senderId,
      textPreview: truncateText(previewText),
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
        const textPreview = message.type === 'file' && message.file
          ? `📎 ${message.file.fileName}`
          : truncateText(message.text)
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
      }
    } catch (err) {
      console.error('Reaction error:', err)
    }
  }

  const openConvertModal = (message, type) => {
    setShowMoreMenu(null)
    const textContent = message.type === 'file' && message.file
      ? `📎 ${message.file.fileName}`
      : message.text || ''

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

    const textContent = message.type === 'file' && message.file
      ? `📎 ${message.file.fileName}`
      : message.text || ''

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
        {Object.entries(grouped).map(([emoji, uids]) => (
          <span
            key={emoji}
            className={`reaction-chip ${uids.includes(currentUser.uid) ? 'own' : ''}`}
            onClick={() => handleReaction(messageId, emoji)}
          >
            {emoji} {uids.length > 1 && uids.length}
          </span>
        ))}
      </div>
    )
  }

  const renderFileContent = (file) => {
    if (!file || !file.url) {
      return <div className="file-loading">Loading file...</div>
    }

    if (isImageType(file.contentType)) {
      return (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-image-link">
          <img src={file.url} alt={file.fileName} className="file-image" />
        </a>
      )
    }

    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-card">
        <span className="file-icon">
          {file.contentType === 'application/pdf' ? '📄' : '📝'}
        </span>
        <div className="file-info">
          <span className="file-name">{file.fileName}</span>
          <span className="file-size">{formatFileSize(file.size)}</span>
        </div>
      </a>
    )
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
    <div className="message-list">
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

          return (
            <div
              key={message.id}
              className={`message ${isOwn ? 'own' : 'other'} ${isFileMessage ? 'file-message' : ''}`}
            >
              {replyTo && (
                <div className="reply-quote">
                  <span className="reply-quote-label">
                    {isReplyToOwn ? 'You' : 'Friend'}
                  </span>
                  <span className="reply-quote-text">{replyTo.textPreview}</span>
                </div>
              )}
              <div className="message-header">
                <span className="message-sender">{message.senderPhone}</span>
                <div className="message-actions">
                  <button
                    className="react-btn"
                    onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                    title="React"
                  >
                    😊
                  </button>
                  <button
                    className="reply-btn"
                    onClick={() => handleReply(message)}
                    title="Reply"
                  >
                    ↩
                  </button>
                  <button
                    className="pin-btn"
                    onClick={() => handlePin(message)}
                    title={isMessagePinned(message.id) ? 'Unpin' : 'Pin'}
                  >
                    {isMessagePinned(message.id) ? '📌' : '📍'}
                  </button>
                  {isOwn && !isFileMessage && (
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(message)}
                      title="Edit message"
                    >
                      ✎
                    </button>
                  )}
                  {isOwn && (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(message)}
                      disabled={deletingId === message.id}
                      title="Delete message"
                    >
                      {deletingId === message.id ? '...' : '×'}
                    </button>
                  )}
                  <button
                    className="more-btn"
                    onClick={() => setShowMoreMenu(showMoreMenu === message.id ? null : message.id)}
                    title="More actions"
                  >
                    ⋯
                  </button>
                </div>
              </div>
              {showMoreMenu === message.id && (
                <div className="more-menu">
                  <button onClick={() => openConvertModal(message, 'reminder')}>
                    Save as Reminder
                  </button>
                  <button onClick={() => openConvertModal(message, 'decision')}>
                    Save as Decision
                  </button>
                  <button onClick={() => openConvertModal(message, 'memory')}>
                    Save to Memories
                  </button>
                  <button onClick={() => openConvertModal(message, 'promise')}>
                    Track as Promise
                  </button>
                  <button onClick={() => {
                    setShowMoreMenu(null)
                    setShowReceiptPicker(showReceiptPicker === message.id ? null : message.id)
                  }}>
                    Send Receipt
                  </button>
                  {capsules.length > 0 && (
                    <button onClick={() => {
                      setShowMoreMenu(null)
                      setShowCapsulePicker(showCapsulePicker === message.id ? null : message.id)
                    }}>
                      Add to Capsule
                    </button>
                  )}
                  <button onClick={() => {
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
                      className="reaction-option"
                      onClick={() => handleReaction(message.id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {isFileMessage ? (
                renderFileContent(message.file)
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
                  <div className="message-text">{message.text}</div>
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
    </div>
  )
}

export default MessageList
