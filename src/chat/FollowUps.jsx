import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'

const GENTLE_MESSAGES = [
  "Just checking on this when you get a chance.",
  "Hey, wanted to gently follow up on this.",
  "No rush, but wanted to check in about this.",
  "Thinking of you - any update on this?",
  "When you have a moment, could we revisit this?",
]

function FollowUps({ currentUser, chatId }) {
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [messageText, setMessageText] = useState(GENTLE_MESSAGES[0])
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const followUpsRef = collection(db, 'chats', chatId, 'followUps')
    const q = query(followUpsRef, orderBy('dueAt', 'asc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setFollowUps(data)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setShowForm(false)
    setTitle('')
    setMessageText(GENTLE_MESSAGES[0])
    setDueAt('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (!dueAt) {
      setError('Due date is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      await addDoc(collection(db, 'chats', chatId, 'followUps'), {
        title: trimmedTitle,
        messageText: messageText.trim(),
        dueAt: new Date(dueAt),
        status: 'pending',
        relatedType: 'other',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      resetForm()
    } catch (err) {
      console.error('Error creating follow-up:', err)
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSendNow = async (followUp) => {
    setSending(followUp.id)
    try {
      // Send as chat message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'text',
        text: followUp.messageText,
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
      })

      // Mark follow-up as sent
      await updateDoc(doc(db, 'chats', chatId, 'followUps', followUp.id), {
        status: 'sent',
        sentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error sending follow-up:', err)
      alert('Failed to send')
    } finally {
      setSending(null)
    }
  }

  const handleDismiss = async (followUpId) => {
    try {
      await updateDoc(doc(db, 'chats', chatId, 'followUps', followUpId), {
        status: 'dismissed',
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error dismissing:', err)
    }
  }

  const handleDelete = async (followUpId) => {
    if (!window.confirm('Delete this follow-up?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'followUps', followUpId))
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const isDue = (timestamp) => {
    if (!timestamp) return false
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date <= new Date()
    } catch {
      return false
    }
  }

  const pendingFollowUps = followUps.filter((f) => f.status === 'pending')
  const dueFollowUps = pendingFollowUps.filter((f) => isDue(f.dueAt))
  const upcomingFollowUps = pendingFollowUps.filter((f) => !isDue(f.dueAt))
  const completedFollowUps = followUps.filter((f) => f.status !== 'pending')

  if (loading) {
    return <div className="followups-container loading">Loading...</div>
  }

  return (
    <div className="followups-container">
      <div className="followups-header">
        <h2>Gentle Follow-ups</h2>
        <button
          className="add-followup-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      <p className="followups-intro">
        Schedule gentle reminders to follow up on things that matter, without nagging.
      </p>

      <div className="followups-note">
        Note: Follow-ups won't auto-send. You'll see them here when due and can send with one tap.
      </div>

      {showForm && (
        <form className="followup-form" onSubmit={handleSubmit}>
          {error && <div className="followup-error">{error}</div>}
          <input
            type="text"
            placeholder="What to follow up on..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="followup-input"
          />
          <div className="followup-field">
            <label>Message to send:</label>
            <select
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="followup-select"
            >
              {GENTLE_MESSAGES.map((msg) => (
                <option key={msg} value={msg}>{msg}</option>
              ))}
            </select>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              maxLength={500}
              className="followup-textarea"
              rows={2}
            />
          </div>
          <div className="followup-field">
            <label>Follow up on:</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="followup-datetime"
            />
          </div>
          <button type="submit" disabled={saving} className="followup-submit">
            {saving ? 'Saving...' : 'Schedule Follow-up'}
          </button>
        </form>
      )}

      {followUps.length === 0 && !showForm ? (
        <div className="no-followups">
          No follow-ups scheduled. Create one to gently check in later.
        </div>
      ) : (
        <>
          {dueFollowUps.length > 0 && (
            <div className="followups-section due">
              <h3>Due Now</h3>
              <div className="followups-list">
                {dueFollowUps.map((followUp) => (
                  <div key={followUp.id} className="followup-card due">
                    <div className="followup-content">
                      <div className="followup-title">{followUp.title}</div>
                      <div className="followup-message">"{followUp.messageText}"</div>
                      <div className="followup-due">Due: {formatDate(followUp.dueAt)}</div>
                    </div>
                    <div className="followup-actions">
                      <button
                        className="send-btn"
                        onClick={() => handleSendNow(followUp)}
                        disabled={sending === followUp.id}
                      >
                        {sending === followUp.id ? '...' : 'Send'}
                      </button>
                      <button
                        className="dismiss-btn"
                        onClick={() => handleDismiss(followUp.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upcomingFollowUps.length > 0 && (
            <div className="followups-section">
              <h3>Upcoming</h3>
              <div className="followups-list">
                {upcomingFollowUps.map((followUp) => (
                  <div key={followUp.id} className="followup-card">
                    <div className="followup-content">
                      <div className="followup-title">{followUp.title}</div>
                      <div className="followup-message">"{followUp.messageText}"</div>
                      <div className="followup-due">Due: {formatDate(followUp.dueAt)}</div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(followUp.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedFollowUps.length > 0 && (
            <div className="followups-section completed">
              <h3>Completed</h3>
              <div className="followups-list">
                {completedFollowUps.slice(0, 5).map((followUp) => (
                  <div key={followUp.id} className={`followup-card ${followUp.status}`}>
                    <div className="followup-content">
                      <div className="followup-title">{followUp.title}</div>
                      <div className="followup-status">
                        {followUp.status === 'sent' ? '✓ Sent' : 'Dismissed'}
                      </div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(followUp.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FollowUps
