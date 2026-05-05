import { useState } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const MAX_MESSAGE_LENGTH = 2000

function MessageInput({ currentUser, chatId }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const trimmedText = text.trim()
  const isOverLimit = trimmedText.length > MAX_MESSAGE_LENGTH

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!trimmedText || sending || isOverLimit) return

    setSending(true)
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: trimmedText,
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
      })
      setText('')
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

  const handleChange = (e) => {
    setText(e.target.value)
    if (error) setError('')
  }

  return (
    <div className="message-input-wrapper">
      {error && <div className="input-error">{error}</div>}
      {isOverLimit && (
        <div className="input-error">
          Message too long ({trimmedText.length}/{MAX_MESSAGE_LENGTH})
        </div>
      )}
      <form className="message-input-container" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={handleChange}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !trimmedText || isOverLimit}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default MessageInput
