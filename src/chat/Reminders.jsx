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
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
]

function Reminders({ currentUser, chatId }) {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [chatMembers, setChatMembers] = useState([])

  useEffect(() => {
    const fetchChatMembers = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId))
        if (chatDoc.exists()) {
          setChatMembers(chatDoc.data().members || [])
        }
      } catch (err) {
        console.error('Error fetching chat members:', err)
      }
    }
    fetchChatMembers()
  }, [chatId])

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

  const resetForm = () => {
    setTitle('')
    setNotes('')
    setDueAt('')
    setAssignedTo('')
    setPriority('normal')
    setShowForm(false)
    setError('')
  }

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
      const reminderData = {
        title: trimmedTitle,
        notes: notes.trim(),
        dueAt: dueAt ? new Date(dueAt) : null,
        priority,
        completed: false,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      if (assignedTo) {
        reminderData.assignedTo = assignedTo
      }

      await addDoc(collection(db, 'chats', chatId, 'reminders'), reminderData)
      resetForm()
    } catch (err) {
      console.error('Error creating reminder:', err)
      setError('Failed to create reminder')
    } finally {
      setSaving(false)
    }
  }

  const toggleComplete = async (reminder) => {
    try {
      const updateData = {
        completed: !reminder.completed,
        updatedAt: serverTimestamp(),
      }

      if (!reminder.completed) {
        updateData.completedBy = currentUser.uid
        updateData.completedAt = serverTimestamp()
      } else {
        updateData.completedBy = null
        updateData.completedAt = null
      }

      await updateDoc(doc(db, 'chats', chatId, 'reminders', reminder.id), updateData)
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

  const getAssignmentLabel = (uid) => {
    if (!uid) return null
    if (uid === currentUser.uid) return 'Assigned to you'
    return 'Assigned to friend'
  }

  const getPriorityClass = (p) => {
    if (p === 'high') return 'priority-high'
    if (p === 'low') return 'priority-low'
    return ''
  }

  const friendUid = chatMembers.find((m) => m !== currentUser.uid)

  if (loading) {
    return <div className="reminders-container loading">Loading reminders...</div>
  }

  return (
    <div className="reminders-container">
      <div className="reminders-header">
        <h2>Shared Reminders</h2>
        <button
          className="add-reminder-btn"
          onClick={() => {
            if (showForm) resetForm()
            else setShowForm(true)
          }}
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
          <div className="reminder-row">
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="reminder-date"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="reminder-select"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="reminder-select"
          >
            <option value="">Unassigned</option>
            <option value={currentUser.uid}>Assign to me</option>
            {friendUid && <option value={friendUid}>Assign to friend</option>}
          </select>
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
              className={`reminder-item ${reminder.completed ? 'completed' : ''} ${getPriorityClass(reminder.priority)}`}
            >
              <button
                className="reminder-checkbox"
                onClick={() => toggleComplete(reminder)}
              >
                {reminder.completed ? '✓' : '○'}
              </button>
              <div className="reminder-content">
                <div className="reminder-title-row">
                  <span className="reminder-title">{reminder.title}</span>
                  {reminder.priority === 'high' && (
                    <span className="priority-badge high">High</span>
                  )}
                  {reminder.priority === 'low' && (
                    <span className="priority-badge low">Low</span>
                  )}
                </div>
                {reminder.notes && (
                  <div className="reminder-notes">{reminder.notes}</div>
                )}
                <div className="reminder-meta">
                  {reminder.dueAt && (
                    <span className="reminder-due">Due: {formatDate(reminder.dueAt)}</span>
                  )}
                  {reminder.assignedTo && (
                    <span className="reminder-assigned">
                      {getAssignmentLabel(reminder.assignedTo)}
                    </span>
                  )}
                </div>
                {reminder.completed && reminder.completedBy && (
                  <div className="reminder-completed-info">
                    Completed by {reminder.completedBy === currentUser.uid ? 'you' : 'friend'}
                  </div>
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
