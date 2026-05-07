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

function Reminders({ currentUser, chatId }) {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const remindersRef = collection(db, 'chats', chatId, 'reminders')
    const q = query(remindersRef, orderBy('completed'), orderBy('dueAt'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reminderList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setReminders(reminderList)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (trimmedTitle.length > 200) {
      setError('Title must be 200 characters or less')
      return
    }
    if (notes.length > 1000) {
      setError('Notes must be 1000 characters or less')
      return
    }

    setSaving(true)
    setError('')

    try {
      await addDoc(collection(db, 'chats', chatId, 'reminders'), {
        title: trimmedTitle,
        notes: notes.trim(),
        dueAt: dueAt ? new Date(dueAt) : null,
        completed: false,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setTitle('')
      setNotes('')
      setDueAt('')
      setShowForm(false)
    } catch (err) {
      console.error('Error creating reminder:', err)
      setError('Failed to create reminder')
    } finally {
      setSaving(false)
    }
  }

  const toggleComplete = async (reminder) => {
    try {
      await updateDoc(doc(db, 'chats', chatId, 'reminders', reminder.id), {
        completed: !reminder.completed,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error updating reminder:', err)
    }
  }

  const handleDelete = async (reminderId) => {
    if (!window.confirm('Delete this reminder?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'reminders', reminderId))
    } catch (err) {
      console.error('Error deleting reminder:', err)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString()
    } catch {
      return ''
    }
  }

  if (loading) {
    return <div className="reminders-container loading">Loading reminders...</div>
  }

  return (
    <div className="reminders-container">
      <div className="reminders-header">
        <h2>Shared Reminders</h2>
        <button
          className="add-reminder-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form className="reminder-form" onSubmit={handleSubmit}>
          {error && <div className="reminder-error">{error}</div>}
          <input
            type="text"
            placeholder="Reminder title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="reminder-input"
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            className="reminder-textarea"
          />
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="reminder-date"
          />
          <button type="submit" disabled={saving} className="reminder-submit">
            {saving ? 'Saving...' : 'Save Reminder'}
          </button>
        </form>
      )}

      {reminders.length === 0 ? (
        <div className="no-reminders">No reminders yet</div>
      ) : (
        <div className="reminders-list">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`reminder-item ${reminder.completed ? 'completed' : ''}`}
            >
              <button
                className="reminder-checkbox"
                onClick={() => toggleComplete(reminder)}
              >
                {reminder.completed ? '✓' : '○'}
              </button>
              <div className="reminder-content">
                <div className="reminder-title">{reminder.title}</div>
                {reminder.notes && (
                  <div className="reminder-notes">{reminder.notes}</div>
                )}
                {reminder.dueAt && (
                  <div className="reminder-due">Due: {formatDate(reminder.dueAt)}</div>
                )}
              </div>
              <button
                className="reminder-delete"
                onClick={() => handleDelete(reminder.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Reminders
