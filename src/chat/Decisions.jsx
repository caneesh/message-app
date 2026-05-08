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
  const [editingDecision, setEditingDecision] = useState(null)
  const [title, setTitle] = useState('')
  const [decision, setDecision] = useState('')
  const [reason, setReason] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [status, setStatus] = useState('active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [changeHistory, setChangeHistory] = useState({})
  const [showHistory, setShowHistory] = useState(null)

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

      // Subscribe to change history for each decision
      decisionList.forEach((dec) => {
        subscribeToChanges(dec.id)
      })
    })

    return unsubscribe
  }, [chatId])

  const changeUnsubscribes = {}

  const subscribeToChanges = (decisionId) => {
    if (changeUnsubscribes[decisionId]) return

    const changesRef = collection(db, 'chats', chatId, 'decisions', decisionId, 'changes')
    const q = query(changesRef, orderBy('changedAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const changes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setChangeHistory((prev) => ({ ...prev, [decisionId]: changes }))
    }, () => {})

    changeUnsubscribes[decisionId] = unsubscribe
  }

  const resetForm = () => {
    setTitle('')
    setDecision('')
    setReason('')
    setChangeReason('')
    setStatus('active')
    setEditingId(null)
    setEditingDecision(null)
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
        // Check if decision text changed and create a change record
        if (editingDecision && trimmedDecision !== editingDecision.decision) {
          await addDoc(collection(db, 'chats', chatId, 'decisions', editingId, 'changes'), {
            oldDecision: editingDecision.decision,
            newDecision: trimmedDecision,
            reason: changeReason.trim(),
            changedBy: currentUser.uid,
            changedAt: serverTimestamp(),
          })
        }

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
    setChangeReason('')
    setStatus(dec.status)
    setEditingId(dec.id)
    setEditingDecision(dec)
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
            <>
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
              {editingDecision && decision.trim() !== editingDecision.decision && (
                <textarea
                  placeholder="Why are you changing this decision? (optional)"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  maxLength={500}
                  className="decision-textarea change-reason"
                  rows={2}
                />
              )}
            </>
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
                {(changeHistory[dec.id] || []).length > 0 && (
                  <button
                    className="decision-history-btn"
                    onClick={() => setShowHistory(showHistory === dec.id ? null : dec.id)}
                  >
                    History ({(changeHistory[dec.id] || []).length})
                  </button>
                )}
                <button className="decision-delete" onClick={() => handleDelete(dec.id)}>
                  Delete
                </button>
              </div>
              {showHistory === dec.id && (changeHistory[dec.id] || []).length > 0 && (
                <div className="decision-change-history">
                  <h4>Change History</h4>
                  {(changeHistory[dec.id] || []).map((change) => (
                    <div key={change.id} className="change-record">
                      <div className="change-diff">
                        <span className="old-value">{change.oldDecision}</span>
                        <span className="change-arrow">→</span>
                        <span className="new-value">{change.newDecision}</span>
                      </div>
                      {change.reason && <div className="change-reason-text">Reason: {change.reason}</div>}
                      <div className="change-meta">{formatDate(change.changedAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Decisions
