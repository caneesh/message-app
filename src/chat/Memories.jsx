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

function Memories({ currentUser, chatId }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMemory, setEditingMemory] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const memoriesRef = collection(db, 'chats', chatId, 'memories')
    const q = query(memoriesRef, orderBy('date', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setMemories(data)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setShowForm(false)
    setEditingMemory(null)
    setTitle('')
    setDescription('')
    setDate('')
    setError('')
  }

  const handleEdit = (memory) => {
    setEditingMemory(memory)
    setTitle(memory.title)
    setDescription(memory.description || '')
    setDate(formatDateForInput(memory.date))
    setShowForm(true)
  }

  const formatDateForInput = (timestamp) => {
    if (!timestamp) return ''
    try {
      const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return d.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const formatDateDisplay = (timestamp) => {
    if (!timestamp) return ''
    try {
      const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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
    if (description.length > 5000) {
      setError('Description must be 5000 characters or less')
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
        description: description.trim(),
        date: new Date(date),
        updatedAt: serverTimestamp(),
      }

      if (editingMemory) {
        await updateDoc(doc(db, 'chats', chatId, 'memories', editingMemory.id), data)
      } else {
        await addDoc(collection(db, 'chats', chatId, 'memories'), {
          ...data,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        })
      }
      resetForm()
    } catch (err) {
      console.error('Error saving memory:', err)
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this memory?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'memories', id))
      if (editingMemory?.id === id) {
        resetForm()
      }
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  if (loading) {
    return <div className="memories-container loading">Loading...</div>
  }

  return (
    <div className="memories-container">
      <div className="memories-header">
        <h2>Our Memories</h2>
        {!showForm && (
          <button className="add-memory-btn" onClick={() => setShowForm(true)}>
            + Add
          </button>
        )}
      </div>

      {showForm && (
        <form className="memory-form" onSubmit={handleSubmit}>
          {error && <div className="memory-error">{error}</div>}
          <input
            type="text"
            placeholder="Memory title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="memory-input"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="memory-date"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            className="memory-textarea"
          />
          <div className="memory-form-actions">
            <button type="submit" disabled={saving} className="memory-submit">
              {saving ? 'Saving...' : editingMemory ? 'Update' : 'Save'}
            </button>
            <button type="button" className="memory-cancel" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {memories.length === 0 && !showForm ? (
        <div className="no-memories">No memories yet. Create your first one!</div>
      ) : (
        <div className="memories-list">
          {memories.map((memory) => (
            <div key={memory.id} className="memory-card" onClick={() => handleEdit(memory)}>
              <div className="memory-date-badge">{formatDateDisplay(memory.date)}</div>
              <h3 className="memory-title">{memory.title}</h3>
              {memory.description && (
                <p className="memory-description">
                  {memory.description.length > 150
                    ? memory.description.slice(0, 150) + '...'
                    : memory.description}
                </p>
              )}
              <button
                className="memory-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(memory.id)
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

export default Memories
