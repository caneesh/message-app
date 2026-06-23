import { useState, useEffect } from 'react'
import { listThoughts, getThought, listThoughtDrafts } from '../services/thoughtService'
import { getHiddenThoughtIds } from '../services/thoughtRemovalService'
import ThoughtList from './ThoughtList'
import ThoughtComposer from './ThoughtComposer'
import ThoughtDetail from './ThoughtDetail'
import ThoughtEditor from './ThoughtEditor'
import ThoughtDraftList from './ThoughtDraftList'

function ThoughtsPage({ currentUser, chatId, onClose, onReplyToThought, initialThoughtId, initialBlockId, onTalkInChat }) {
  const [activeTab, setActiveTab] = useState('shared')
  const [thoughts, setThoughts] = useState([])
  const [hiddenIds, setHiddenIds] = useState(new Set())
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [editingDraft, setEditingDraft] = useState(null)
  const [selectedThought, setSelectedThought] = useState(null)
  const [editingThought, setEditingThought] = useState(null)
  const [highlightBlockId, setHighlightBlockId] = useState(null)
  const [thoughtUnavailable, setThoughtUnavailable] = useState(false)

  const fetchHiddenIds = async () => {
    if (!currentUser?.uid) return
    const result = await getHiddenThoughtIds(chatId, currentUser.uid)
    if (result.success) {
      setHiddenIds(new Set(result.hiddenIds))
    }
  }

  const fetchThoughts = async () => {
    setLoading(true)
    const result = await listThoughts(chatId)
    if (result.success) {
      setThoughts(result.thoughts)
    }
    setLoading(false)
  }

  const fetchDrafts = async () => {
    if (!currentUser?.uid) return
    setDraftsLoading(true)
    const result = await listThoughtDrafts(chatId, currentUser.uid)
    if (result.success) {
      setDrafts(result.drafts)
    }
    setDraftsLoading(false)
  }

  useEffect(() => {
    fetchThoughts()
    fetchDrafts()
    fetchHiddenIds()
  }, [chatId, currentUser?.uid])

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

  // Filter out hidden thoughts for the current user
  const visibleThoughts = thoughts.filter(t => !hiddenIds.has(t.id))

  const handleNewThought = () => {
    setEditingDraft(null)
    setShowComposer(true)
  }

  const handleComposerClose = () => {
    setShowComposer(false)
    setEditingDraft(null)
  }

  const handleThoughtCreated = () => {
    fetchThoughts()
    fetchDrafts()
  }

  const handleDraftSaved = () => {
    fetchDrafts()
  }

  const handleDraftDeleted = () => {
    fetchDrafts()
  }

  const handleSelectThought = (thought) => {
    setSelectedThought(thought)
    setHighlightBlockId(null)
  }

  const handleSelectDraft = (draft) => {
    setEditingDraft(draft)
    setShowComposer(true)
  }

  const handleDetailClose = () => {
    setSelectedThought(null)
    setHighlightBlockId(null)
    // Refresh to catch any state changes
    fetchThoughts()
    fetchHiddenIds()
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

  const handleRemovalAccepted = () => {
    fetchThoughts()
    fetchHiddenIds()
  }

  const handleTalkInChat = (data) => {
    if (onTalkInChat) {
      onTalkInChat(data)
    }
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

        <div className="thoughts-page-tabs">
          <button
            className={`thoughts-tab ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            Shared
            {visibleThoughts.length > 0 && <span className="thoughts-tab-count">{visibleThoughts.length}</span>}
          </button>
          <button
            className={`thoughts-tab ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
          >
            Drafts
            {drafts.length > 0 && <span className="thoughts-tab-count">{drafts.length}</span>}
          </button>
        </div>

        {thoughtUnavailable && (
          <div className="thought-unavailable-notice">
            <span className="thought-unavailable-icon">💭</span>
            <p>This thought is no longer available.</p>
            <button onClick={() => setThoughtUnavailable(false)}>View All Thoughts</button>
          </div>
        )}

        {!thoughtUnavailable && activeTab === 'shared' && (
          <div className="thoughts-page-content">
            <ThoughtList
              thoughts={visibleThoughts}
              loading={loading}
              onSelect={handleSelectThought}
              onNewThought={handleNewThought}
              currentUser={currentUser}
              chatId={chatId}
            />
          </div>
        )}

        {!thoughtUnavailable && activeTab === 'drafts' && (
          <div className="thoughts-page-content">
            <ThoughtDraftList
              drafts={drafts}
              loading={draftsLoading}
              onSelect={handleSelectDraft}
              onNewDraft={handleNewThought}
              onDraftDeleted={handleDraftDeleted}
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
            draft={editingDraft}
            onDraftSaved={handleDraftSaved}
            onDraftDeleted={handleDraftDeleted}
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
            onRemovalAccepted={handleRemovalAccepted}
            onTalkInChat={handleTalkInChat}
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
