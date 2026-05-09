import { useState, useEffect } from 'react'
import { db, functions } from '../firebase/firebaseConfig'
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

function MessageToTaskAiAction({ currentUser, chatId, message, onClose }) {
  const [aiEnabled, setAiEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [chatMembers, setChatMembers] = useState([])

  useEffect(() => {
    if (!currentUser) return
    checkAiEnabled()
    fetchChatMembers()
  }, [currentUser, chatId])

  const checkAiEnabled = async () => {
    try {
      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'ai')
      const snapshot = await getDoc(settingsRef)
      if (snapshot.exists()) {
        const settings = snapshot.data()
        setAiEnabled(settings.enabled && settings.features?.messageToTask !== false)
      }
    } catch (err) {
      console.error('Error checking AI settings:', err)
    }
  }

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

  const handleExtract = async () => {
    if (loading) return

    const messageText = message.type === 'file' && message.file
      ? `File: ${message.file.fileName}`
      : message.text || ''

    if (!messageText.trim()) {
      setError('No text to analyze')
      return
    }

    setLoading(true)
    setError('')
    setSuggestions(null)

    try {
      const aiMessageToTask = httpsCallable(functions, 'aiMessageToTask')
      const result = await aiMessageToTask({
        chatId,
        messageId: message.id,
        text: messageText.trim(),
      })

      if (result.data.suggestion) {
        // Translate "sender"/"recipient" to actual UIDs
        let assignedTo = null
        const suggestedAssignee = result.data.suggestion.suggestedAssignee
        if (suggestedAssignee === 'sender') {
          assignedTo = message.senderId
        } else if (suggestedAssignee === 'recipient') {
          const members = result.data.chatMembers || chatMembers
          assignedTo = members.find(m => m !== message.senderId) || currentUser.uid
        }

        const task = {
          title: result.data.suggestion.taskTitle,
          notes: result.data.suggestion.taskDescription || '',
          dueAt: result.data.suggestion.suggestedDueDate || null,
          assignedTo,
        }
        setSuggestions({
          tasks: [task],
          suggestionId: result.data.suggestionId,
        })
      } else if (result.data.reason === 'NO_TASK_DETECTED' || result.data.noSuggestion) {
        setError('No tasks found in this message')
      }
    } catch (err) {
      console.error('AI message to task error:', err)
      if (err.code === 'functions/resource-exhausted') {
        setError('Rate limit reached. Try again later.')
      } else if (err.code === 'functions/failed-precondition') {
        setError('Enable AI in Settings first')
      } else {
        setError('Failed to extract tasks')
      }
    } finally {
      setLoading(false)
    }
  }

  const createReminder = async (task) => {
    if (creating) return

    if (task.assignedTo && !chatMembers.includes(task.assignedTo)) {
      setError('Invalid assigned user')
      return
    }

    setCreating(true)
    setError('')

    try {
      const aiCreateReminder = httpsCallable(functions, 'aiCreateReminderFromSuggestion')
      await aiCreateReminder({
        chatId,
        suggestionId: suggestions.suggestionId,
        acceptedPayload: {
          taskTitle: task.title,
          taskDescription: task.notes || '',
          dueDate: task.dueAt || null,
          assignedTo: task.assignedTo || currentUser.uid,
        },
      })

      setSuggestions((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.title !== task.title),
      }))

      if (suggestions.tasks.length <= 1) {
        onClose()
      }
    } catch (err) {
      console.error('Error creating reminder:', err)
      setError('Failed to create reminder')
    } finally {
      setCreating(false)
    }
  }

  const dismissSuggestion = async () => {
    if (suggestions?.suggestionId) {
      try {
        const suggestionRef = doc(db, 'chats', chatId, 'aiSuggestions', suggestions.suggestionId)
        await updateDoc(suggestionRef, { status: 'dismissed' })
      } catch (err) {
        console.error('Error dismissing suggestion:', err)
      }
    }
    onClose()
  }

  if (!aiEnabled) {
    return (
      <div className="ai-task-action">
        <p className="ai-task-disabled">Enable AI in Settings to extract tasks automatically</p>
        <button className="ai-task-cancel" onClick={onClose}>Close</button>
      </div>
    )
  }

  return (
    <div className="ai-task-action">
      <div className="ai-task-header">
        <h4>AI Task Extraction</h4>
        <button className="ai-task-close" onClick={onClose}>×</button>
      </div>

      {error && <div className="ai-task-error">{error}</div>}

      {!suggestions ? (
        <div className="ai-task-prompt">
          <p>Extract reminders and tasks from this message using AI</p>
          <button
            className="ai-task-extract-btn"
            onClick={handleExtract}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : '✨ Extract Tasks'}
          </button>
        </div>
      ) : suggestions.tasks.length === 0 ? (
        <div className="ai-task-empty">
          <p>No more tasks to create</p>
          <button className="ai-task-done" onClick={onClose}>Done</button>
        </div>
      ) : (
        <div className="ai-task-suggestions">
          <p className="ai-task-count">Found {suggestions.tasks.length} task(s)</p>
          {suggestions.tasks.map((task, idx) => (
            <div key={idx} className="ai-task-item">
              <div className="ai-task-title">{task.title}</div>
              {task.notes && <div className="ai-task-notes">{task.notes}</div>}
              {task.dueAt && (
                <div className="ai-task-due">
                  Due: {new Date(task.dueAt).toLocaleDateString()}
                </div>
              )}
              <div className="ai-task-item-actions">
                <button
                  className="ai-task-create-btn"
                  onClick={() => createReminder(task)}
                  disabled={creating}
                >
                  {creating ? '...' : 'Create Reminder'}
                </button>
              </div>
            </div>
          ))}
          <div className="ai-task-actions">
            <button className="ai-task-dismiss" onClick={dismissSuggestion}>
              Dismiss All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageToTaskAiAction
