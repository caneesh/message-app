import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, doc, getDoc } from 'firebase/firestore'
import { useUserMediaState } from '../hooks/useUserMediaState'
import { useSecureFileUrl } from '../hooks/useSecureFileUrl'
import { isPinConfigured, verifyPin } from '../utils/pinSecurity'
import { isVideoContentType } from '../utils/messageExtractors'

function HiddenMediaThumbnail({ chatId, messageId, onUnhide, onDelete }) {
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMessage() {
      try {
        const msgRef = doc(db, 'chats', chatId, 'messages', messageId)
        const msgDoc = await getDoc(msgRef)
        if (msgDoc.exists()) {
          setMessage({ id: msgDoc.id, ...msgDoc.data() })
        }
      } catch (err) {
        console.error('Error loading hidden message:', err)
      } finally {
        setLoading(false)
      }
    }
    loadMessage()
  }, [chatId, messageId])

  const file = message?.file
  const { url, loading: urlLoading } = useSecureFileUrl(chatId, file?.storagePath)

  if (loading || urlLoading) {
    return <div className="hidden-media-item loading" />
  }

  if (!message || !file || !url) {
    return (
      <div className="hidden-media-item error">
        <span>Media unavailable</span>
        <button onClick={() => onDelete(messageId)} className="hidden-media-remove-btn">
          Remove
        </button>
      </div>
    )
  }

  const isVideo = isVideoContentType(file.contentType)

  return (
    <div className="hidden-media-item">
      <div className="hidden-media-preview">
        {isVideo ? (
          <>
            <video src={url} preload="metadata" />
            <div className="hidden-media-play-icon">▶</div>
          </>
        ) : (
          <img src={url} alt={file.fileName || 'Hidden image'} />
        )}
      </div>
      <div className="hidden-media-actions">
        <button onClick={() => onUnhide(messageId)} className="hidden-media-unhide-btn">
          Unhide
        </button>
        <button onClick={() => onDelete(messageId)} className="hidden-media-delete-btn">
          Delete
        </button>
      </div>
    </div>
  )
}

function PinEntry({ onVerify, onCancel }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    setVerifying(true)
    setError('')

    const isValid = await verifyPin(pin)
    if (isValid) {
      onVerify()
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
    setVerifying(false)
  }

  return (
    <div className="pin-entry-container">
      <h3>Enter PIN to view hidden media</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter PIN"
          autoFocus
          disabled={verifying}
        />
        {error && <div className="pin-error">{error}</div>}
        <div className="pin-entry-actions">
          <button type="button" onClick={onCancel} disabled={verifying}>
            Cancel
          </button>
          <button type="submit" disabled={verifying || pin.length < 4}>
            {verifying ? 'Verifying...' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  )
}

function HiddenMedia({ currentUser, chatId, onClose }) {
  const [pinVerified, setPinVerified] = useState(false)
  const [activeTab, setActiveTab] = useState('hidden')
  const {
    hiddenItems,
    deletedItems,
    unhideMedia,
    deleteMediaForMe,
    restoreMedia,
    loading
  } = useUserMediaState(chatId, currentUser?.uid)

  const hasPinConfigured = isPinConfigured()

  useEffect(() => {
    if (!hasPinConfigured) {
      setPinVerified(true)
    }
  }, [hasPinConfigured])

  const handleUnhide = useCallback(async (messageId) => {
    if (window.confirm('Unhide this media? It will appear in your chat and shared media again.')) {
      await unhideMedia(messageId)
    }
  }, [unhideMedia])

  const handleDelete = useCallback(async (messageId) => {
    if (window.confirm('Delete this from hidden? You can still see it in the chat.')) {
      await restoreMedia(messageId)
    }
  }, [restoreMedia])

  const handleRestore = useCallback(async (messageId) => {
    if (window.confirm('Restore this media? It will appear in your chat again.')) {
      await restoreMedia(messageId)
    }
  }, [restoreMedia])

  const handlePermanentlyHide = useCallback(async (messageId, mediaKind) => {
    await deleteMediaForMe(messageId, mediaKind)
  }, [deleteMediaForMe])

  if (!pinVerified && hasPinConfigured) {
    return (
      <div className="hidden-media-container">
        <div className="hidden-media-header">
          <button className="hidden-media-back" onClick={onClose}>←</button>
          <h2>Hidden Media</h2>
        </div>
        <PinEntry onVerify={() => setPinVerified(true)} onCancel={onClose} />
      </div>
    )
  }

  const tabs = [
    { id: 'hidden', label: 'Hidden', count: hiddenItems.length },
    { id: 'deleted', label: 'Deleted', count: deletedItems.length }
  ]

  return (
    <div className="hidden-media-container">
      <div className="hidden-media-header">
        <button className="hidden-media-back" onClick={onClose}>←</button>
        <h2>Hidden Media</h2>
      </div>

      <div className="hidden-media-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`hidden-media-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="hidden-media-content">
        {loading ? (
          <div className="hidden-media-loading">Loading...</div>
        ) : activeTab === 'hidden' ? (
          hiddenItems.length === 0 ? (
            <div className="hidden-media-empty">
              <p>No hidden media</p>
              <p className="hidden-media-hint">
                Hide photos and videos from the message menu to move them here.
              </p>
            </div>
          ) : (
            <div className="hidden-media-grid">
              {hiddenItems.map(item => (
                <HiddenMediaThumbnail
                  key={item.messageId}
                  chatId={chatId}
                  messageId={item.messageId}
                  onUnhide={handleUnhide}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )
        ) : (
          deletedItems.length === 0 ? (
            <div className="hidden-media-empty">
              <p>No deleted media</p>
              <p className="hidden-media-hint">
                Media you delete for yourself will appear here for 30 days.
              </p>
            </div>
          ) : (
            <div className="hidden-media-grid">
              {deletedItems.map(item => (
                <HiddenMediaThumbnail
                  key={item.messageId}
                  chatId={chatId}
                  messageId={item.messageId}
                  onUnhide={handleRestore}
                  onDelete={() => {}}
                />
              ))}
            </div>
          )
        )}
      </div>

      {!hasPinConfigured && (
        <div className="hidden-media-no-pin-warning">
          Set up a PIN in Settings to protect your hidden media.
        </div>
      )}
    </div>
  )
}

export default HiddenMedia
