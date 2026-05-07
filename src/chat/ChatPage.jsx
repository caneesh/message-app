import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { db, PRIVATE_CHAT_ID, VAPID_KEY, requestNotificationPermission } from '../firebase/firebaseConfig'
import { collection, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
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

const STALE_TYPING_MS = 5000

function ChatPage() {
  const { currentUser, logout } = useAuth()
  const [activeReplyTo, setActiveReplyTo] = useState(null)
  const [friendTyping, setFriendTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('default')
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

        setNotificationStatus('granted')
      } else {
        setNotificationStatus('denied')
      }
    } catch (err) {
      console.error('Notification setup error:', err)
      setNotificationStatus('error')
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

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Messages</h1>
        <div className="header-actions">
          <div className="search-container" role="search">
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search messages"
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <button
            className="theme-btn"
            onClick={toggleDarkMode}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          {VAPID_KEY && (
            <button
              className={`notification-btn ${notificationStatus === 'granted' ? 'enabled' : ''}`}
              onClick={notificationStatus !== 'granted' ? handleEnableNotifications : undefined}
              disabled={notificationStatus === 'requesting'}
              title={notificationStatus === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              aria-label={notificationStatus === 'granted' ? 'Notifications enabled' : 'Enable push notifications'}
              style={{ cursor: notificationStatus === 'granted' ? 'default' : 'pointer' }}
            >
              {notificationStatus === 'requesting' ? '...' : notificationStatus === 'granted' ? '🔔' : '🔕'}
            </button>
          )}
          <button className="logout-btn" onClick={logout} aria-label="Log out">
            Log out
          </button>
        </div>
      </header>
      <nav className="chat-tabs" role="tablist" aria-label="Main navigation">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          role="tab"
          aria-selected={activeTab === 'chat'}
        >
          Chat
        </button>
        <button
          className={`tab-btn ${activeTab === 'reminders' ? 'active' : ''}`}
          onClick={() => setActiveTab('reminders')}
          role="tab"
          aria-selected={activeTab === 'reminders'}
        >
          Reminders
        </button>
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
          role="tab"
          aria-selected={activeTab === 'notes'}
        >
          Notes
        </button>
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
          role="tab"
          aria-selected={activeTab === 'events'}
        >
          Events
        </button>
        <button
          className={`tab-btn ${activeTab === 'lists' ? 'active' : ''}`}
          onClick={() => setActiveTab('lists')}
          role="tab"
          aria-selected={activeTab === 'lists'}
        >
          Lists
        </button>
        <button
          className={`tab-btn ${activeTab === 'checkin' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkin')}
          role="tab"
          aria-selected={activeTab === 'checkin'}
          aria-label="Check-in"
        >
          💚
        </button>
        <button
          className={`tab-btn ${activeTab === 'memories' ? 'active' : ''}`}
          onClick={() => setActiveTab('memories')}
          role="tab"
          aria-selected={activeTab === 'memories'}
          aria-label="Memories"
        >
          📸
        </button>
        <button
          className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
          role="tab"
          aria-selected={activeTab === 'devices'}
          aria-label="Devices"
        >
          📱
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          role="tab"
          aria-selected={activeTab === 'settings'}
          aria-label="Settings"
        >
          ⚙️
        </button>
      </nav>
      {activeTab === 'chat' ? (
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
      ) : activeTab === 'reminders' ? (
        <Reminders currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      ) : activeTab === 'notes' ? (
        <Notes currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      ) : activeTab === 'events' ? (
        <Events currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      ) : activeTab === 'lists' ? (
        <Lists currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      ) : activeTab === 'checkin' ? (
        <CheckIn currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      ) : activeTab === 'memories' ? (
        <Memories currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      ) : activeTab === 'devices' ? (
        <Devices currentUser={currentUser} />
      ) : (
        <Settings currentUser={currentUser} chatId={PRIVATE_CHAT_ID} />
      )}
    </div>
  )
}

export default ChatPage
