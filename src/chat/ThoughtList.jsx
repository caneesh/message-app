import { useState, useEffect } from 'react'
import { getThoughtPreview } from '../utils/thoughtUtils'
import { getThoughtReadReceipt } from '../services/thoughtService'
import { db, PRIVATE_CHAT_ID } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

const MOOD_EMOJI = {
  normal: '💭',
  warm: '🌤️',
  love: '💕',
  quiet: '🌙',
  missing: '💫'
}

function getReadLabel(readPercent) {
  if (readPercent === undefined || readPercent === null) {
    return 'Not opened yet'
  }
  if (readPercent === 0) {
    return 'Opened'
  }
  if (readPercent >= 100) {
    return 'Finished reading'
  }
  return `Read ${Math.round(readPercent)}%`
}

function ThoughtList({ thoughts, loading, onSelect, onNewThought, currentUser, chatId }) {
  const [readReceipts, setReadReceipts] = useState({})
  const [otherMemberUid, setOtherMemberUid] = useState(null)

  useEffect(() => {
    const fetchOtherMember = async () => {
      if (!chatId || !currentUser?.uid) return
      try {
        const chatRef = doc(db, 'chats', chatId)
        const chatSnap = await getDoc(chatRef)
        if (chatSnap.exists()) {
          const members = chatSnap.data().members || []
          const other = members.find(uid => uid !== currentUser.uid)
          setOtherMemberUid(other || null)
        }
      } catch (err) {
        console.error('Error fetching chat members:', err)
      }
    }
    fetchOtherMember()
  }, [chatId, currentUser?.uid])

  useEffect(() => {
    if (!otherMemberUid || !currentUser?.uid) return

    const fetchReceipts = async () => {
      const receipts = {}
      for (const thought of thoughts) {
        if (thought.authorId === currentUser.uid) {
          const result = await getThoughtReadReceipt(chatId, thought.id, otherMemberUid)
          if (result.success && result.receipt) {
            receipts[thought.id] = result.receipt
          }
        }
      }
      setReadReceipts(receipts)
    }

    fetchReceipts()
  }, [thoughts, currentUser?.uid, chatId, otherMemberUid])

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return date.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit'
        })
      } else if (diffDays === 1) {
        return 'Yesterday'
      } else if (diffDays < 7) {
        return date.toLocaleDateString(undefined, { weekday: 'short' })
      } else {
        return date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        })
      }
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="thought-list-loading">
        <span>Loading thoughts...</span>
      </div>
    )
  }

  return (
    <div className="thought-list">
      <button className="thought-list-new-btn" onClick={onNewThought}>
        + New Thought
      </button>

      {thoughts.length === 0 ? (
        <div className="thought-list-empty">
          <span className="thought-list-empty-icon">💭</span>
          <p>No thoughts shared yet.</p>
          <p className="thought-list-empty-hint">
            Share your reflections, feelings, or longer messages here.
          </p>
        </div>
      ) : (
        <div className="thought-list-cards">
          {thoughts.map((thought) => {
            const preview = getThoughtPreview(thought)
            const moodEmoji = MOOD_EMOJI[thought.mood] || MOOD_EMOJI.normal
            const isAuthor = thought.authorId === currentUser?.uid
            const receipt = readReceipts[thought.id]

            return (
              <div
                key={thought.id}
                className={`thought-card thought-card--${thought.mood || 'normal'}`}
                onClick={() => onSelect(thought)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(thought) }}
              >
                <div className="thought-card-header">
                  <span className="thought-card-mood">{moodEmoji}</span>
                  <span className="thought-card-date">{formatDate(thought.createdAt)}</span>
                </div>

                {thought.title && (
                  <h3 className="thought-card-title">{thought.title}</h3>
                )}

                <p className="thought-card-preview">{preview}</p>

                {isAuthor && otherMemberUid && (
                  <div className="thought-card-read-status">
                    {getReadLabel(receipt?.readPercent)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ThoughtList
