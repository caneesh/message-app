import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { db, PRIVATE_CHAT_ID, VAPID_KEY, requestNotificationPermission } from '../firebase/firebaseConfig'
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore'
import AppShell from '../components/AppShell'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import Reminders from './Reminders'
import Notes from './Notes'
import ImportantDates from './ImportantDates'
import Lists from './Lists'
import Settings from './Settings'
import LockScreen from './LockScreen'
import { useInactivityLock } from '../hooks/useInactivityLock'
import CheckIn from './CheckIn'
import Memories from './Memories'
import Events from './Events'
import Devices from './Devices'
import Decisions from './Decisions'
import Vault from './Vault'
import Dashboard from './Dashboard'
import Promises from './Promises'
import CareMode from './CareMode'
import Misunderstandings from './Misunderstandings'
import Capsules from './Capsules'
import FollowUps from './FollowUps'
import LoveHeatMap from './LoveHeatMap'
import MessageCalendar from './MessageCalendar'
import SharedMedia from './SharedMedia'
import ThoughtsPage from './ThoughtsPage'
import PanicLogoutButton from '../components/PanicLogoutButton'
import { useUnreadThoughts } from '../hooks/useUnreadThoughts'
import { useUnreadComments } from '../hooks/useUnreadComments'
import {
  CallProvider,
  useCall,
  CALL_STATE,
  VideoCallButton,
  VoiceCallButton,
  IncomingCallModal,
  OutgoingCallModal,
  ActiveVideoCall,
  ActiveVoiceCall,
} from '../calls'

const STALE_TYPING_MS = 5000

function CallOverlay() {
  const { callState, isVoiceCall } = useCall()

  if (callState === CALL_STATE.INCOMING) {
    return <IncomingCallModal />
  }
  if (callState === CALL_STATE.OUTGOING) {
    return <OutgoingCallModal />
  }
  if (callState === CALL_STATE.CONNECTING || callState === CALL_STATE.CONNECTED) {
    return isVoiceCall ? <ActiveVoiceCall /> : <ActiveVideoCall />
  }
  if (callState === CALL_STATE.ENDED) {
    return (
      <div className="call-modal-overlay">
        <div className="call-modal">
          <div className="call-modal-content">
            <p className="call-status">Call ended</p>
          </div>
        </div>
      </div>
    )
  }
  return null
}

function ChatPage() {
  const { currentUser, logout } = useAuth()
  const [activeReplyTo, setActiveReplyTo] = useState(null)
  const [friendTyping, setFriendTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('default')
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') === 'true'
  })
  const [activeTab, setActiveTab] = useState('chat')
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })
  const [showCalendar, setShowCalendar] = useState(false)
  const [dateFilter, setDateFilter] = useState(null)
  const [showSharedMedia, setShowSharedMedia] = useState(false)
  const [showThoughts, setShowThoughts] = useState(false)
  const [activeThoughtReply, setActiveThoughtReply] = useState(null)
  const [viewThoughtId, setViewThoughtId] = useState(null)
  const [viewThoughtBlockId, setViewThoughtBlockId] = useState(null)
  const [scrollToMessageId, setScrollToMessageId] = useState(null)
  const [showSecretToolbar, setShowSecretToolbar] = useState(false)
  const [secretCodeBuffer, setSecretCodeBuffer] = useState('')
  const [otherUserId, setOtherUserId] = useState(null)

  // Secret code listener for toolbar icons 🥚
  const SECRET_CODE = '335042249'
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      const key = e.key
      if (/^\d$/.test(key)) {
        setSecretCodeBuffer((prev) => {
          const newBuffer = (prev + key).slice(-SECRET_CODE.length)
          if (newBuffer === SECRET_CODE) {
            setShowSecretToolbar(true)
          }
          return newBuffer
        })
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [])

  const pinEnabled = localStorage.getItem('appPinEnabled') === 'true'

  const {
    timeoutMinutes,
    setTimeoutMinutes,
  } = useInactivityLock({
    enabled: true,
    onLock: logout
  })

  const [pinLocked, setPinLocked] = useState(() => {
    const wasLocked = localStorage.getItem('appLocked') !== 'false'
    return pinEnabled && wasLocked
  })

  const isLocked = pinLocked

  const { unreadCount: unreadThoughts } = useUnreadThoughts(PRIVATE_CHAT_ID, currentUser?.uid)
  const { unreadCount: unreadComments } = useUnreadComments(PRIVATE_CHAT_ID, currentUser?.uid)
  const totalThoughtsBadge = unreadThoughts + unreadComments

  const getDeviceLabel = () => {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS Browser'
    if (/Android/.test(ua)) return 'Android Browser'
    if (/Mac/.test(ua)) return 'Mac Browser'
    if (/Windows/.test(ua)) return 'Windows Browser'
    if (/Linux/.test(ua)) return 'Linux Browser'
    return 'Web Browser'
  }

  const getPlatform = () => {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
    if (/Android/.test(ua)) return 'android'
    if (/Mac/.test(ua)) return 'mac'
    if (/Windows/.test(ua)) return 'windows'
    if (/Linux/.test(ua)) return 'linux'
    return 'web'
  }

  const handleEnableNotifications = async () => {
    if (!VAPID_KEY) {
      alert('Push notifications are not configured. VAPID key is missing.')
      return
    }

    setNotificationStatus('requesting')
    try {
      const token = await requestNotificationPermission()
      if (token) {
        const tokenId = token.slice(0, 20)
        const tokenRef = doc(db, 'users', currentUser.uid, 'fcmTokens', tokenId)
        await setDoc(tokenRef, {
          token,
          createdAt: serverTimestamp(),
          userAgent: navigator.userAgent,
        })

        const deviceId = tokenId
        const deviceRef = doc(db, 'users', currentUser.uid, 'devices', deviceId)
        await setDoc(deviceRef, {
          label: getDeviceLabel(),
          platform: getPlatform(),
          fcmTokenId: tokenId,
          createdAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
        })
        localStorage.setItem('currentDeviceId', deviceId)
        localStorage.setItem('notificationsEnabled', 'true')

        setNotificationStatus('granted')
        setNotificationsEnabled(true)
      } else {
        setNotificationStatus('denied')
      }
    } catch (err) {
      console.error('Notification setup error:', err)
      setNotificationStatus('error')
    }
  }

  const handleDisableNotifications = async () => {
    const deviceId = localStorage.getItem('currentDeviceId')
    if (!deviceId || !currentUser) return

    try {
      // Delete FCM token to stop receiving notifications
      const tokenRef = doc(db, 'users', currentUser.uid, 'fcmTokens', deviceId)
      await deleteDoc(tokenRef)

      localStorage.setItem('notificationsEnabled', 'false')
      setNotificationsEnabled(false)
    } catch (err) {
      console.error('Error disabling notifications:', err)
    }
  }

  const handleToggleNotifications = () => {
    if (notificationsEnabled) {
      handleDisableNotifications()
    } else {
      handleEnableNotifications()
    }
  }

  useEffect(() => {
    const deviceId = localStorage.getItem('currentDeviceId')
    if (deviceId && currentUser) {
      const deviceRef = doc(db, 'users', currentUser.uid, 'devices', deviceId)
      setDoc(deviceRef, { lastSeenAt: serverTimestamp() }, { merge: true }).catch(() => {})
    }
  }, [currentUser])

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => {
    if (!PRIVATE_CHAT_ID || !currentUser?.uid) return

    const fetchOtherUser = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', PRIVATE_CHAT_ID))
        if (chatDoc.exists()) {
          const members = chatDoc.data().members || []
          const otherId = members.find((id) => id !== currentUser.uid)
          if (otherId) {
            setOtherUserId(otherId)
          }
        }
      } catch (err) {
        console.error('Error fetching chat members:', err)
      }
    }
    fetchOtherUser()
  }, [currentUser?.uid])

  const toggleDarkMode = () => setDarkMode(!darkMode)

  useEffect(() => {
    if (!PRIVATE_CHAT_ID) return

    const typingRef = collection(db, 'chats', PRIVATE_CHAT_ID, 'typing')
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now()
      let isFriendTyping = false

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        if (data.uid !== currentUser.uid && data.isTyping) {
          const updatedAt = data.updatedAt?.toMillis?.() || 0
          if (now - updatedAt < STALE_TYPING_MS) {
            isFriendTyping = true
          }
        }
      })

      setFriendTyping(isFriendTyping)
    })

    return unsubscribe
  }, [currentUser.uid])

  if (!PRIVATE_CHAT_ID) {
    return (
      <div className="chat-container">
        <div className="error-container">
          <h2>Configuration Error</h2>
          <p>VITE_PRIVATE_CHAT_ID is not configured. Please check your .env file.</p>
        </div>
      </div>
    )
  }

  const clearReply = () => setActiveReplyTo(null)

  const handleUnlock = () => {
    setPinLocked(false)
    localStorage.setItem('appLocked', 'false')
  }

  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} requirePin={pinEnabled} />
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} chatId={PRIVATE_CHAT_ID} onNavigate={setActiveTab} />
      case 'chat':
        return (
          <>
            {dateFilter && (
              <div className="date-filter-banner">
                <span>
                  Showing messages from {dateFilter.startDate.toLocaleDateString()}
                  {dateFilter.endDate && dateFilter.endDate.toDateString() !== dateFilter.startDate.toDateString()
                    ? ` - ${dateFilter.endDate.toLocaleDateString()}`
                    : ''}
                </span>
                <button className="clear-filter-btn" onClick={() => setDateFilter(null)}>
                  Clear Filter
                </button>
              </div>
            )}
            <div className="chat-toolbar">
              <VoiceCallButton />
              <VideoCallButton />
              <button
                className={`thoughts-btn ${totalThoughtsBadge > 0 ? 'thoughts-btn-badge' : ''}`}
                onClick={() => setShowThoughts(true)}
                title="Thoughts"
              >
                💭
                {totalThoughtsBadge > 0 && (
                  <span className="thoughts-unread-badge">
                    {totalThoughtsBadge > 9 ? '9+' : totalThoughtsBadge}
                  </span>
                )}
              </button>
              {showSecretToolbar && (
                <>
                  <button
                    className="calendar-btn"
                    onClick={() => setShowCalendar(true)}
                    title="Browse by date"
                  >
                    📅
                  </button>
                  <button
                    className="media-btn"
                    onClick={() => setShowSharedMedia(true)}
                    title="Shared media"
                  >
                    🖼️
                  </button>
                </>
              )}
            </div>
            <MessageList
              currentUser={currentUser}
              chatId={PRIVATE_CHAT_ID}
              onReply={setActiveReplyTo}
              searchQuery={searchQuery}
              dateFilter={dateFilter}
              scrollToMessageId={scrollToMessageId}
              onScrollComplete={() => setScrollToMessageId(null)}
              onViewThought={(thoughtId, blockId) => {
                setViewThoughtId(thoughtId)
                setViewThoughtBlockId(blockId || null)
                setShowThoughts(true)
              }}
            />
            {friendTyping && (
              <div className="typing-indicator">Friend is typing...</div>
            )}
            <MessageInput
              currentUser={currentUser}
              chatId={PRIVATE_CHAT_ID}
              activeReplyTo={activeReplyTo}
              clearReply={clearReply}
              activeThoughtReply={activeThoughtReply}
              clearThoughtReply={() => setActiveThoughtReply(null)}
            />
            {showCalendar && (
              <MessageCalendar
                currentUser={currentUser}
                chatId={PRIVATE_CHAT_ID}
                onSelectDate={(filter) => {
                  setDateFilter(filter)
                  setShowCalendar(false)
                }}
                onClose={() => setShowCalendar(false)}
              />
            )}
            {showSharedMedia && (
              <SharedMedia
                currentUser={currentUser}
                chatId={PRIVATE_CHAT_ID}
                onClose={() => setShowSharedMedia(false)}
                onViewInChat={(messageId) => {
                  setScrollToMessageId(messageId)
                }}
              />
            )}
            {showThoughts && (
              <ThoughtsPage
                currentUser={currentUser}
                chatId={PRIVATE_CHAT_ID}
                onClose={() => {
                  setShowThoughts(false)
                  setViewThoughtId(null)
                  setViewThoughtBlockId(null)
                }}
                onReplyToThought={(replyData) => {
                  setActiveThoughtReply(replyData)
                  setShowThoughts(false)
                }}
                initialThoughtId={viewThoughtId}
                initialBlockId={viewThoughtBlockId}
              />
            )}
          </>
        )
      case 'reminders':
        return <Reminders currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'notes':
        return <Notes currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'events':
        return <Events currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'lists':
        return <Lists currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'decisions':
        return <Decisions currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'promises':
        return <Promises currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'followups':
        return <FollowUps currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'capsules':
        return <Capsules currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'misunderstandings':
        return <Misunderstandings currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'vault':
        return <Vault currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'checkin':
        return <CheckIn currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'care':
        return <CareMode currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'lovemap':
        return <LoveHeatMap currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'memories':
        return <Memories currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      case 'devices':
        return <Devices currentUser={currentUser} />
      case 'settings':
        return (
          <Settings
            currentUser={currentUser}
            chatId={PRIVATE_CHAT_ID}
            autoLogoutTimeout={timeoutMinutes}
            onAutoLogoutTimeoutChange={setTimeoutMinutes}
            onLogoutNow={logout}
          />
        )
      default:
        return <Dashboard currentUser={currentUser} chatId={PRIVATE_CHAT_ID} onNavigate={setActiveTab} />
    }
  }

  return (
    <CallProvider
      chatId={PRIVATE_CHAT_ID}
      currentUser={currentUser}
      otherUserId={otherUserId}
    >
      <PanicLogoutButton />
      <CallOverlay />
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        notificationStatus={notificationStatus}
        showNotificationBtn={!!VAPID_KEY}
        onLogout={logout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {renderContent()}
      </AppShell>
    </CallProvider>
  )
}

export default ChatPage
