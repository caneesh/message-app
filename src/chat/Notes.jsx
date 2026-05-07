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

function Notes({ currentUser, chatId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const notesRef = collection(db, 'chats', chatId, 'notes')
    const q = query(notesRef, orderBy('updatedAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const noteList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setNotes(noteList)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setEditingNote(null)
    setTitle('')
    setBody('')
    setError('')
  }

  const handleEdit = (note) => {
    setEditingNote(note)
    setTitle(note.title)
    setBody(note.body || '')
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
    if (body.length > 10000) {
      setError('Body must be 10000 characters or less')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingNote) {
        await updateDoc(doc(db, 'chats', chatId, 'notes', editingNote.id), {
          title: trimmedTitle,
          body: body,
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'chats', chatId, 'notes'), {
          title: trimmedTitle,
          body: body,
          createdBy: currentUser.uid,
          updatedBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      resetForm()
    } catch (err) {
      console.error('Error saving note:', err)
      setError('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this note?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'notes', noteId))
      if (editingNote?.id === noteId) {
        resetForm()
      }
    } catch (err) {
      console.error('Error deleting note:', err)
    }
  }

  const truncateBody = (text, maxLength = 100) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  if (loading) {
    return <div className="notes-container loading">Loading notes...</div>
  }

  return (
    <div className="notes-container">
      <div className="notes-header">
        <h2>Shared Notes</h2>
        {!editingNote && (
          <button
            className="add-note-btn"
            onClick={() => setEditingNote({ id: null })}
          >
            + Add
          </button>
        )}
      </div>

      {editingNote && (
        <form className="note-form" onSubmit={handleSubmit}>
          {error && <div className="note-error">{error}</div>}
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="note-input"
          />
          <textarea
            placeholder="Note content..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            className="note-textarea"
          />
          <div className="note-form-actions">
            <button type="submit" disabled={saving} className="note-submit">
              {saving ? 'Saving...' : editingNote.id ? 'Update' : 'Create'}
            </button>
            <button type="button" className="note-cancel" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 && !editingNote ? (
        <div className="no-notes">No notes yet</div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${editingNote?.id === note.id ? 'editing' : ''}`}
              onClick={() => !editingNote && handleEdit(note)}
            >
              <div className="note-content">
                <div className="note-title">{note.title}</div>
                {note.body && (
                  <div className="note-preview">{truncateBody(note.body)}</div>
                )}
              </div>
              <button
                className="note-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(note.id)
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

export default Notes
