import { useState } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const SPECIAL_TYPES = [
  { id: 'letter', label: 'Private Letter', icon: '💌', description: 'A heartfelt letter' },
  { id: 'hold_reveal', label: 'Hold to Reveal', icon: '🙈', description: 'Hidden until they hold to see' },
  { id: 'reveal', label: 'Reveal Message', icon: '🎁', description: 'Hidden answer revealed on tap' },
  { id: 'disappearing', label: 'Disappearing Note', icon: '✨', description: 'Fades away after time' },
  { id: 'timed_unlock', label: 'Open Later', icon: '🔒', description: 'Unlocks on a special date' },
]

const REVEAL_KINDS = [
  { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
  { id: 'surprise', label: 'Surprise', icon: '🎉' },
  { id: 'spoiler', label: 'Spoiler', icon: '🤐' },
  { id: 'secret', label: 'Secret', icon: '🤫' },
  { id: 'question', label: 'Question', icon: '❓' },
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
  // Reveal message state
  const [revealPrompt, setRevealPrompt] = useState('')
  const [hiddenContent, setHiddenContent] = useState('')
  const [revealKind, setRevealKind] = useState('secret')

  const handleSend = async () => {
    // Validation for reveal messages
    if (specialType === 'reveal') {
      if (!revealPrompt.trim()) {
        setError('Please write a visible prompt')
        return
      }
      if (!hiddenContent.trim()) {
        setError('Please write the hidden content')
        return
      }
      if (revealPrompt.length > 1000) {
        setError('Prompt is too long (max 1000 characters)')
        return
      }
      if (hiddenContent.length > 3000) {
        setError('Hidden content is too long (max 3000 characters)')
        return
      }
      if (title && title.length > 120) {
        setError('Title is too long (max 120 characters)')
        return
      }
    } else {
      // Validation for other types
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
    }

    if (specialType === 'timed_unlock' && !unlockDate) {
      setError('Please select an unlock date')
      return
    }

    setSending(true)
    setError('')

    try {
      let messageData

      if (specialType === 'reveal') {
        // Reveal message uses different structure
        messageData = {
          senderId: currentUser.uid,
          senderPhone: currentUser.phoneNumber,
          type: 'reveal',
          revealPrompt: revealPrompt.trim(),
          hiddenContent: hiddenContent.trim(),
          revealKind,
          createdAt: serverTimestamp(),
        }
        if (title.trim()) {
          messageData.revealTitle = title.trim()
        }
      } else {
        // Other special message types
        messageData = {
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

          {specialType !== 'reveal' && (
            <>
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
            </>
          )}

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

          {specialType === 'reveal' && (
            <div className="special-reveal-composer">
              <input
                type="text"
                className="special-title-input"
                placeholder="Title (optional)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={120}
              />

              <div className="reveal-kind-selector">
                <label>Type:</label>
                <div className="reveal-kind-options">
                  {REVEAL_KINDS.map(kind => (
                    <button
                      key={kind.id}
                      type="button"
                      className={`reveal-kind-btn ${revealKind === kind.id ? 'active' : ''}`}
                      onClick={() => setRevealKind(kind.id)}
                    >
                      {kind.icon} {kind.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="special-text-input"
                placeholder={
                  revealKind === 'puzzle' ? "Write your riddle or question..." :
                  revealKind === 'question' ? "Write your question..." :
                  revealKind === 'spoiler' ? "Write your spoiler warning..." :
                  "Write what they'll see before tapping..."
                }
                value={revealPrompt}
                onChange={e => setRevealPrompt(e.target.value)}
                maxLength={1000}
                rows={2}
              />
              <div className="special-char-count">{revealPrompt.length}/1000</div>

              <textarea
                className="special-text-input reveal-hidden-input"
                placeholder={
                  revealKind === 'puzzle' ? "Write the answer..." :
                  revealKind === 'question' ? "Write the answer..." :
                  "Write the hidden content..."
                }
                value={hiddenContent}
                onChange={e => setHiddenContent(e.target.value)}
                maxLength={3000}
                rows={3}
              />
              <div className="special-char-count">{hiddenContent.length}/3000</div>

              <p className="special-hint">
                {revealKind === 'puzzle' && "They'll see your riddle first, then tap to reveal the answer."}
                {revealKind === 'surprise' && "They'll see a surprise teaser, then tap to reveal your message."}
                {revealKind === 'spoiler' && "They'll see the warning, then choose to reveal the spoiler."}
                {revealKind === 'secret' && "They'll see your prompt, then tap to reveal the secret."}
                {revealKind === 'question' && "They'll see your question, then tap to reveal the answer."}
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
            disabled={sending || (specialType === 'reveal' ? (!revealPrompt.trim() || !hiddenContent.trim()) : !text.trim())}
          >
            {sending ? 'Sending...' : specialType === 'timed_unlock' ? 'Schedule' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SpecialMessageComposer
