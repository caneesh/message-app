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

const COLORS = ['#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', '#fce4ec', '#e0f7fa']

function Capsules({ currentUser, chatId }) {
  const [capsules, setCapsules] = useState([])
  const [links, setLinks] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCapsule, setEditingCapsule] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedCapsule, setSelectedCapsule] = useState(null)

  useEffect(() => {
    const capsulesRef = collection(db, 'chats', chatId, 'capsules')
    const q = query(capsulesRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCapsules(data)
      setLoading(false)

      data.forEach((capsule) => {
        subscribeToLinks(capsule.id)
      })
    })

    return unsubscribe
  }, [chatId])

  const linkUnsubscribes = {}

  const subscribeToLinks = (capsuleId) => {
    if (linkUnsubscribes[capsuleId]) return

    const linksRef = collection(db, 'chats', chatId, 'capsules', capsuleId, 'links')
    const q = query(linksRef, orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setLinks((prev) => ({ ...prev, [capsuleId]: data }))
    }, () => {})

    linkUnsubscribes[capsuleId] = unsubscribe
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingCapsule(null)
    setTitle('')
    setDescription('')
    setColor(COLORS[0])
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (trimmedTitle.length > 100) {
      setError('Title must be 100 characters or less')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingCapsule) {
        await updateDoc(doc(db, 'chats', chatId, 'capsules', editingCapsule.id), {
          title: trimmedTitle,
          description: description.trim(),
          color,
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'chats', chatId, 'capsules'), {
          title: trimmedTitle,
          description: description.trim(),
          color,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      resetForm()
    } catch (err) {
      console.error('Error saving capsule:', err)
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (capsule) => {
    setEditingCapsule(capsule)
    setTitle(capsule.title)
    setDescription(capsule.description || '')
    setColor(capsule.color || COLORS[0])
    setShowForm(true)
  }

  const handleDelete = async (capsuleId) => {
    if (!window.confirm('Delete this capsule and all its links?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'capsules', capsuleId))
      if (selectedCapsule?.id === capsuleId) setSelectedCapsule(null)
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  const handleDeleteLink = async (capsuleId, linkId) => {
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'capsules', capsuleId, 'links', linkId))
    } catch (err) {
      console.error('Error deleting link:', err)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'message': return '💬'
      case 'reminder': return '⏰'
      case 'decision': return '⚖️'
      case 'note': return '📝'
      case 'event': return '📅'
      case 'memory': return '📸'
      case 'vaultItem': return '🔐'
      default: return '📎'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'message': return 'Message'
      case 'reminder': return 'Reminder'
      case 'decision': return 'Decision'
      case 'note': return 'Note'
      case 'event': return 'Event'
      case 'memory': return 'Memory'
      case 'vaultItem': return 'Vault Item'
      default: return type
    }
  }

  if (loading) {
    return <div className="capsules-container loading">Loading...</div>
  }

  return (
    <div className="capsules-container">
      <div className="capsules-header">
        <h2>Context Capsules</h2>
        <button
          className="add-capsule-btn"
          onClick={() => {
            if (showForm) resetForm()
            else setShowForm(true)
          }}
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      <p className="capsules-intro">
        Group related items around important topics like trips, projects, or decisions.
      </p>

      {showForm && (
        <form className="capsule-form" onSubmit={handleSubmit}>
          {error && <div className="capsule-error">{error}</div>}
          <input
            type="text"
            placeholder="Capsule name (e.g., House Repair, Trip to Paris)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="capsule-input"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="capsule-textarea"
            rows={2}
          />
          <div className="capsule-colors">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-btn ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <button type="submit" disabled={saving} className="capsule-submit">
            {saving ? 'Saving...' : editingCapsule ? 'Update' : 'Create Capsule'}
          </button>
        </form>
      )}

      {capsules.length === 0 && !showForm ? (
        <div className="no-capsules">
          No capsules yet. Create one to organize related items!
        </div>
      ) : (
        <div className="capsules-grid">
          {capsules.map((capsule) => {
            const capsuleLinks = links[capsule.id] || []
            return (
              <div
                key={capsule.id}
                className="capsule-card"
                style={{ background: capsule.color || COLORS[0] }}
                onClick={() => setSelectedCapsule(capsule)}
              >
                <h3 className="capsule-title">{capsule.title}</h3>
                {capsule.description && (
                  <p className="capsule-description">{capsule.description}</p>
                )}
                <div className="capsule-link-count">
                  {capsuleLinks.length} item{capsuleLinks.length !== 1 ? 's' : ''}
                </div>
                <div className="capsule-card-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(capsule)
                    }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(capsule.id)
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

      {selectedCapsule && (
        <div className="capsule-detail-overlay" onClick={() => setSelectedCapsule(null)}>
          <div
            className="capsule-detail"
            style={{ borderTopColor: selectedCapsule.color }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="capsule-detail-header">
              <h3>{selectedCapsule.title}</h3>
              <button onClick={() => setSelectedCapsule(null)}>×</button>
            </div>

            {selectedCapsule.description && (
              <p className="capsule-detail-description">{selectedCapsule.description}</p>
            )}

            <div className="capsule-links-section">
              <h4>Linked Items</h4>
              {(links[selectedCapsule.id] || []).length === 0 ? (
                <div className="no-links">
                  No items linked yet. Use ⋯ on messages to add items to this capsule.
                </div>
              ) : (
                <div className="capsule-links-list">
                  {(links[selectedCapsule.id] || []).map((link) => (
                    <div key={link.id} className="capsule-link-item">
                      <span className="link-icon">{getTypeIcon(link.targetType)}</span>
                      <div className="link-content">
                        <span className="link-type">{getTypeLabel(link.targetType)}</span>
                        <span className="link-preview">{link.textPreview}</span>
                      </div>
                      <button
                        className="link-delete"
                        onClick={() => handleDeleteLink(selectedCapsule.id, link.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Capsules
