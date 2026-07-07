import { useState, useEffect, useCallback, useRef } from 'react'
import { db, functions } from '../firebase/firebaseConfig'
import { collection, doc, getDocs, setDoc, getDoc, deleteDoc, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import AiSettingsPanel from './AiSettingsPanel'
import { createPinHash, verifyPin, isPinConfigured, clearPin, getPinCreatedAt } from '../utils/pinSecurity'
import { listThoughtsForExport } from '../services/thoughtService'
import { clearAllMessagesForUser, getAllMessagesForExport } from '../services/messageClearService'
import {
  buildThoughtsMarkdownExport,
  buildThoughtsJsonExport,
  downloadTextFile,
  generateExportFilename,
  supportsDownload
} from '../utils/thoughtExportUtils'

const AUTO_LOGOUT_OPTIONS = [
  { value: 2, label: '2 minutes' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 'never', label: 'Never' },
]

function Settings({ currentUser, chatId, onChatJoined, autoLogoutTimeout, onAutoLogoutTimeoutChange, onLogoutNow }) {
  const [pinEnabled, setPinEnabled] = useState(() => isPinConfigured())
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinCreatedAt, setPinCreatedAt] = useState(() => getPinCreatedAt())
  const [exporting, setExporting] = useState(false)
  const [fullExporting, setFullExporting] = useState(false)
  const [exportUnlocked, setExportUnlocked] = useState(false)
  const [exportCodeBuffer, setExportCodeBuffer] = useState('')

  const EXPORT_CODE = '335042249'
  const longPressTimer = useRef(null)

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      const key = e.key
      if (/^\d$/.test(key)) {
        setExportCodeBuffer((prev) => {
          const newBuffer = (prev + key).slice(-EXPORT_CODE.length)
          if (newBuffer === EXPORT_CODE) {
            setExportUnlocked(true)
          }
          return newBuffer
        })
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [])

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setExportUnlocked(true)
    }, 3000)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

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

  // Thoughts export state
  const [thoughtsExportScope, setThoughtsExportScope] = useState('my_thoughts')
  const [thoughtsExportFormat, setThoughtsExportFormat] = useState('markdown')
  const [thoughtsExporting, setThoughtsExporting] = useState(false)
  const [showThoughtsPrivacyConfirm, setShowThoughtsPrivacyConfirm] = useState(false)
  const [showThoughtsFallback, setShowThoughtsFallback] = useState(false)
  const [thoughtsFallbackContent, setThoughtsFallbackContent] = useState('')
  const [thoughtsExportError, setThoughtsExportError] = useState('')

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
    if (!chatId || !currentUser?.uid) return

    // Confirm with user - explain this is a soft delete
    const confirmed = window.confirm(
      'Clear all visible messages from this chat?\n\n' +
      'This only affects your view - your partner can still see their messages.'
    )

    if (!confirmed) return

    setDeletingAllMessages(true)
    setDeleteAllProgress('Clearing messages from view...')

    try {
      const result = await clearAllMessagesForUser(chatId, currentUser.uid)

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear messages')
      }

      setDeleteAllProgress('')

      if (result.clearedCount === 0) {
        alert('No messages to clear.')
      } else {
        alert(`Cleared ${result.clearedCount} messages from chat view.`)
      }
    } catch (err) {
      console.error('Error clearing messages:', err)
      alert('Failed to clear messages. Please try again.')
    } finally {
      setDeletingAllMessages(false)
      setDeleteAllProgress('')
    }
  }

  const handleSetPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      setPinError('PIN must be 4-6 digits')
      return
    }
    if (!/^\d+$/.test(newPin)) {
      setPinError('PIN must contain only digits')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match')
      return
    }

    setPinSaving(true)
    setPinError('')

    try {
      await createPinHash(newPin)
      localStorage.setItem('appPinEnabled', 'true')
      setPinEnabled(true)
      setPinCreatedAt(Date.now())
      setShowPinSetup(false)
      setNewPin('')
      setConfirmPin('')
    } catch (err) {
      setPinError(err.message || 'Failed to set PIN')
    } finally {
      setPinSaving(false)
    }
  }

  const handleDisablePin = () => {
    if (!window.confirm('Disable PIN? Your hidden media will become accessible without a PIN.')) {
      return
    }
    clearPin()
    localStorage.removeItem('appPinEnabled')
    localStorage.removeItem('appLocked')
    setPinEnabled(false)
    setPinCreatedAt(null)
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

      // Get all messages including cleared/archived ones (with metadata)
      const messagesResult = await getAllMessagesForExport(chatId, currentUser?.uid)
      if (messagesResult.success) {
        data.messages = messagesResult.messages
      } else {
        console.warn('Failed to get messages for export:', messagesResult.error)
        // Fallback to direct query
        const messagesSnap = await getDocs(
          query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt'))
        )
        data.messages = messagesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
        }))
      }

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

  const handleFullExport = async () => {
    if (!chatId) {
      alert('No chat selected')
      return
    }
    setFullExporting(true)
    try {
      const exportChatHistory = httpsCallable(functions, 'exportChatHistory')
      const result = await exportChatHistory({ chatId, includeBackups: true })

      console.log('Export result:', result)
      const data = result.data

      if (data && data.htmlContent) {
        // Create blob and download
        const blob = new Blob([data.htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        console.error('Unexpected response:', data)
        alert('Export failed. Unexpected response format.')
      }
    } catch (err) {
      console.error('Full export error:', err)
      alert('Failed to export data: ' + (err.message || 'Unknown error'))
    } finally {
      setFullExporting(false)
    }
  }

  const handleThoughtsExportClick = () => {
    setThoughtsExportError('')
    setShowThoughtsPrivacyConfirm(true)
  }

  const handleThoughtsExportConfirm = async () => {
    setShowThoughtsPrivacyConfirm(false)
    setThoughtsExporting(true)
    setThoughtsExportError('')

    try {
      const result = await listThoughtsForExport(chatId, thoughtsExportScope, currentUser?.uid)

      if (!result.success) {
        setThoughtsExportError(result.error || 'Failed to load thoughts')
        return
      }

      const thoughts = result.thoughts
      const context = {
        scope: thoughtsExportScope,
        currentUserId: currentUser?.uid,
        chatId
      }

      let content, mimeType, filename

      if (thoughtsExportFormat === 'json') {
        const jsonData = buildThoughtsJsonExport(thoughts, context)
        content = JSON.stringify(jsonData, null, 2)
        mimeType = 'application/json'
        filename = generateExportFilename(thoughtsExportScope, 'json')
      } else {
        content = buildThoughtsMarkdownExport(thoughts, context)
        mimeType = 'text/markdown'
        filename = generateExportFilename(thoughtsExportScope, 'markdown')
      }

      if (!supportsDownload()) {
        setThoughtsFallbackContent(content)
        setShowThoughtsFallback(true)
        return
      }

      const downloadResult = downloadTextFile(filename, content, mimeType)

      if (downloadResult.fallbackNeeded) {
        setThoughtsFallbackContent(content)
        setShowThoughtsFallback(true)
      }
    } catch (err) {
      console.error('Thoughts export error:', err)
      setThoughtsExportError(err.message || 'Failed to export thoughts')
    } finally {
      setThoughtsExporting(false)
    }
  }

  const handleCopyThoughtsExport = async () => {
    try {
      await navigator.clipboard.writeText(thoughtsFallbackContent)
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Copy failed:', err)
      alert('Failed to copy. Please select and copy manually.')
    }
  }

  return (
    <div className="settings-container">
      <h2
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        style={{ userSelect: 'none' }}
      >
        Settings
      </h2>

      <div className="settings-section">
        <h3>Auto-Logout</h3>
        <p className="settings-note">
          Automatically signs you out if you haven't used the app for a while. If someone picks up your unlocked phone, they won't be able to read your messages without logging in again.
        </p>
        <div className="settings-row">
          <label htmlFor="auto-logout-timeout">Logout after</label>
          <select
            id="auto-logout-timeout"
            className="settings-select"
            value={autoLogoutTimeout || 5}
            onChange={(e) => onAutoLogoutTimeoutChange?.(e.target.value === 'never' ? 'never' : parseInt(e.target.value, 10))}
          >
            {AUTO_LOGOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {onLogoutNow && (
          <button className="settings-btn" onClick={onLogoutNow}>
            Logout Now
          </button>
        )}
      </div>

      <div className="settings-section">
        <h3>PIN Lock</h3>
        <p className="settings-note">
          Secure PIN for app lock and hidden media protection. Your PIN is securely hashed and stored only in your browser.
        </p>
        {pinEnabled ? (
          <div className="pin-enabled-info">
            {pinCreatedAt && (
              <p className="pin-created-at">
                PIN set on {new Date(pinCreatedAt).toLocaleDateString()}
              </p>
            )}
            <button className="settings-btn danger" onClick={handleDisablePin}>
              Disable PIN Lock
            </button>
          </div>
        ) : showPinSetup ? (
          <div className="pin-setup">
            {pinError && <div className="pin-error">{pinError}</div>}
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter PIN (4-6 digits)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="pin-input"
              disabled={pinSaving}
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="pin-input"
              disabled={pinSaving}
            />
            <div className="pin-actions">
              <button className="settings-btn" onClick={handleSetPin} disabled={pinSaving}>
                {pinSaving ? 'Saving...' : 'Set PIN'}
              </button>
              <button className="settings-btn secondary" onClick={() => setShowPinSetup(false)} disabled={pinSaving}>
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

      <AiSettingsPanel currentUser={currentUser} />

      {/* Advanced Export - hidden until code 335042249 is entered */}
      {/* TODO: Later combine into single export control with dropdown: Messages / Thoughts / Both */}
      {exportUnlocked && (
        <div className="settings-section">
          <h3>Advanced Export</h3>
          <p className="settings-note">
            Export your private data. These exports may contain sensitive information - save only somewhere you trust.
          </p>

          {/* Messages Export */}
          <div className="export-subsection">
            <h4>Export Messages</h4>
            <p className="settings-note">
              Download all your messages, notes, reminders, dates, and lists.
            </p>
            <div className="export-buttons">
              <button className="settings-btn" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Quick Export (JSON)'}
              </button>
              <button
                className="settings-btn"
                onClick={handleFullExport}
                disabled={fullExporting || !chatId}
                title="Includes deleted messages from backups"
              >
                {fullExporting ? 'Generating...' : 'Full Export (HTML)'}
              </button>
            </div>
            <p className="settings-note" style={{ marginTop: '8px', fontSize: '0.85em' }}>
              Full Export includes deleted data from backups in a readable HTML format.
            </p>
          </div>

          {/* Thoughts Export */}
          {chatId && (
            <div className="export-subsection">
              <h4>Export Thoughts</h4>
              <p className="settings-note">
                Export your thoughts to keep a personal copy.
              </p>

              {thoughtsExportError && (
                <div className="settings-error">{thoughtsExportError}</div>
              )}

              <div className="thoughts-export-options">
                <div className="settings-row">
                  <label htmlFor="thoughts-export-scope">Include</label>
                  <select
                    id="thoughts-export-scope"
                    className="settings-select"
                    value={thoughtsExportScope}
                    onChange={(e) => setThoughtsExportScope(e.target.value)}
                    disabled={thoughtsExporting}
                  >
                    <option value="my_thoughts">My Thoughts</option>
                    <option value="all_shared">All Shared Thoughts</option>
                  </select>
                </div>

                <div className="settings-row">
                  <label htmlFor="thoughts-export-format">Format</label>
                  <select
                    id="thoughts-export-format"
                    className="settings-select"
                    value={thoughtsExportFormat}
                    onChange={(e) => setThoughtsExportFormat(e.target.value)}
                    disabled={thoughtsExporting}
                  >
                    <option value="markdown">Markdown / Text</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>

              <button
                className="settings-btn"
                onClick={handleThoughtsExportClick}
                disabled={thoughtsExporting}
              >
                {thoughtsExporting ? 'Exporting...' : 'Download Thoughts'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Thoughts export modals - render outside conditional so they show when triggered */}
      {showThoughtsPrivacyConfirm && (
        <div className="settings-modal-overlay" onClick={() => setShowThoughtsPrivacyConfirm(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Privacy Notice</h3>
            <p>
              This export may contain private conversation data. Save it only somewhere you trust.
            </p>
            <div className="settings-modal-actions">
              <button
                className="settings-btn secondary"
                onClick={() => setShowThoughtsPrivacyConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="settings-btn"
                onClick={handleThoughtsExportConfirm}
              >
                Continue Export
              </button>
            </div>
          </div>
        </div>
      )}

      {showThoughtsFallback && (
        <div className="settings-modal-overlay" onClick={() => setShowThoughtsFallback(false)}>
          <div className="settings-modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>Export Content</h3>
            <p className="settings-note">
              Download is not supported on this device. You can copy the export instead.
            </p>
            <textarea
              className="thoughts-export-fallback-textarea"
              value={thoughtsFallbackContent}
              readOnly
              rows={12}
            />
            <div className="settings-modal-actions">
              <button
                className="settings-btn secondary"
                onClick={() => setShowThoughtsFallback(false)}
              >
                Close
              </button>
              <button
                className="settings-btn"
                onClick={handleCopyThoughtsExport}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="settings-section">
          <h3>Clear Chat View</h3>
          <p className="settings-note">
            Remove all visible messages from your chat view. Messages are kept for export/download.
            This only affects your view - your partner's view is not changed.
          </p>
          {deleteAllProgress && (
            <div className="delete-status processing">{deleteAllProgress}</div>
          )}
          <button
            className="settings-btn"
            onClick={handleDeleteAllMessages}
            disabled={deletingAllMessages}
          >
            {deletingAllMessages ? 'Clearing...' : 'Clear All Messages'}
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
