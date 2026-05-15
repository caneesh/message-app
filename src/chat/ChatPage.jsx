import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { db, PRIVATE_CHAT_ID, VAPID_KEY, requestNotificationPermission } from '../firebase/firebaseConfig'
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import AppShell from '../components/AppShell'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import Reminders from './Reminders'
import Notes from './Notes'
import ImportantDates from './ImportantDates'
import Lists from './Lists'
import Settings from './Settings'
import LockScreen from './LockScreen'
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

const STALE_TYPING_MS = 5000

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
  const [isLocked, setIsLocked] = useState(() => {
    const pinEnabled = localStorage.getItem('appPinEnabled') === 'true'
    const wasLocked = localStorage.getItem('appLocked') !== 'false'
    return pinEnabled && wasLocked
  })

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

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} chatId={PRIVATE_CHAT_ID} onNavigate={setActiveTab} />
      case 'chat':
        return (
          <>
            <MessageList
              currentUser={currentUser}
              chatId={PRIVATE_CHAT_ID}
              onReply={setActiveReplyTo}
              searchQuery={searchQuery}
            />
            {friendTyping && (
              <div className="typing-indicator">Friend is typing...</div>
            )}
            <MessageInput
              currentUser={currentUser}
              chatId={PRIVATE_CHAT_ID}
              activeReplyTo={activeReplyTo}
              clearReply={clearReply}
            />
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
        return <Settings currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      default:
        return <Dashboard currentUser={currentUser} chatId={PRIVATE_CHAT_ID} onNavigate={setActiveTab} />
    }
  }

  return (
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
  )
}

export default ChatPage
