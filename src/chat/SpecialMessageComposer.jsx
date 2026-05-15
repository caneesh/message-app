import { useState } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const SPECIAL_TYPES = [
  { id: 'letter', label: 'Private Letter', icon: '💌', description: 'A heartfelt letter' },
  { id: 'hold_reveal', label: 'Hold to Reveal', icon: '🙈', description: 'Hidden until they hold to see' },
  { id: 'disappearing', label: 'Disappearing Note', icon: '✨', description: 'Fades away after time' },
  { id: 'timed_unlock', label: 'Open Later', icon: '🔒', description: 'Unlocks on a special date' },
]

const EXPIRATION_OPTIONS = [
  { value: 'viewed', label: 'After viewed', hours: 0 },
  { value: '1h', label: 'After 1 hour', hours: 1 },
  { value: '24h', label: 'After 24 hours', hours: 24 },
]

function SpecialMessageComposer({ currentUser, chatId, onClose, onSent }) {
  const [specialType, setSpecialType] = useState(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [unlockDate, setUnlockDate] = useState('')
  const [unlockTime, setUnlockTime] = useState('')
  const [expiration, setExpiration] = useState('24h')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!text.trim()) {
      setError('Please write a message')
      return
    }

    if (text.length > 5000) {
      setError('Message is too long (max 5000 characters)')
      return
    }

    if (title && title.length > 120) {
      setError('Title is too long (max 120 characters)')
      return
    }

    if (specialType === 'timed_unlock' && !unlockDate) {
      setError('Please select an unlock date')
      return
    }

    setSending(true)
    setError('')

    try {
      const messageData = {
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        type: 'special',
        specialType,
        text: text.trim(),
        createdAt: serverTimestamp(),
      }

      if (title.trim()) {
        messageData.title = title.trim()
      }

      if (specialType === 'letter') {
        messageData.style = 'letter'
      }

      if (specialType === 'timed_unlock') {
        const unlockDateTime = new Date(`${unlockDate}T${unlockTime || '00:00'}`)
        if (unlockDateTime <= new Date()) {
          setError('Unlock time must be in the future')
          setSending(false)
          return
        }
        messageData.unlockAt = unlockDateTime
        messageData.isLocked = true
      }

      if (specialType === 'disappearing') {
        const option = EXPIRATION_OPTIONS.find(o => o.value === expiration)
        if (option && option.hours > 0) {
          const expiresAt = new Date(Date.now() + option.hours * 60 * 60 * 1000)
          messageData.expiresAt = expiresAt
        } else if (expiration === 'viewed') {
          messageData.expiresOnView = true
        }
      }

      if (specialType === 'hold_reveal') {
        messageData.requiresReveal = true
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)

      onSent?.()
      onClose()
    } catch (err) {
      console.error('Failed to send special message:', err)
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please try again.')
      } else {
        setError('Failed to send. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate())
    return tomorrow.toISOString().split('T')[0]
  }

  if (!specialType) {
    return (
      <div className="special-composer-overlay" onClick={onClose}>
        <div className="special-composer" onClick={e => e.stopPropagation()}>
          <div className="special-composer-header">
            <h3>Send a Special Message</h3>
            <button className="special-close-btn" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="special-type-grid">
            {SPECIAL_TYPES.map(type => (
              <button
                key={type.id}
                className="special-type-card"
                onClick={() => setSpecialType(type.id)}
              >
                <span className="special-type-icon">{type.icon}</span>
                <span className="special-type-label">{type.label}</span>
                <span className="special-type-desc">{type.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const typeInfo = SPECIAL_TYPES.find(t => t.id === specialType)

  return (
    <div className="special-composer-overlay" onClick={onClose}>
      <div className="special-composer" onClick={e => e.stopPropagation()}>
        <div className="special-composer-header">
          <button className="special-back-btn" onClick={() => setSpecialType(null)} aria-label="Back">
            ←
          </button>
          <h3>{typeInfo?.icon} {typeInfo?.label}</h3>
          <button className="special-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="special-error">{error}</div>}

        <div className="special-composer-body">
          {specialType === 'letter' && (
            <input
              type="text"
              className="special-title-input"
              placeholder="Title (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
            />
          )}

          <textarea
            className="special-text-input"
            placeholder={
              specialType === 'letter'
                ? "Write your letter..."
                : specialType === 'hold_reveal'
                ? "Write your hidden message..."
                : specialType === 'disappearing'
                ? "Write your disappearing note..."
                : "Write your message..."
            }
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={5000}
            rows={specialType === 'letter' ? 8 : 4}
          />

          <div className="special-char-count">{text.length}/5000</div>

          {specialType === 'timed_unlock' && (
            <div className="special-unlock-settings">
              <label>Unlock on:</label>
              <div className="special-datetime-row">
                <input
                  type="date"
                  value={unlockDate}
                  onChange={e => setUnlockDate(e.target.value)}
                  min={getMinDate()}
                  className="special-date-input"
                />
                <input
                  type="time"
                  value={unlockTime}
                  onChange={e => setUnlockTime(e.target.value)}
                  className="special-time-input"
                />
              </div>
              <p className="special-hint">
                Your message will be hidden until this date and time.
              </p>
            </div>
          )}

          {specialType === 'disappearing' && (
            <div className="special-expiration-settings">
              <label>Disappears:</label>
              <div className="special-expiration-options">
                {EXPIRATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`special-expiration-btn ${expiration === opt.value ? 'active' : ''}`}
                    onClick={() => setExpiration(opt.value)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {specialType === 'hold_reveal' && (
            <div className="special-reveal-preview">
              <p className="special-hint">
                Your message will appear blurred. They must hold or tap "Reveal" to see it.
              </p>
            </div>
          )}
        </div>

        <div className="special-composer-footer">
          <button
            className="special-cancel-btn"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className="special-send-btn"
            onClick={handleSend}
            disabled={sending || !text.trim()}
          >
            {sending ? 'Sending...' : specialType === 'timed_unlock' ? 'Schedule' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SpecialMessageComposer
