import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore'

function MessageList({ currentUser, chatId }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMessages(messageList)
        setLoading(false)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate()
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  if (loading) {
    return <div className="message-list loading">Loading messages...</div>
  }

  if (error) {
    return <div className="message-list error">{error}</div>
  }

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">No messages yet. Say hello!</div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderId === currentUser.uid ? 'own' : 'other'}`}
          >
            <div className="message-sender">{message.senderPhone}</div>
            <div className="message-text">{message.text}</div>
            <div className="message-time">{formatTime(message.createdAt)}</div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList
