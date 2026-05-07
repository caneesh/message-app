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

function Events({ currentUser, chatId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const eventsRef = collection(db, 'chats', chatId, 'events')
    const q = query(eventsRef, orderBy('startAt'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setEvents(data)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setShowForm(false)
    setEditingEvent(null)
    setTitle('')
    setStartAt('')
    setEndAt('')
    setLocation('')
    setNotes('')
    setError('')
  }

  const handleEdit = (event) => {
    setEditingEvent(event)
    setTitle(event.title)
    setStartAt(formatDateTimeForInput(event.startAt))
    setEndAt(event.endAt ? formatDateTimeForInput(event.endAt) : '')
    setLocation(event.location || '')
    setNotes(event.notes || '')
    setShowForm(true)
  }

  const formatDateTimeForInput = (timestamp) => {
    if (!timestamp) return ''
    try {
      const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return d.toISOString().slice(0, 16)
    } catch {
      return ''
    }
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
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
    if (!startAt) {
      setError('Start time is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const data = {
        title: trimmedTitle,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        location: location.trim(),
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
      }

      if (editingEvent) {
        await updateDoc(doc(db, 'chats', chatId, 'events', editingEvent.id), data)
      } else {
        await addDoc(collection(db, 'chats', chatId, 'events'), {
          ...data,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        })
      }
      resetForm()
    } catch (err) {
      console.error('Error saving event:', err)
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'events', id))
      if (editingEvent?.id === id) {
        resetForm()
      }
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  const now = new Date()
  const upcomingEvents = events.filter((e) => {
    const start = e.startAt?.toDate ? e.startAt.toDate() : new Date(e.startAt)
    return start >= now
  })
  const pastEvents = events.filter((e) => {
    const start = e.startAt?.toDate ? e.startAt.toDate() : new Date(e.startAt)
    return start < now
  })

  if (loading) {
    return <div className="events-container loading">Loading...</div>
  }

  return (
    <div className="events-container">
      <div className="events-header">
        <h2>Calendar Events</h2>
        {!showForm && (
          <button className="add-event-btn" onClick={() => setShowForm(true)}>
            + Add
          </button>
        )}
      </div>

      {showForm && (
        <form className="event-form" onSubmit={handleSubmit}>
          {error && <div className="event-error">{error}</div>}
          <input
            type="text"
            placeholder="Event title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="event-input"
          />
          <div className="event-row">
            <label>
              Start
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="event-datetime"
              />
            </label>
            <label>
              End (optional)
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="event-datetime"
              />
            </label>
          </div>
          <input
            type="text"
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={200}
            className="event-input"
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            className="event-notes"
          />
          <div className="event-form-actions">
            <button type="submit" disabled={saving} className="event-submit">
              {saving ? 'Saving...' : editingEvent ? 'Update' : 'Save'}
            </button>
            <button type="button" className="event-cancel" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {upcomingEvents.length > 0 && (
        <div className="events-section">
          <h3>Upcoming</h3>
          <div className="events-list">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="event-card" onClick={() => handleEdit(event)}>
                <div className="event-time">{formatDateTime(event.startAt)}</div>
                <div className="event-title">{event.title}</div>
                {event.location && <div className="event-location">📍 {event.location}</div>}
                <button
                  className="event-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(event.id)
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="events-section past">
          <h3>Past Events</h3>
          <div className="events-list">
            {pastEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="event-card past" onClick={() => handleEdit(event)}>
                <div className="event-time">{formatDateTime(event.startAt)}</div>
                <div className="event-title">{event.title}</div>
                <button
                  className="event-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(event.id)
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && !showForm && (
        <div className="no-events">No events yet</div>
      )}
    </div>
  )
}

export default Events
