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

const STATUS_OPTIONS = ['pending', 'done', 'cancelled']

function Promises({ currentUser, chatId }) {
  const [promises, setPromises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ownerUid, setOwnerUid] = useState('')
  const [dueAt, setDueAt] = useState('')
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
    const promisesRef = collection(db, 'chats', chatId, 'promises')
    const q = query(promisesRef, orderBy('status'), orderBy('dueAt'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const promiseList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setPromises(promiseList)
      setLoading(false)
    }, () => setLoading(false))

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setOwnerUid(currentUser.uid)
    setDueAt('')
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
    if (!ownerUid) {
      setError('Please select who made this promise')
      return
    }

    setSaving(true)
    setError('')

    try {
      await addDoc(collection(db, 'chats', chatId, 'promises'), {
        title: trimmedTitle,
        description: description.trim(),
        ownerUid,
        status: 'pending',
        dueAt: dueAt ? new Date(dueAt) : null,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      resetForm()
    } catch (err) {
      console.error('Error creating promise:', err)
      setError('Failed to create promise')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (promise, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updatedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      }
      if (newStatus === 'done') {
        updateData.completedAt = serverTimestamp()
        updateData.completedBy = currentUser.uid
      }
      await updateDoc(doc(db, 'chats', chatId, 'promises', promise.id), updateData)
    } catch (err) {
      console.error('Error updating promise:', err)
    }
  }

  const handleDelete = async (promiseId) => {
    if (!window.confirm('Delete this promise?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'promises', promiseId))
    } catch (err) {
      console.error('Error deleting promise:', err)
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

  const getOwnerLabel = (uid) => {
    if (uid === currentUser.uid) return 'You'
    return 'Friend'
  }

  const friendUid = chatMembers.find((m) => m !== currentUser.uid)

  const pendingPromises = promises.filter((p) => p.status === 'pending')
  const otherPromises = promises.filter((p) => p.status !== 'pending')

  if (loading) {
    return <div className="promises-container loading">Loading promises...</div>
  }

  return (
    <div className="promises-container">
      <div className="promises-header">
        <h2>Promises</h2>
        <button
          className="add-promise-btn"
          onClick={() => {
            if (showForm) resetForm()
            else {
              setOwnerUid(currentUser.uid)
              setShowForm(true)
            }
          }}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form className="promise-form" onSubmit={handleSubmit}>
          {error && <div className="promise-error">{error}</div>}
          <input
            type="text"
            placeholder="What was promised..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="promise-input"
          />
          <textarea
            placeholder="Details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            className="promise-textarea"
            rows={2}
          />
          <div className="promise-row">
            <select
              value={ownerUid}
              onChange={(e) => setOwnerUid(e.target.value)}
              className="promise-select"
            >
              <option value={currentUser.uid}>I promised</option>
              {friendUid && <option value={friendUid}>Friend promised</option>}
            </select>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="promise-date"
              placeholder="Due date"
            />
          </div>
          <button type="submit" disabled={saving} className="promise-submit">
            {saving ? 'Saving...' : 'Track Promise'}
          </button>
        </form>
      )}

      {promises.length === 0 ? (
        <div className="no-promises">
          <p>No promises tracked yet</p>
          <p className="hint">Use ⋯ on a message to track it as a promise</p>
        </div>
      ) : (
        <>
          {pendingPromises.length > 0 && (
            <div className="promises-section">
              <h3>Pending</h3>
              <div className="promises-list">
                {pendingPromises.map((promise) => (
                  <div key={promise.id} className="promise-item pending">
                    <div className="promise-content">
                      <div className="promise-title">{promise.title}</div>
                      {promise.description && (
                        <div className="promise-description">{promise.description}</div>
                      )}
                      <div className="promise-meta">
                        <span className="promise-owner">{getOwnerLabel(promise.ownerUid)} promised</span>
                        {promise.dueAt && (
                          <span className="promise-due">Due: {formatDate(promise.dueAt)}</span>
                        )}
                      </div>
                      {promise.sourceMessageTextPreview && (
                        <div className="promise-source">"{promise.sourceMessageTextPreview}"</div>
                      )}
                    </div>
                    <div className="promise-actions">
                      <button
                        className="promise-done-btn"
                        onClick={() => handleStatusChange(promise, 'done')}
                        title="Mark done"
                      >
                        ✓
                      </button>
                      <button
                        className="promise-cancel-btn"
                        onClick={() => handleStatusChange(promise, 'cancelled')}
                        title="Cancel"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherPromises.length > 0 && (
            <div className="promises-section">
              <h3>Completed / Cancelled</h3>
              <div className="promises-list">
                {otherPromises.map((promise) => (
                  <div key={promise.id} className={`promise-item ${promise.status}`}>
                    <div className="promise-content">
                      <div className="promise-title">{promise.title}</div>
                      <div className="promise-meta">
                        <span className={`promise-status ${promise.status}`}>
                          {promise.status === 'done' ? 'Done' : 'Cancelled'}
                        </span>
                        <span className="promise-owner">by {getOwnerLabel(promise.ownerUid)}</span>
                      </div>
                    </div>
                    <button
                      className="promise-delete-btn"
                      onClick={() => handleDelete(promise.id)}
                      title="Delete"
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

export default Promises
