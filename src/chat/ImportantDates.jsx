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

function ImportantDates({ currentUser, chatId }) {
  const [dates, setDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDate, setEditingDate] = useState(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const datesRef = collection(db, 'chats', chatId, 'importantDates')
    const q = query(datesRef, orderBy('date'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dateList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setDates(dateList)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setShowForm(false)
    setEditingDate(null)
    setTitle('')
    setDate('')
    setNotes('')
    setError('')
  }

  const handleEdit = (item) => {
    setEditingDate(item)
    setTitle(item.title)
    setDate(item.date ? formatDateForInput(item.date) : '')
    setNotes(item.notes || '')
    setShowForm(true)
  }

  const formatDateForInput = (timestamp) => {
    try {
      const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return d.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const formatDateDisplay = (timestamp) => {
    try {
      const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
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
    if (!date) {
      setError('Date is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const data = {
        title: trimmedTitle,
        date: new Date(date),
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
      }

      if (editingDate) {
        await updateDoc(doc(db, 'chats', chatId, 'importantDates', editingDate.id), data)
      } else {
        await addDoc(collection(db, 'chats', chatId, 'importantDates'), {
          ...data,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        })
      }
      resetForm()
    } catch (err) {
      console.error('Error saving date:', err)
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this date?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'importantDates', id))
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  if (loading) {
    return <div className="dates-container loading">Loading...</div>
  }

  return (
    <div className="dates-container">
      <div className="dates-header">
        <h2>Important Dates</h2>
        {!showForm && (
          <button className="add-date-btn" onClick={() => setShowForm(true)}>
            + Add
          </button>
        )}
      </div>

      {showForm && (
        <form className="date-form" onSubmit={handleSubmit}>
          {error && <div className="date-error">{error}</div>}
          <input
            type="text"
            placeholder="Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="date-input"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="date-picker"
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="date-notes"
          />
          <div className="date-form-actions">
            <button type="submit" disabled={saving} className="date-submit">
              {saving ? 'Saving...' : editingDate ? 'Update' : 'Save'}
            </button>
            <button type="button" className="date-cancel" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {dates.length === 0 && !showForm ? (
        <div className="no-dates">No important dates yet</div>
      ) : (
        <div className="dates-list">
          {dates.map((item) => (
            <div key={item.id} className="date-item" onClick={() => handleEdit(item)}>
              <div className="date-badge">{formatDateDisplay(item.date)}</div>
              <div className="date-content">
                <div className="date-title">{item.title}</div>
                {item.notes && <div className="date-item-notes">{item.notes}</div>}
              </div>
              <button
                className="date-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(item.id)
                }}
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

export default ImportantDates
