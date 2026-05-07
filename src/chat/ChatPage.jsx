import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { PRIVATE_CHAT_ID } from '../firebase/firebaseConfig'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

function ChatPage() {
  const { currentUser, logout } = useAuth()
  const [activeReplyTo, setActiveReplyTo] = useState(null)

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

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Messages</h1>
        <button className="logout-btn" onClick={logout}>
          Log out
        </button>
      </header>
      <MessageList
        currentUser={currentUser}
        chatId={PRIVATE_CHAT_ID}
        onReply={setActiveReplyTo}
      />
      <MessageInput
        currentUser={currentUser}
        chatId={PRIVATE_CHAT_ID}
        activeReplyTo={activeReplyTo}
        clearReply={clearReply}
      />
    </div>
  )
}

export default ChatPage
