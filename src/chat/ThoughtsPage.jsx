import { useState, useEffect } from 'react'
import { listThoughts, getThought } from '../services/thoughtService'
import ThoughtList from './ThoughtList'
import ThoughtComposer from './ThoughtComposer'
import ThoughtDetail from './ThoughtDetail'
import ThoughtEditor from './ThoughtEditor'

function ThoughtsPage({ currentUser, chatId, onClose, onReplyToThought, initialThoughtId, initialBlockId }) {
  const [thoughts, setThoughts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [selectedThought, setSelectedThought] = useState(null)
  const [editingThought, setEditingThought] = useState(null)
  const [highlightBlockId, setHighlightBlockId] = useState(null)
  const [thoughtUnavailable, setThoughtUnavailable] = useState(false)

  const fetchThoughts = async () => {
    setLoading(true)
    const result = await listThoughts(chatId)
    if (result.success) {
      setThoughts(result.thoughts)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchThoughts()
  }, [chatId])

  useEffect(() => {
    if (initialThoughtId) {
      const loadInitialThought = async () => {
        const result = await getThought(chatId, initialThoughtId)
        if (result.success && result.thought) {
          setSelectedThought(result.thought)
          setHighlightBlockId(initialBlockId || null)
          setThoughtUnavailable(false)
        } else {
          setThoughtUnavailable(true)
        }
      }
      loadInitialThought()
    }
  }, [initialThoughtId, initialBlockId, chatId])

  const handleNewThought = () => {
    setShowComposer(true)
  }

  const handleComposerClose = () => {
    setShowComposer(false)
  }

  const handleThoughtCreated = () => {
    fetchThoughts()
  }

  const handleSelectThought = (thought) => {
    setSelectedThought(thought)
    setHighlightBlockId(null)
  }

  const handleDetailClose = () => {
    setSelectedThought(null)
    setHighlightBlockId(null)
  }

  const handleReplyToThought = (replyData) => {
    if (onReplyToThought) {
      onReplyToThought(replyData)
      onClose()
    }
  }

  const handleEdit = (thought) => {
    setEditingThought(thought)
  }

  const handleEditClose = () => {
    setEditingThought(null)
  }

  const handleEditUpdated = () => {
    fetchThoughts()
    setSelectedThought(null)
  }

  const handleDeleted = () => {
    fetchThoughts()
  }

  return (
    <div className="thoughts-page-overlay" onClick={onClose}>
      <div className="thoughts-page" onClick={(e) => e.stopPropagation()}>
        <div className="thoughts-page-header">
          <button className="thoughts-page-back" onClick={onClose} aria-label="Back to chat">
            ←
          </button>
          <h1>Thoughts</h1>
          <span className="thoughts-page-icon">💭</span>
        </div>

        {thoughtUnavailable && (
          <div className="thought-unavailable-notice">
            <span className="thought-unavailable-icon">💭</span>
            <p>This thought is no longer available.</p>
            <button onClick={() => setThoughtUnavailable(false)}>View All Thoughts</button>
          </div>
        )}

        {!thoughtUnavailable && (
          <div className="thoughts-page-content">
            <ThoughtList
              thoughts={thoughts}
              loading={loading}
              onSelect={handleSelectThought}
              onNewThought={handleNewThought}
              currentUser={currentUser}
              chatId={chatId}
            />
          </div>
        )}

        {showComposer && (
          <ThoughtComposer
            currentUser={currentUser}
            chatId={chatId}
            onClose={handleComposerClose}
            onCreated={handleThoughtCreated}
          />
        )}

        {selectedThought && !editingThought && (
          <ThoughtDetail
            thought={selectedThought}
            currentUser={currentUser}
            chatId={chatId}
            onClose={handleDetailClose}
            onReplyToThought={handleReplyToThought}
            highlightBlockId={highlightBlockId}
            onEdit={handleEdit}
            onDeleted={handleDeleted}
          />
        )}

        {editingThought && (
          <ThoughtEditor
            thought={editingThought}
            currentUser={currentUser}
            chatId={chatId}
            onClose={handleEditClose}
            onUpdated={handleEditUpdated}
          />
        )}
      </div>
    </div>
  )
}

export default ThoughtsPage
