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

const STATUS_OPTIONS = ['active', 'changed', 'cancelled']

function Decisions({ currentUser, chatId }) {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [decision, setDecision] = useState('')
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState('active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const decisionsRef = collection(db, 'chats', chatId, 'decisions')
    const q = query(decisionsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const decisionList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setDecisions(decisionList)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setTitle('')
    setDecision('')
    setReason('')
    setStatus('active')
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedDecision = decision.trim()

    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (trimmedTitle.length > 200) {
      setError('Title must be 200 characters or less')
      return
    }
    if (!trimmedDecision) {
      setError('Decision is required')
      return
    }
    if (trimmedDecision.length > 2000) {
      setError('Decision must be 2000 characters or less')
      return
    }
    if (reason.length > 2000) {
      setError('Reason must be 2000 characters or less')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingId) {
        await updateDoc(doc(db, 'chats', chatId, 'decisions', editingId), {
          title: trimmedTitle,
          decision: trimmedDecision,
          reason: reason.trim(),
          status,
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'chats', chatId, 'decisions'), {
          title: trimmedTitle,
          decision: trimmedDecision,
          reason: reason.trim(),
          status: 'active',
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      resetForm()
    } catch (err) {
      console.error('Error saving decision:', err)
      setError('Failed to save decision')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (dec) => {
    setTitle(dec.title)
    setDecision(dec.decision)
    setReason(dec.reason || '')
    setStatus(dec.status)
    setEditingId(dec.id)
    setShowForm(true)
  }

  const handleDelete = async (decisionId) => {
    if (!window.confirm('Delete this decision?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'decisions', decisionId))
    } catch (err) {
      console.error('Error deleting decision:', err)
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="status-badge active">Active</span>
      case 'changed':
        return <span className="status-badge changed">Changed</span>
      case 'cancelled':
        return <span className="status-badge cancelled">Cancelled</span>
      default:
        return null
    }
  }

  if (loading) {
    return <div className="decisions-container loading">Loading decisions...</div>
  }

  return (
    <div className="decisions-container">
      <div className="decisions-header">
        <h2>Shared Decisions</h2>
        <button
          className="add-decision-btn"
          onClick={() => {
            if (showForm) resetForm()
            else setShowForm(true)
          }}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form className="decision-form" onSubmit={handleSubmit}>
          {error && <div className="decision-error">{error}</div>}
          <input
            type="text"
            placeholder="Decision title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="decision-input"
          />
          <textarea
            placeholder="What was decided..."
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            maxLength={2000}
            className="decision-textarea"
            rows={3}
          />
          <textarea
            placeholder="Reason/context (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={2000}
            className="decision-textarea"
            rows={2}
          />
          {editingId && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="decision-select"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          )}
          <button type="submit" disabled={saving} className="decision-submit">
            {saving ? 'Saving...' : editingId ? 'Update Decision' : 'Save Decision'}
          </button>
        </form>
      )}

      {decisions.length === 0 ? (
        <div className="no-decisions">No decisions recorded yet</div>
      ) : (
        <div className="decisions-list">
          {decisions.map((dec) => (
            <div key={dec.id} className={`decision-item ${dec.status}`}>
              <div className="decision-header-row">
                <div className="decision-title">{dec.title}</div>
                {getStatusBadge(dec.status)}
              </div>
              <div className="decision-content">{dec.decision}</div>
              {dec.reason && (
                <div className="decision-reason">
                  <strong>Why:</strong> {dec.reason}
                </div>
              )}
              <div className="decision-meta">
                {formatDate(dec.createdAt)}
                {dec.updatedAt && dec.updatedBy && dec.updatedAt !== dec.createdAt && (
                  <span> (updated)</span>
                )}
              </div>
              <div className="decision-actions">
                <button className="decision-edit" onClick={() => handleEdit(dec)}>
                  Edit
                </button>
                <button className="decision-delete" onClick={() => handleDelete(dec.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Decisions
