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
  setDoc,
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
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [perspectives, setPerspectives] = useState({})
  const [myPerspective, setMyPerspective] = useState('')
  const [savingPerspective, setSavingPerspective] = useState(false)

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

      // Subscribe to perspectives for each memory
      data.forEach((memory) => {
        subscribeToPerspectives(memory.id)
      })
    })

    return unsubscribe
  }, [chatId])

  const perspectiveUnsubscribes = {}

  const subscribeToPerspectives = (memoryId) => {
    if (perspectiveUnsubscribes[memoryId]) return

    const perspectivesRef = collection(db, 'chats', chatId, 'memories', memoryId, 'perspectives')
    const unsubscribe = onSnapshot(perspectivesRef, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data())
      setPerspectives((prev) => ({ ...prev, [memoryId]: data }))
    }, () => {})

    perspectiveUnsubscribes[memoryId] = unsubscribe
  }

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
      if (selectedMemory?.id === id) {
        setSelectedMemory(null)
      }
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  const openMemoryDetail = (memory) => {
    setSelectedMemory(memory)
    const memoryPerspectives = perspectives[memory.id] || []
    const mine = memoryPerspectives.find((p) => p.uid === currentUser.uid)
    setMyPerspective(mine?.text || '')
  }

  const closeMemoryDetail = () => {
    setSelectedMemory(null)
    setMyPerspective('')
  }

  const savePerspective = async () => {
    if (!selectedMemory) return
    const trimmed = myPerspective.trim()
    if (!trimmed) return
    if (trimmed.length > 3000) {
      alert('Perspective must be 3000 characters or less')
      return
    }

    setSavingPerspective(true)
    try {
      const perspectiveRef = doc(
        db,
        'chats',
        chatId,
        'memories',
        selectedMemory.id,
        'perspectives',
        currentUser.uid
      )
      await setDoc(perspectiveRef, {
        uid: currentUser.uid,
        text: trimmed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error saving perspective:', err)
      alert('Failed to save perspective')
    } finally {
      setSavingPerspective(false)
    }
  }

  const deletePerspective = async () => {
    if (!selectedMemory) return
    if (!window.confirm('Delete your perspective?')) return

    try {
      await deleteDoc(
        doc(db, 'chats', chatId, 'memories', selectedMemory.id, 'perspectives', currentUser.uid)
      )
      setMyPerspective('')
    } catch (err) {
      console.error('Error deleting perspective:', err)
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
          {memories.map((memory) => {
            const memPerspectives = perspectives[memory.id] || []
            return (
              <div key={memory.id} className="memory-card" onClick={() => openMemoryDetail(memory)}>
                <div className="memory-date-badge">{formatDateDisplay(memory.date)}</div>
                <h3 className="memory-title">{memory.title}</h3>
                {memory.description && (
                  <p className="memory-description">
                    {memory.description.length > 150
                      ? memory.description.slice(0, 150) + '...'
                      : memory.description}
                  </p>
                )}
                {memPerspectives.length > 0 && (
                  <div className="memory-perspectives-badge">
                    {memPerspectives.length} perspective{memPerspectives.length > 1 ? 's' : ''}
                  </div>
                )}
                <div className="memory-card-actions">
                  <button
                    className="memory-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(memory)
                    }}
                  >
                    ✎
                  </button>
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
              </div>
            )
          })}
        </div>
      )}

      {selectedMemory && (
        <div className="memory-detail-overlay" onClick={closeMemoryDetail}>
          <div className="memory-detail" onClick={(e) => e.stopPropagation()}>
            <div className="memory-detail-header">
              <h3>{selectedMemory.title}</h3>
              <button className="memory-detail-close" onClick={closeMemoryDetail}>×</button>
            </div>
            <div className="memory-detail-date">{formatDateDisplay(selectedMemory.date)}</div>
            {selectedMemory.description && (
              <p className="memory-detail-description">{selectedMemory.description}</p>
            )}

            <div className="perspectives-section">
              <h4>Our Perspectives</h4>
              <p className="perspectives-hint">How do you each remember this moment?</p>

              {(perspectives[selectedMemory.id] || []).map((p) => (
                <div key={p.uid} className={`perspective-card ${p.uid === currentUser.uid ? 'own' : ''}`}>
                  <div className="perspective-label">
                    {p.uid === currentUser.uid ? 'Your memory' : "Friend's memory"}
                  </div>
                  <p className="perspective-text">{p.text}</p>
                </div>
              ))}

              <div className="perspective-form">
                <label>{perspectives[selectedMemory.id]?.find((p) => p.uid === currentUser.uid) ? 'Update your perspective' : 'Add your perspective'}</label>
                <textarea
                  value={myPerspective}
                  onChange={(e) => setMyPerspective(e.target.value)}
                  placeholder="What do you remember about this moment?"
                  maxLength={3000}
                />
                <div className="perspective-actions">
                  <button onClick={savePerspective} disabled={savingPerspective || !myPerspective.trim()}>
                    {savingPerspective ? 'Saving...' : 'Save'}
                  </button>
                  {perspectives[selectedMemory.id]?.find((p) => p.uid === currentUser.uid) && (
                    <button className="perspective-delete" onClick={deletePerspective}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Memories
