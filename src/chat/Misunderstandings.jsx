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

function Misunderstandings({ currentUser, chatId }) {
  const [markers, setMarkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [whatIMeant, setWhatIMeant] = useState('')
  const [whatIHeard, setWhatIHeard] = useState('')
  const [whatINeed, setWhatINeed] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [response, setResponse] = useState('')

  useEffect(() => {
    const markersRef = collection(db, 'chats', chatId, 'misunderstandings')
    const q = query(markersRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setMarkers(data)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setShowForm(false)
    setWhatIMeant('')
    setWhatIHeard('')
    setWhatINeed('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!whatIMeant.trim() && !whatIHeard.trim() && !whatINeed.trim()) {
      setError('Please fill in at least one field')
      return
    }

    setSaving(true)
    setError('')

    try {
      await addDoc(collection(db, 'chats', chatId, 'misunderstandings'), {
        whatIMeant: whatIMeant.trim(),
        whatIHeard: whatIHeard.trim(),
        whatINeed: whatINeed.trim(),
        status: 'open',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      resetForm()
    } catch (err) {
      console.error('Error creating marker:', err)
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleResolve = async (markerId) => {
    try {
      await updateDoc(doc(db, 'chats', chatId, 'misunderstandings', markerId), {
        status: 'resolved',
        resolvedBy: currentUser.uid,
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setSelectedMarker(null)
    } catch (err) {
      console.error('Error resolving:', err)
    }
  }

  const handleAddResponse = async () => {
    if (!selectedMarker || !response.trim()) return

    try {
      await updateDoc(doc(db, 'chats', chatId, 'misunderstandings', selectedMarker.id), {
        responseByOther: response.trim(),
        updatedAt: serverTimestamp(),
      })
      setResponse('')
    } catch (err) {
      console.error('Error adding response:', err)
    }
  }

  const handleDelete = async (markerId) => {
    if (!window.confirm('Delete this?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'misunderstandings', markerId))
      if (selectedMarker?.id === markerId) setSelectedMarker(null)
    } catch (err) {
      console.error('Error deleting:', err)
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

  const openMarkers = markers.filter((m) => m.status === 'open')
  const resolvedMarkers = markers.filter((m) => m.status === 'resolved')

  if (loading) {
    return <div className="misunderstandings-container loading">Loading...</div>
  }

  return (
    <div className="misunderstandings-container">
      <div className="misunderstandings-header">
        <h2>Clear the Air</h2>
        <button
          className="add-marker-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      <p className="misunderstandings-intro">
        When things feel confusing, take a moment to clarify what's happening.
      </p>

      {showForm && (
        <form className="marker-form" onSubmit={handleSubmit}>
          {error && <div className="marker-error">{error}</div>}
          <div className="marker-field">
            <label>What I meant to say...</label>
            <textarea
              value={whatIMeant}
              onChange={(e) => setWhatIMeant(e.target.value)}
              placeholder="I was trying to express..."
              maxLength={1000}
              rows={3}
            />
          </div>
          <div className="marker-field">
            <label>What I heard...</label>
            <textarea
              value={whatIHeard}
              onChange={(e) => setWhatIHeard(e.target.value)}
              placeholder="It sounded like you were saying..."
              maxLength={1000}
              rows={3}
            />
          </div>
          <div className="marker-field">
            <label>What I need...</label>
            <textarea
              value={whatINeed}
              onChange={(e) => setWhatINeed(e.target.value)}
              placeholder="It would help me if..."
              maxLength={1000}
              rows={3}
            />
          </div>
          <button type="submit" disabled={saving} className="marker-submit">
            {saving ? 'Saving...' : 'Share This'}
          </button>
        </form>
      )}

      {markers.length === 0 && !showForm ? (
        <div className="no-markers">
          No misunderstandings to clear. That's great!
        </div>
      ) : (
        <>
          {openMarkers.length > 0 && (
            <div className="markers-section">
              <h3>Open</h3>
              <div className="markers-list">
                {openMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    className={`marker-card ${marker.createdBy === currentUser.uid ? 'own' : ''}`}
                    onClick={() => setSelectedMarker(marker)}
                  >
                    <div className="marker-meta">
                      {marker.createdBy === currentUser.uid ? 'You' : 'Friend'} • {formatDate(marker.createdAt)}
                    </div>
                    {marker.whatIMeant && (
                      <div className="marker-preview">"{marker.whatIMeant.slice(0, 100)}..."</div>
                    )}
                    {marker.responseByOther && (
                      <div className="marker-has-response">Has response</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolvedMarkers.length > 0 && (
            <div className="markers-section">
              <h3>Resolved</h3>
              <div className="markers-list">
                {resolvedMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    className="marker-card resolved"
                    onClick={() => setSelectedMarker(marker)}
                  >
                    <div className="marker-meta">
                      Resolved {formatDate(marker.resolvedAt)}
                    </div>
                    {marker.whatIMeant && (
                      <div className="marker-preview">"{marker.whatIMeant.slice(0, 60)}..."</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedMarker && (
        <div className="marker-detail-overlay" onClick={() => setSelectedMarker(null)}>
          <div className="marker-detail" onClick={(e) => e.stopPropagation()}>
            <div className="marker-detail-header">
              <h3>Clearing the Air</h3>
              <button onClick={() => setSelectedMarker(null)}>×</button>
            </div>

            <div className="marker-detail-content">
              <div className="marker-author">
                Started by {selectedMarker.createdBy === currentUser.uid ? 'You' : 'Friend'}
              </div>

              {selectedMarker.whatIMeant && (
                <div className="marker-section">
                  <label>What they meant:</label>
                  <p>{selectedMarker.whatIMeant}</p>
                </div>
              )}

              {selectedMarker.whatIHeard && (
                <div className="marker-section">
                  <label>What they heard:</label>
                  <p>{selectedMarker.whatIHeard}</p>
                </div>
              )}

              {selectedMarker.whatINeed && (
                <div className="marker-section">
                  <label>What they need:</label>
                  <p>{selectedMarker.whatINeed}</p>
                </div>
              )}

              {selectedMarker.responseByOther && (
                <div className="marker-section response">
                  <label>Response:</label>
                  <p>{selectedMarker.responseByOther}</p>
                </div>
              )}

              {selectedMarker.status === 'open' && selectedMarker.createdBy !== currentUser.uid && !selectedMarker.responseByOther && (
                <div className="marker-respond">
                  <label>Your response:</label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="I understand now. Here's what I want you to know..."
                    maxLength={1000}
                    rows={3}
                  />
                  <button onClick={handleAddResponse} disabled={!response.trim()}>
                    Send Response
                  </button>
                </div>
              )}

              <div className="marker-detail-actions">
                {selectedMarker.status === 'open' && (
                  <button className="resolve-btn" onClick={() => handleResolve(selectedMarker.id)}>
                    Mark Resolved
                  </button>
                )}
                <button className="delete-btn" onClick={() => handleDelete(selectedMarker.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Misunderstandings
