import { useState, useRef, useEffect, useCallback } from 'react'
import { db, storage } from '../firebase/firebaseConfig'
import { collection, addDoc, doc, setDoc, deleteDoc, getDoc, query, where, orderBy, limit, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { ref, uploadBytesResumable } from 'firebase/storage'
import ToneRepairAiButton from './ToneRepairAiButton'
import VoiceRecorder from './VoiceRecorder'
import SpecialMessageComposer from './SpecialMessageComposer'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'

function ReplyThumbnail({ chatId, fileInfo }) {
  const { url, loading } = useSecureFileUrl(
    fileInfo?.storagePath ? chatId : null,
    fileInfo?.storagePath
  )

  if (!fileInfo || loading || !url) return null

  if (fileInfo.type === 'image') {
    return <img src={url} alt="" className="reply-thumbnail" />
  }

  if (fileInfo.type === 'video') {
    return (
      <div className="reply-thumbnail reply-thumbnail-video">
        <span className="reply-thumbnail-icon">🎬</span>
      </div>
    )
  }

  return null
}

const MAX_MESSAGE_LENGTH = 2000
const MAX_FILES_PER_MESSAGE = 10
const MAX_TOTAL_BUNDLE_SIZE = 100 * 1024 * 1024 // 100 MB
const LONG_MESSAGE_TEXT_FILE_THRESHOLD = 1200

const HARSH_PATTERNS = [
  { pattern: /why didn't you/gi, softer: "Just checking — were you able to" },
  { pattern: /you never/gi, softer: "I feel like I may not be getting through clearly about" },
  { pattern: /you always/gi, softer: "It sometimes feels like" },
  { pattern: /this is wrong/gi, softer: "I think there may be an issue here" },
  { pattern: /what's wrong with you/gi, softer: "I'm a bit confused about" },
  { pattern: /I can't believe you/gi, softer: "I was surprised when" },
  { pattern: /you should have/gi, softer: "It might have helped if" },
  { pattern: /you forgot/gi, softer: "Did you get a chance to remember" },
]

const softenMessage = (text) => {
  let softened = text
  let wasTransformed = false

  for (const { pattern, softer } of HARSH_PATTERNS) {
    if (pattern.test(softened)) {
      softened = softened.replace(pattern, softer)
      wasTransformed = true
    }
  }

  if (!wasTransformed) {
    const hasHarshIndicators =
      text === text.toUpperCase() && text.length > 3 ||
      (text.match(/!/g) || []).length >= 2 ||
      /\?{2,}/.test(text)

    if (hasHarshIndicators) {
      softened = "Hey, I wanted to say this gently: " + text.toLowerCase().replace(/!+/g, '.').replace(/\?{2,}/g, '?')
      wasTransformed = true
    }
  }

  if (!wasTransformed && text.length > 10) {
    softened = "Hey, " + text.charAt(0).toLowerCase() + text.slice(1)
    wasTransformed = true
  }

  return { softened, wasTransformed }
}

const STRESSED_MOODS = ['😟', '😴']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'application/pdf',
  'text/plain',
]
const VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
]
const ALL_ALLOWED_TYPES = [...ALLOWED_TYPES, ...VIDEO_TYPES]

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function getFileKind(contentType) {
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('audio/')) return 'audio'
  return 'document'
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const TYPING_TIMEOUT = 2000

const QUICK_ACTIONS = [
  { key: 'call_me', text: '📞 Call me', priority: false },
  { key: 'need_help', text: '🆘 I need help', priority: true },
  { key: 'reached_safely', text: '✅ Reached safely', priority: false },
  { key: 'running_late', text: '⏰ Running late', priority: false },
  { key: 'on_the_way', text: '🚗 On the way', priority: false },
  { key: 'busy_now', text: '🔇 Busy now', priority: false },
]

const EMOJI_LIST = [
  // Romantic & Love
  '❤️', '🥰', '😍', '😘', '💕', '💖', '💗', '💓',
  '💞', '💘', '💝', '❤️‍🔥', '💋', '😻', '🫶', '🤗',
  '🥺', '😊', '☺️', '🫠', '💑', '💏', '👩‍❤️‍👨', '💐',
  '🌹', '🌷', '🌸', '💮', '🏵️', '🌺', '🌻', '🌼',
  // Hearts
  '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
  '💟', '❣️', '💌', '♥️', '😽', '😚', '😙', '🫂',
  // Sweet expressions
  '😇', '🙂', '😉', '😌', '🤭', '😏', '✨', '🌟',
  '⭐', '🔥', '💫', '🎀', '🎁', '🍫', '🍰', '🧁',
]

const MESSAGE_INTENTS = [
  { value: 'normal', label: 'Normal', icon: '' },
  { value: 'important', label: 'Important', icon: '❗' },
  { value: 'need_reply', label: 'Needs reply', icon: '💬' },
  { value: 'urgent', label: 'Urgent', icon: '🔴' },
  { value: 'just_sharing', label: 'Just sharing', icon: '💭' },
  { value: 'sensitive', label: 'Sensitive', icon: '🤫' },
  { value: 'love', label: 'Love', icon: '💕' },
]

function MessageInput({ currentUser, chatId, activeReplyTo, clearReply, activeThoughtReply, clearThoughtReply }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showToneOptions, setShowToneOptions] = useState(false)
  const [toneSuggestion, setToneSuggestion] = useState(null)
  const [partnerMood, setPartnerMood] = useState(null)
  const [showMoodNudge, setShowMoodNudge] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const [showSpecialComposer, setShowSpecialComposer] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [messageIntent, setMessageIntent] = useState('normal')
  const [showIntentPicker, setShowIntentPicker] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([]) // Multi-file attachment queue
  const [uploadingBundle, setUploadingBundle] = useState(false)
  const [bundleUploadProgress, setBundleUploadProgress] = useState({}) // { fileId: progress }
  const [showLongMessageModal, setShowLongMessageModal] = useState(false)
  const [sendingTextFile, setSendingTextFile] = useState(false)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    const fetchPartnerMood = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId))
        if (!chatDoc.exists()) return

        const members = chatDoc.data().members || []
        const partnerUid = members.find(m => m !== currentUser.uid)
        if (!partnerUid) return

        const today = new Date().toISOString().split('T')[0]
        const checkInsRef = collection(db, 'chats', chatId, 'checkIns')
        const q = query(
          checkInsRef,
          where('userId', '==', partnerUid),
          where('dateKey', '==', today),
          limit(1)
        )
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const checkIn = snapshot.docs[0].data()
          if (STRESSED_MOODS.includes(checkIn.mood)) {
            setPartnerMood(checkIn.mood)
          }
        }
      } catch (err) {
        console.error('Error fetching partner mood:', err)
      }
    }
    fetchPartnerMood()
  }, [chatId, currentUser.uid])

  const setTypingStatus = useCallback(async (isTyping) => {
    try {
      const typingRef = doc(db, 'chats', chatId, 'typing', currentUser.uid)
      if (isTyping) {
        await setDoc(typingRef, {
          uid: currentUser.uid,
          isTyping: true,
          updatedAt: serverTimestamp(),
        })
      } else {
        await deleteDoc(typingRef)
      }
    } catch (err) {
      console.error('Error updating typing status:', err)
    }
  }, [chatId, currentUser.uid])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTypingRef.current) {
        isTypingRef.current = false
        setTypingStatus(false)
      }
    }
  }, [setTypingStatus])

  const trimmedText = text.trim()
  const isOverLimit = trimmedText.length > MAX_MESSAGE_LENGTH
  const isReplyToOwn = activeReplyTo?.senderId === currentUser.uid

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!trimmedText || sending) return

    // Check if message is long enough to prompt for text file option
    // Also show modal if over max limit, but in that case Send as Message is disabled
    console.log('[MessageInput] handleSubmit - text length:', trimmedText.length, 'threshold:', LONG_MESSAGE_TEXT_FILE_THRESHOLD)
    if (trimmedText.length > LONG_MESSAGE_TEXT_FILE_THRESHOLD) {
      console.log('[MessageInput] Showing long message modal')
      setShowLongMessageModal(true)
      return
    }

    await sendAsMessage()
  }

  const sendAsMessage = async () => {
    if (!trimmedText || sending || isOverLimit) return

    setSending(true)
    try {
      const messageData = {
        type: 'text',
        text: trimmedText,
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
      }

      if (messageIntent && messageIntent !== 'normal') {
        messageData.messageIntent = messageIntent
      }

      if (activeReplyTo) {
        messageData.replyTo = {
          messageId: activeReplyTo.messageId,
          senderId: activeReplyTo.senderId,
          textPreview: activeReplyTo.textPreview,
        }
        if (activeReplyTo.fileInfo) {
          messageData.replyTo.fileInfo = activeReplyTo.fileInfo
        }
      }

      if (activeThoughtReply) {
        messageData.thoughtRef = {
          thoughtId: activeThoughtReply.thoughtId,
          authorId: activeThoughtReply.authorId,
          quote: activeThoughtReply.quote.slice(0, 300),
        }
        if (activeThoughtReply.blockId) {
          messageData.thoughtRef.blockId = activeThoughtReply.blockId
        }
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
      setText('')
      setMessageIntent('normal')
      clearReply()
      if (clearThoughtReply) clearThoughtReply()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      setTypingStatus(false)
      textareaRef.current?.focus()
    } catch (err) {
      console.error('Failed to send message:', err)
      if (err.code === 'permission-denied') {
        setError('You do not have permission to send messages.')
      } else {
        setError('Failed to send message. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const sendAsTextFile = async () => {
    if (!trimmedText || sendingTextFile) return

    setSendingTextFile(true)
    setShowLongMessageModal(false)
    setError('')

    try {
      // Generate filename: message-YYYYMMDD-HHMMSS.txt
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const fileName = `message-${dateStr}-${timeStr}.txt`

      // Create text file blob (use 'text/plain' without charset to match storage rules)
      const blob = new Blob([trimmedText], { type: 'text/plain' })

      // Check file size (should be well under 25MB for text, but check anyway)
      if (blob.size > MAX_FILE_SIZE) {
        setError('Message is too long to send as a text file.')
        setSendingTextFile(false)
        return
      }

      // Upload to Firebase Storage
      const fileId = generateId()
      const storagePath = `chatFiles/${chatId}/${fileId}/${fileName}`
      const storageRef = ref(storage, storagePath)

      setUploadProgress(0)
      const uploadTask = uploadBytesResumable(storageRef, blob)

      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            setUploadProgress(progress)
          },
          (uploadError) => {
            console.error('Text file upload error:', uploadError)
            reject(uploadError)
          },
          resolve
        )
      })

      // Create message document
      const messageData = {
        type: 'file',
        text: '',
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
        file: {
          storagePath,
          fileName,
          contentType: 'text/plain',
          size: blob.size,
        },
      }

      if (activeReplyTo) {
        messageData.replyTo = {
          messageId: activeReplyTo.messageId,
          senderId: activeReplyTo.senderId,
          textPreview: activeReplyTo.textPreview,
        }
        if (activeReplyTo.fileInfo) {
          messageData.replyTo.fileInfo = activeReplyTo.fileInfo
        }
      }

      if (activeThoughtReply) {
        messageData.thoughtRef = {
          thoughtId: activeThoughtReply.thoughtId,
          authorId: activeThoughtReply.authorId,
          quote: activeThoughtReply.quote.slice(0, 300),
        }
        if (activeThoughtReply.blockId) {
          messageData.thoughtRef.blockId = activeThoughtReply.blockId
        }
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)

      // Clear composer on success
      setText('')
      setMessageIntent('normal')
      clearReply()
      if (clearThoughtReply) clearThoughtReply()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      setTypingStatus(false)
      textareaRef.current?.focus()
    } catch (err) {
      console.error('Failed to send text file:', err)
      setError('Could not send text file. Try again.')
      // Keep composer text so user doesn't lose it
    } finally {
      setSendingTextFile(false)
      setUploadProgress(null)
    }
  }

  const handleLongMessageSendAsMessage = async () => {
    setShowLongMessageModal(false)
    await sendAsMessage()
  }

  const handleLongMessageCancel = () => {
    setShowLongMessageModal(false)
    // Keep composer text
  }

  const handleChange = (e) => {
    const newText = e.target.value
    setText(newText)
    if (error) setError('')
    setToneSuggestion(null)
    setShowToneOptions(false)

    // Check for harsh patterns when partner is stressed
    if (partnerMood && !nudgeDismissed && newText.trim().length > 10) {
      const hasHarshIndicators =
        newText === newText.toUpperCase() && newText.length > 5 ||
        (newText.match(/!/g) || []).length >= 2 ||
        HARSH_PATTERNS.some(({ pattern }) => pattern.test(newText))

      if (hasHarshIndicators) {
        setShowMoodNudge(true)
      }
    } else {
      setShowMoodNudge(false)
    }

    // Debounced typing status - only write to Firestore when status changes
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (newText.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true
        setTypingStatus(true)
      }
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false
        setTypingStatus(false)
      }, TYPING_TIMEOUT)
    } else if (isTypingRef.current) {
      isTypingRef.current = false
      setTypingStatus(false)
    }
  }

  const handleToneOption = (option) => {
    setShowToneOptions(false)
    const result = softenMessage(text)
    if (result.wasTransformed) {
      setToneSuggestion({ original: text, softened: result.softened, option })
    } else {
      setToneSuggestion({ original: text, softened: "Hey, " + text, option })
    }
  }

  const acceptToneSuggestion = () => {
    if (toneSuggestion) {
      setText(toneSuggestion.softened)
      setToneSuggestion(null)
      setShowMoodNudge(false)
    }
  }

  const cancelToneSuggestion = () => {
    setToneSuggestion(null)
  }

  const dismissMoodNudge = () => {
    setShowMoodNudge(false)
    setNudgeDismissed(true)
  }

  const handleQuickAction = async (action) => {
    if (sending) return
    setShowQuickActions(false)
    setSending(true)
    setError('')

    try {
      const messageData = {
        type: 'text',
        text: action.text,
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
    } catch (err) {
      console.error('Failed to send quick action:', err)
      setError('Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Reset input
    e.target.value = ''

    // Check if adding files would exceed limit
    const totalFilesAfterAdd = pendingFiles.length + files.length
    if (totalFilesAfterAdd > MAX_FILES_PER_MESSAGE) {
      setError(`Maximum ${MAX_FILES_PER_MESSAGE} files per message. You have ${pendingFiles.length} selected.`)
      return
    }

    const validFiles = []
    const currentTotalSize = pendingFiles.reduce((sum, f) => sum + f.file.size, 0)
    let newTotalSize = currentTotalSize

    for (const file of files) {
      const fileType = file.type || ''
      const isImage = fileType.startsWith('image/')
      const isVideo = fileType.startsWith('video/')
      const isDocument = ['application/pdf', 'text/plain'].includes(fileType)

      // Validate file type
      if (!isImage && !isVideo && !isDocument) {
        setError(`${file.name}: Unsupported file type. Allowed: Images, Videos, PDF, TXT`)
        continue
      }

      // Validate individual file size
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE
      if (file.size > maxSize) {
        setError(`${file.name}: File too large. Maximum size is ${isVideo ? '100' : '25'} MB.`)
        continue
      }

      // Validate total bundle size
      if (newTotalSize + file.size > MAX_TOTAL_BUNDLE_SIZE) {
        setError(`Total attachment size exceeds 100 MB limit.`)
        break
      }

      newTotalSize += file.size
      validFiles.push({
        id: generateId(),
        file,
        kind: getFileKind(fileType),
        preview: isImage ? URL.createObjectURL(file) : null,
        status: 'pending', // pending, uploading, uploaded, failed
        progress: 0,
      })
    }

    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles])
      setError('')
    }
  }

  const removePendingFile = (fileId) => {
    setPendingFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const clearAllPendingFiles = () => {
    pendingFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview)
    })
    setPendingFiles([])
  }

  const sendAttachmentBundle = async () => {
    if (pendingFiles.length === 0 || uploadingBundle) return

    setError('')
    setUploadingBundle(true)
    setBundleUploadProgress({})

    try {
      // If only one file, use existing single-file upload behavior
      if (pendingFiles.length === 1) {
        const pf = pendingFiles[0]
        const file = pf.file
        const fileId = pf.id
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `chatFiles/${chatId}/${fileId}/${safeFileName}`
        const storageRef = ref(storage, storagePath)

        setBundleUploadProgress({ [fileId]: 0 })

        const uploadTask = uploadBytesResumable(storageRef, file)

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              setBundleUploadProgress({ [fileId]: progress })
            },
            reject,
            resolve
          )
        })

        const isVideo = file.type.startsWith('video/')
        const messageData = {
          type: isVideo ? 'video' : 'file',
          text: '',
          senderId: currentUser.uid,
          senderPhone: currentUser.phoneNumber,
          createdAt: serverTimestamp(),
          file: {
            storagePath,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
          },
        }

        if (activeReplyTo) {
          messageData.replyTo = {
            messageId: activeReplyTo.messageId,
            senderId: activeReplyTo.senderId,
            textPreview: activeReplyTo.textPreview,
          }
          if (activeReplyTo.fileInfo) {
            messageData.replyTo.fileInfo = activeReplyTo.fileInfo
          }
        }

        await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
        clearReply()
        clearAllPendingFiles()
        return
      }

      // Multiple files: create attachment bundle
      const firstImageFile = pendingFiles.find(f => f.kind === 'image')
      const firstPreviewPath = firstImageFile
        ? `chatAttachments/${chatId}/temp/${firstImageFile.id}/${firstImageFile.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        : null

      // Create message document with uploading status
      const messageData = {
        type: 'attachment_bundle',
        text: '',
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
        attachmentCount: pendingFiles.length,
        firstPreviewStoragePath: firstPreviewPath,
        status: 'uploading',
      }

      if (activeReplyTo) {
        messageData.replyTo = {
          messageId: activeReplyTo.messageId,
          senderId: activeReplyTo.senderId,
          textPreview: activeReplyTo.textPreview,
        }
        if (activeReplyTo.fileInfo) {
          messageData.replyTo.fileInfo = activeReplyTo.fileInfo
        }
      }

      const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
      const messageId = messageRef.id

      // Upload files with controlled concurrency (2 at a time)
      const uploadFile = async (pf, order) => {
        const file = pf.file
        const attachmentId = pf.id
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `chatAttachments/${chatId}/${messageId}/${attachmentId}/${safeFileName}`
        const storageRef = ref(storage, storagePath)

        setBundleUploadProgress(prev => ({ ...prev, [attachmentId]: 0 }))

        const uploadTask = uploadBytesResumable(storageRef, file)

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              setBundleUploadProgress(prev => ({ ...prev, [attachmentId]: progress }))
            },
            reject,
            resolve
          )
        })

        // Create attachment document in subcollection
        await setDoc(doc(db, 'chats', chatId, 'messages', messageId, 'attachments', attachmentId), {
          attachmentId,
          messageId,
          chatId,
          uploadedBy: currentUser.uid,
          storagePath,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          kind: pf.kind,
          order,
          createdAt: serverTimestamp(),
        })

        return storagePath
      }

      // Upload with concurrency limit of 2
      const results = []
      for (let i = 0; i < pendingFiles.length; i += 2) {
        const batch = pendingFiles.slice(i, i + 2)
        const batchResults = await Promise.all(
          batch.map((pf, idx) => uploadFile(pf, i + idx))
        )
        results.push(...batchResults)
      }

      // Update message with first preview path and sent status
      const actualFirstPreviewPath = pendingFiles.find(f => f.kind === 'image')
        ? results[pendingFiles.findIndex(f => f.kind === 'image')]
        : null

      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        status: 'sent',
        firstPreviewStoragePath: actualFirstPreviewPath,
        updatedAt: serverTimestamp(),
      })

      clearReply()
      clearAllPendingFiles()
    } catch (err) {
      console.error('Failed to send attachment bundle:', err)
      setError('Failed to upload files. Please try again.')
    } finally {
      setUploadingBundle(false)
      setBundleUploadProgress({})
    }
  }

  // Legacy single file upload for backward compatibility (called when no pending files)
  const handleLegacySingleFileUpload = async (file) => {
    const fileType = file.type || ''
    const isImage = fileType.startsWith('image/')
    const isVideo = fileType.startsWith('video/')
    const isDocument = ['application/pdf', 'text/plain'].includes(fileType)

    if (!isImage && !isVideo && !isDocument) {
      setError('Unsupported file type. Allowed: Images, Videos, PDF, TXT')
      return
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${isVideo ? '100' : '25'} MB.`)
      return
    }

    setError('')
    setSending(true)
    setUploadProgress(0)

    try {
      const fileId = generateId()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `chatFiles/${chatId}/${fileId}/${safeFileName}`
      const storageRef = ref(storage, storagePath)

      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          )
          setUploadProgress(progress)
        },
        (uploadError) => {
          console.error('Upload error:', uploadError)
          setError('Failed to upload file. Please try again.')
          setSending(false)
          setUploadProgress(null)
        },
        async () => {
          try {
            const messageData = {
              type: isVideo ? 'video' : 'file',
              text: '',
              senderId: currentUser.uid,
              senderPhone: currentUser.phoneNumber,
              createdAt: serverTimestamp(),
              file: {
                storagePath,
                fileName: file.name,
                contentType: file.type,
                size: file.size,
              },
            }

            if (activeReplyTo) {
              messageData.replyTo = {
                messageId: activeReplyTo.messageId,
                senderId: activeReplyTo.senderId,
                textPreview: activeReplyTo.textPreview,
              }
              if (activeReplyTo.fileInfo) {
                messageData.replyTo.fileInfo = activeReplyTo.fileInfo
              }
            }

            await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
            clearReply()
          } catch (createErr) {
            console.error('Failed to create message:', createErr)
            setError('File uploaded but failed to save message.')
          } finally {
            setSending(false)
            setUploadProgress(null)
          }
        }
      )
    } catch (err) {
      console.error('Failed to start upload:', err)
      setError('Failed to send file. Please try again.')
      setSending(false)
      setUploadProgress(null)
    }
  }

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setText((prev) => prev + emoji)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newText = text.slice(0, start) + emoji + text.slice(end)
    setText(newText)

    // Set cursor position after emoji
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      textarea.focus()
    }, 0)
  }

  return (
    <div className="message-input-wrapper">
      {showSpecialComposer && (
        <SpecialMessageComposer
          currentUser={currentUser}
          chatId={chatId}
          onClose={() => setShowSpecialComposer(false)}
          onSent={() => textareaRef.current?.focus()}
        />
      )}
      {error && <div className="input-error">{error}</div>}
      {isOverLimit && (
        <div className="input-error">
          Message too long ({trimmedText.length}/{MAX_MESSAGE_LENGTH})
        </div>
      )}
      {/* Long Message Modal */}
      {showLongMessageModal && (
        <div className="long-message-modal-overlay">
          <div className="long-message-modal">
            <h3 className="long-message-modal-title">Long message</h3>
            <p className="long-message-modal-body">
              {isOverLimit
                ? `This message is too long to send as text (${trimmedText.length.toLocaleString()} characters). Send it as a text file instead.`
                : 'This message is a little long. Do you want to send it as a regular message or as a text file?'}
            </p>
            <div className="long-message-modal-actions">
              {!isOverLimit && (
                <button
                  type="button"
                  className="long-message-btn primary"
                  onClick={handleLongMessageSendAsMessage}
                  disabled={sending}
                >
                  Send as Message
                </button>
              )}
              <button
                type="button"
                className={`long-message-btn ${isOverLimit ? 'primary' : 'secondary'}`}
                onClick={sendAsTextFile}
                disabled={sendingTextFile}
              >
                {sendingTextFile ? 'Sending...' : 'Send as Text File'}
              </button>
              <button
                type="button"
                className="long-message-btn cancel"
                onClick={handleLongMessageCancel}
                disabled={sending || sendingTextFile}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Attachment Tray */}
      {pendingFiles.length > 0 && (
        <div className="attachment-tray">
          <div className="attachment-tray-header">
            <span className="attachment-tray-count">
              {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} · {formatFileSize(pendingFiles.reduce((sum, f) => sum + f.file.size, 0))}
            </span>
            <button
              type="button"
              className="attachment-tray-clear"
              onClick={clearAllPendingFiles}
              disabled={uploadingBundle}
              title="Clear all"
            >
              ✕ Clear
            </button>
          </div>
          <div className="attachment-tray-items">
            {pendingFiles.map((pf) => (
              <div key={pf.id} className={`attachment-tray-item ${pf.kind}`}>
                {pf.kind === 'image' && pf.preview ? (
                  <img src={pf.preview} alt={pf.file.name} className="attachment-tray-preview" />
                ) : pf.kind === 'video' ? (
                  <div className="attachment-tray-icon">🎬</div>
                ) : pf.kind === 'audio' ? (
                  <div className="attachment-tray-icon">🎵</div>
                ) : (
                  <div className="attachment-tray-icon">📄</div>
                )}
                <div className="attachment-tray-info">
                  <span className="attachment-tray-name">{pf.file.name}</span>
                  <span className="attachment-tray-size">{formatFileSize(pf.file.size)}</span>
                </div>
                {uploadingBundle && bundleUploadProgress[pf.id] !== undefined ? (
                  <div className="attachment-tray-progress">
                    <div
                      className="attachment-tray-progress-bar"
                      style={{ width: `${bundleUploadProgress[pf.id]}%` }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="attachment-tray-remove"
                    onClick={() => removePendingFile(pf.id)}
                    disabled={uploadingBundle}
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="attachment-tray-send"
            onClick={sendAttachmentBundle}
            disabled={uploadingBundle || pendingFiles.length === 0}
          >
            {uploadingBundle ? 'Uploading...' : `Send ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
      {showMoodNudge && partnerMood && (
        <div className="mood-nudge">
          <span>
            {partnerMood === '😟' ? "They seem stressed today." : "They seem tired today."} Consider sending this gently.
          </span>
          <div className="mood-nudge-actions">
            <button onClick={() => setShowToneOptions(true)}>Soften</button>
            <button onClick={dismissMoodNudge}>Dismiss</button>
          </div>
        </div>
      )}
      {toneSuggestion && (
        <div className="tone-suggestion">
          <div className="tone-suggestion-label">Suggested softer version:</div>
          <div className="tone-suggestion-text">{toneSuggestion.softened}</div>
          <div className="tone-suggestion-actions">
            <button className="tone-accept" onClick={acceptToneSuggestion}>Accept</button>
            <button className="tone-cancel" onClick={cancelToneSuggestion}>Keep Original</button>
          </div>
        </div>
      )}
      {uploadProgress !== null && (
        <div className="upload-progress">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="upload-progress-text">Uploading... {uploadProgress}%</span>
        </div>
      )}
      {showQuickActions && (
        <div className="quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              className={`quick-action-btn ${action.priority ? 'priority' : ''}`}
              onClick={() => handleQuickAction(action)}
              disabled={sending}
            >
              {action.text}
            </button>
          ))}
        </div>
      )}
      {showToneOptions && (
        <div className="tone-options">
          <button onClick={() => handleToneOption('softer')}>Make softer</button>
          <button onClick={() => handleToneOption('clearer')}>Make clearer</button>
          <button onClick={() => handleToneOption('caring')}>Make more caring</button>
          <button onClick={() => setShowToneOptions(false)}>Cancel</button>
        </div>
      )}
      {showEmojiPicker && (
        <div className="emoji-picker">
          <div className="emoji-picker-header">
            <span>Emoji</span>
            <button className="emoji-picker-close" onClick={() => setShowEmojiPicker(false)}>×</button>
          </div>
          <div className="emoji-picker-grid">
            {EMOJI_LIST.map((emoji, index) => (
              <button
                key={index}
                type="button"
                className="emoji-picker-item"
                onClick={() => {
                  insertEmoji(emoji)
                  setShowEmojiPicker(false)
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      {activeReplyTo && (
        <div className="reply-preview">
          {activeReplyTo.fileInfo && (
            <ReplyThumbnail chatId={chatId} fileInfo={activeReplyTo.fileInfo} />
          )}
          <div className="reply-preview-content">
            <span className="reply-preview-label">
              Replying to {isReplyToOwn ? 'yourself' : 'friend'}
            </span>
            <span className="reply-preview-text">{activeReplyTo.textPreview}</span>
          </div>
          <button className="reply-cancel-btn" onClick={clearReply} title="Cancel reply">
            ×
          </button>
        </div>
      )}
      {activeThoughtReply && (
        <div className="reply-preview thought-reply-preview">
          <span className="thought-reply-icon">💭</span>
          <div className="reply-preview-content">
            <span className="reply-preview-label">
              Replying to {activeThoughtReply.blockId ? 'paragraph' : 'thought'}
            </span>
            <span className="reply-preview-text">{activeThoughtReply.quote}</span>
          </div>
          <button className="reply-cancel-btn" onClick={clearThoughtReply} title="Cancel reply">
            ×
          </button>
        </div>
      )}
      <form className={`message-input-container ${isVoiceRecording ? 'voice-active' : ''}`} onSubmit={handleSubmit}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.txt"
          multiple
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
        />
        {!isVoiceRecording && (
          <>
            <button
              type="button"
              className="attach-btn"
              onClick={openFilePicker}
              disabled={sending || sendingTextFile}
              title="Attach file"
              aria-label="Attach file"
            >
              📎
            </button>
            <button
              type="button"
              className="special-msg-btn"
              onClick={() => setShowSpecialComposer(true)}
              disabled={sending || sendingTextFile}
              title="Special message"
              aria-label="Send special message"
            >
              💝
            </button>
            <button
              type="button"
              className="emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={sending || sendingTextFile}
              title="Add emoji"
              aria-label="Add emoji"
            >
              😊
            </button>
            <div className="intent-picker-container">
              <button
                type="button"
                className={`intent-btn ${messageIntent !== 'normal' ? 'intent-active' : ''}`}
                onClick={() => setShowIntentPicker(!showIntentPicker)}
                disabled={sending || sendingTextFile}
                title="Message type"
                aria-label="Set message type"
              >
                {MESSAGE_INTENTS.find(i => i.value === messageIntent)?.icon || '🏷️'}
              </button>
              {showIntentPicker && (
                <div className="intent-picker">
                  {MESSAGE_INTENTS.map((intent) => (
                    <button
                      key={intent.value}
                      type="button"
                      className={`intent-option ${messageIntent === intent.value ? 'active' : ''}`}
                      onClick={() => {
                        setMessageIntent(intent.value)
                        setShowIntentPicker(false)
                      }}
                    >
                      {intent.icon && <span className="intent-icon">{intent.icon}</span>}
                      {intent.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {trimmedText.length > 5 && (
              <>
                <button
                  type="button"
                  className="tone-btn-subtle"
                  onClick={() => setShowToneOptions(!showToneOptions)}
                  disabled={sending || sendingTextFile}
                  title="Soften tone"
                  aria-label="Soften message tone"
                >
                  ♡
                </button>
                <ToneRepairAiButton
                  currentUser={currentUser}
                  chatId={chatId}
                  text={text}
                  onSuggestion={(suggestion) => setToneSuggestion(suggestion)}
                  disabled={sending || sendingTextFile}
                />
              </>
            )}
            <textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={text}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (trimmedText && !sending && !sendingTextFile) {
                    handleSubmit(e)
                  }
                }
              }}
              disabled={sending || sendingTextFile}
              aria-label="Message input"
              rows={1}
            />
          </>
        )}
        {trimmedText && !isVoiceRecording ? (
          <button
            type="submit"
            disabled={sending || sendingTextFile || !trimmedText}
            aria-label={sending || sendingTextFile ? 'Sending message' : 'Send message'}
          >
            {sending || sendingTextFile ? 'Sending...' : 'Send'}
          </button>
        ) : (
          <VoiceRecorder
            currentUser={currentUser}
            chatId={chatId}
            activeReplyTo={activeReplyTo}
            clearReply={clearReply}
            disabled={sending || sendingTextFile}
            onStateChange={setIsVoiceRecording}
          />
        )}
      </form>
    </div>
  )
}

export default MessageInput
