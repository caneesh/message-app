import { useState, useEffect } from 'react'
import { db, functions } from '../firebase/firebaseConfig'
import { collection, doc, getDocs, setDoc, getDoc, deleteDoc, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

function Settings({ currentUser, chatId, onChatJoined }) {
  const [pinEnabled, setPinEnabled] = useState(() => {
    return localStorage.getItem('appPinEnabled') === 'true'
  })
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [exporting, setExporting] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [generatedInvite, setGeneratedInvite] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemError, setRedeemError] = useState('')
  const [redeemSuccess, setRedeemSuccess] = useState('')

  const [deleteRequestStatus, setDeleteRequestStatus] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deletingAllMessages, setDeletingAllMessages] = useState(false)
  const [deleteAllProgress, setDeleteAllProgress] = useState('')

  useEffect(() => {
    if (currentUser) {
      const checkStatus = async () => {
        try {
          const docRef = doc(db, 'accountDeletionRequests', currentUser.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            setDeleteRequestStatus(docSnap.data().status || 'pending')
          }
        } catch (err) {
          console.error('Error checking delete request:', err)
        }
      }
      checkStatus()
    }
  }, [currentUser])

  const handleCreateInvite = async () => {
    if (!chatId) {
      setInviteError('No chat selected')
      return
    }
    setInviteLoading(true)
    setInviteError('')
    setGeneratedInvite(null)
    try {
      const createInvite = httpsCallable(functions, 'createInvite')
      const result = await createInvite({ chatId })
      setGeneratedInvite(result.data)
    } catch (err) {
      console.error('Create invite error:', err)
      setInviteError(err.message || 'Failed to create invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRedeemInvite = async () => {
    if (!redeemCode.trim()) {
      setRedeemError('Please enter an invite code')
      return
    }
    setRedeemLoading(true)
    setRedeemError('')
    setRedeemSuccess('')
    try {
      const redeemInvite = httpsCallable(functions, 'redeemInvite')
      const result = await redeemInvite({ inviteCode: redeemCode.trim() })
      setRedeemSuccess(`Joined chat successfully!`)
      setRedeemCode('')
      if (onChatJoined) {
        onChatJoined(result.data.chatId)
      }
    } catch (err) {
      console.error('Redeem invite error:', err)
      setRedeemError(err.message || 'Failed to redeem invite')
    } finally {
      setRedeemLoading(false)
    }
  }

  const copyInviteCode = () => {
    if (generatedInvite?.inviteCode) {
      navigator.clipboard.writeText(generatedInvite.inviteCode)
    }
  }

  const handleRequestAccountDeletion = async () => {
    if (!currentUser) return
    if (!confirm('Are you sure you want to request account deletion? This cannot be undone once processed.')) {
      return
    }
    setDeleteLoading(true)
    try {
      const docRef = doc(db, 'accountDeletionRequests', currentUser.uid)
      await setDoc(docRef, {
        uid: currentUser.uid,
        email: currentUser.email || null,
        requestedAt: serverTimestamp(),
        status: 'pending',
      })
      setDeleteRequestStatus('pending')
    } catch (err) {
      console.error('Error requesting deletion:', err)
      alert('Failed to submit deletion request. Please contact support.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDeleteAllMessages = async () => {
    if (!chatId) return

    const confirmText = 'DELETE ALL'
    const userInput = prompt(
      `This will permanently delete ALL messages in this chat for both you and your partner.\n\nThis action cannot be undone.\n\nType "${confirmText}" to confirm:`
    )

    if (userInput !== confirmText) {
      if (userInput !== null) {
        alert('Deletion cancelled. Text did not match.')
      }
      return
    }

    setDeletingAllMessages(true)
    setDeleteAllProgress('Fetching messages...')

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      const snapshot = await getDocs(messagesRef)

      if (snapshot.empty) {
        setDeleteAllProgress('')
        alert('No messages to delete.')
        setDeletingAllMessages(false)
        return
      }

      const totalMessages = snapshot.docs.length
      let deleted = 0

      // Delete in batches of 500 (Firestore limit)
      const batchSize = 500
      const batches = []
      let currentBatch = writeBatch(db)
      let operationCount = 0

      for (const docSnap of snapshot.docs) {
        currentBatch.delete(docSnap.ref)
        operationCount++

        if (operationCount === batchSize) {
          batches.push(currentBatch)
          currentBatch = writeBatch(db)
          operationCount = 0
        }
      }

      if (operationCount > 0) {
        batches.push(currentBatch)
      }

      for (let i = 0; i < batches.length; i++) {
        setDeleteAllProgress(`Deleting batch ${i + 1} of ${batches.length}...`)
        await batches[i].commit()
        deleted += Math.min(batchSize, totalMessages - (i * batchSize))
      }

      setDeleteAllProgress('')
      alert(`Successfully deleted ${totalMessages} messages.`)
    } catch (err) {
      console.error('Error deleting messages:', err)
      alert('Failed to delete all messages. Some messages may remain.')
    } finally {
      setDeletingAllMessages(false)
      setDeleteAllProgress('')
    }
  }

  const handleSetPin = () => {
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match')
      return
    }
    localStorage.setItem('appPin', newPin)
    localStorage.setItem('appPinEnabled', 'true')
    setPinEnabled(true)
    setShowPinSetup(false)
    setNewPin('')
    setConfirmPin('')
    setPinError('')
  }

  const handleDisablePin = () => {
    localStorage.removeItem('appPin')
    localStorage.removeItem('appPinEnabled')
    localStorage.removeItem('appLocked')
    setPinEnabled(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        chatId,
        messages: [],
        reminders: [],
        notes: [],
        importantDates: [],
        lists: [],
        memories: [],
        events: [],
      }

      const messagesSnap = await getDocs(
        query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt'))
      )
      data.messages = messagesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
      }))

      const remindersSnap = await getDocs(collection(db, 'chats', chatId, 'reminders'))
      data.reminders = remindersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))

      const notesSnap = await getDocs(collection(db, 'chats', chatId, 'notes'))
      data.notes = notesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))

      const datesSnap = await getDocs(collection(db, 'chats', chatId, 'importantDates'))
      data.importantDates = datesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))

      const listsSnap = await getDocs(collection(db, 'chats', chatId, 'lists'))
      for (const listDoc of listsSnap.docs) {
        const itemsSnap = await getDocs(collection(db, 'chats', chatId, 'lists', listDoc.id, 'items'))
        data.lists.push({
          id: listDoc.id,
          ...listDoc.data(),
          items: itemsSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
        })
      }

      const memoriesSnap = await getDocs(collection(db, 'chats', chatId, 'memories'))
      data.memories = memoriesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))

      const eventsSnap = await getDocs(collection(db, 'chats', chatId, 'events'))
      data.events = eventsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="settings-container">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>App Lock</h3>
        <p className="settings-note">
          Local PIN lock for casual privacy. This is stored in your browser only and is not strong security.
        </p>
        {pinEnabled ? (
          <button className="settings-btn danger" onClick={handleDisablePin}>
            Disable PIN Lock
          </button>
        ) : showPinSetup ? (
          <div className="pin-setup">
            {pinError && <div className="pin-error">{pinError}</div>}
            <input
              type="password"
              placeholder="Enter PIN (4+ digits)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              maxLength={8}
              className="pin-input"
            />
            <input
              type="password"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              maxLength={8}
              className="pin-input"
            />
            <div className="pin-actions">
              <button className="settings-btn" onClick={handleSetPin}>
                Set PIN
              </button>
              <button className="settings-btn secondary" onClick={() => setShowPinSetup(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="settings-btn" onClick={() => setShowPinSetup(true)}>
            Enable PIN Lock
          </button>
        )}
      </div>

      <div className="settings-section">
        <h3>Auto-Delete Messages</h3>
        <p className="settings-note">
          Reliable auto-delete requires a backend Cloud Function. Client-only cleanup is not guaranteed.
          This feature is not yet implemented.
        </p>
      </div>

      <div className="settings-section">
        <h3>Export Data</h3>
        <p className="settings-note">
          Download all your messages, notes, reminders, dates, and lists as a JSON file.
        </p>
        <button className="settings-btn" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export Chat Data'}
        </button>
      </div>

      {chatId && (
        <div className="settings-section">
          <h3>Invite Partner</h3>
          <p className="settings-note">
            Create an invite code for your partner to join this chat. The code expires in 24 hours and can only be used once.
          </p>
          {inviteError && <div className="settings-error">{inviteError}</div>}
          {generatedInvite ? (
            <div className="invite-result">
              <div className="invite-code-display">
                <code>{generatedInvite.inviteCode}</code>
                <button className="settings-btn small" onClick={copyInviteCode}>Copy</button>
              </div>
              <p className="settings-note">
                Expires: {new Date(generatedInvite.expiresAt).toLocaleString()}
              </p>
              <button className="settings-btn secondary" onClick={() => setGeneratedInvite(null)}>
                Create New Invite
              </button>
            </div>
          ) : (
            <button className="settings-btn" onClick={handleCreateInvite} disabled={inviteLoading}>
              {inviteLoading ? 'Creating...' : 'Create Invite Code'}
            </button>
          )}
        </div>
      )}

      <div className="settings-section">
        <h3>Join with Invite Code</h3>
        <p className="settings-note">
          Enter an invite code from your partner to join their chat.
        </p>
        {redeemError && <div className="settings-error">{redeemError}</div>}
        {redeemSuccess && <div className="settings-success">{redeemSuccess}</div>}
        <div className="invite-redeem">
          <input
            type="text"
            placeholder="Enter invite code"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            className="settings-input"
            maxLength={12}
          />
          <button
            className="settings-btn"
            onClick={handleRedeemInvite}
            disabled={redeemLoading || !redeemCode.trim()}
          >
            {redeemLoading ? 'Joining...' : 'Join Chat'}
          </button>
        </div>
      </div>

      {chatId && (
        <div className="settings-section danger-zone">
          <h3>Delete All Messages</h3>
          <p className="settings-note">
            Permanently delete all messages in this chat. This affects both you and your partner.
            This action cannot be undone.
          </p>
          {deleteAllProgress && (
            <div className="delete-status processing">{deleteAllProgress}</div>
          )}
          <button
            className="settings-btn danger"
            onClick={handleDeleteAllMessages}
            disabled={deletingAllMessages}
          >
            {deletingAllMessages ? 'Deleting...' : 'Delete All Messages'}
          </button>
        </div>
      )}

      <div className="settings-section danger-zone">
        <h3>Delete Account</h3>
        <p className="settings-note">
          Request deletion of your account and data. This process is manual and may take several days.
          Shared chat data visible to your partner will remain unless they also request deletion.
        </p>
        {deleteRequestStatus === 'pending' ? (
          <div className="delete-status pending">
            Account deletion request is pending. An administrator will process it soon.
          </div>
        ) : deleteRequestStatus === 'processing' ? (
          <div className="delete-status processing">
            Your deletion request is being processed.
          </div>
        ) : deleteRequestStatus === 'completed' ? (
          <div className="delete-status completed">
            Your deletion request has been completed.
          </div>
        ) : (
          <button
            className="settings-btn danger"
            onClick={handleRequestAccountDeletion}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Submitting...' : 'Request Account Deletion'}
          </button>
        )}
      </div>
    </div>
  )
}

export default Settings
