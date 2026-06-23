import { useState, useEffect, useMemo, useCallback } from 'react'
import { listThoughts, getThought, listThoughtDrafts, getThoughtReadState } from '../services/thoughtService'
import { getHiddenThoughtIds } from '../services/thoughtRemovalService'
import { getSavedThoughtIds } from '../services/thoughtSavedService'
import { getArchivedThoughtIds } from '../services/thoughtArchiveService'
import { getThoughtReadStatus, isUnreadStatus } from '../utils/thoughtUnreadUtils'
import { MOOD_OPTIONS, getMoodDisplay } from '../utils/thoughtUtils'
import { useThoughtUnreadComments } from '../hooks/useUnreadComments'
import ThoughtList from './ThoughtList'
import ThoughtComposer from './ThoughtComposer'
import ThoughtDetail from './ThoughtDetail'
import ThoughtEditor from './ThoughtEditor'
import ThoughtDraftList from './ThoughtDraftList'
import ContinueReadingCard from './ContinueReadingCard'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'partial', label: 'Partially Read' },
  { key: 'finished', label: 'Finished' },
  { key: 'saved', label: 'Saved' },
  { key: 'mine', label: 'My Thoughts' },
  { key: 'theirs', label: 'Their Thoughts' },
  { key: 'archived', label: 'Archived' },
  { key: 'drafts', label: 'Drafts' }
]

function ThoughtsPage({ currentUser, chatId, onClose, onReplyToThought, initialThoughtId, initialBlockId, onTalkInChat }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [thoughts, setThoughts] = useState([])
  const [hiddenIds, setHiddenIds] = useState(new Set())
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [readStates, setReadStates] = useState({})
  const [readStatesLoading, setReadStatesLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [editingDraft, setEditingDraft] = useState(null)
  const [selectedThought, setSelectedThought] = useState(null)
  const [editingThought, setEditingThought] = useState(null)
  const [highlightBlockId, setHighlightBlockId] = useState(null)
  const [thoughtUnavailable, setThoughtUnavailable] = useState(false)
  const [moodFilter, setMoodFilter] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())
  const [archivedIds, setArchivedIds] = useState(new Set())

  // Fetch saved thought IDs
  const fetchSavedIds = async () => {
    if (!currentUser?.uid) return
    const result = await getSavedThoughtIds(chatId, currentUser.uid)
    if (result.success) {
      setSavedIds(new Set(result.savedIds))
    }
  }

  // Fetch archived thought IDs
  const fetchArchivedIds = async () => {
    if (!currentUser?.uid) return
    const result = await getArchivedThoughtIds(chatId, currentUser.uid)
    if (result.success) {
      setArchivedIds(new Set(result.archivedIds))
    }
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Get unread comments map for all visible thoughts
  const baseVisibleThoughts = useMemo(() => thoughts.filter(t => !hiddenIds.has(t.id)), [thoughts, hiddenIds])
  const { unreadMap: unreadCommentsMap, loading: unreadCommentsLoading } = useThoughtUnreadComments(chatId, currentUser?.uid, baseVisibleThoughts)

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
    fetchSavedIds()
    fetchArchivedIds()
  }, [chatId, currentUser?.uid])

  // Fetch read states for all other users' thoughts
  useEffect(() => {
    if (!currentUser?.uid || !chatId || loading) return

    const otherThoughts = thoughts.filter(t => t.authorId !== currentUser.uid)
    if (otherThoughts.length === 0) {
      setReadStatesLoading(false)
      return
    }

    let cancelled = false
    setReadStatesLoading(true)

    const fetchReadStates = async () => {
      const states = {}
      await Promise.all(
        otherThoughts.map(async (thought) => {
          const result = await getThoughtReadState(chatId, currentUser.uid, thought.id)
          if (result.success && result.readState) {
            states[thought.id] = result.readState
          }
        })
      )
      if (!cancelled) {
        setReadStates(states)
        setReadStatesLoading(false)
      }
    }

    fetchReadStates()
    return () => { cancelled = true }
  }, [thoughts, currentUser?.uid, chatId, loading])

  // Search helper
  const matchesSearch = useCallback((thought, query) => {
    if (!query) return true

    const title = (thought.title || '').toLowerCase()
    const body = (thought.body || '').toLowerCase()
    const moodInfo = getMoodDisplay(thought.mood)
    const moodLabel = moodInfo.label.toLowerCase()
    const authorLabel = thought.authorId === currentUser?.uid ? 'you' : 'friend'

    return title.includes(query) ||
           body.includes(query) ||
           moodLabel.includes(query) ||
           authorLabel.includes(query)
  }, [currentUser?.uid])

  // Filter thoughts based on active filter, mood filter, and search
  const visibleThoughts = useMemo(() => {
    let base = thoughts.filter(t => !hiddenIds.has(t.id))

    // Apply mood filter if set
    if (moodFilter) {
      base = base.filter(t => t.mood === moodFilter)
    }

    // Apply search filter
    if (searchQuery) {
      base = base.filter(t => matchesSearch(t, searchQuery))
    }

    // For archived filter, show only archived thoughts
    if (activeFilter === 'archived') {
      return base.filter(t => archivedIds.has(t.id))
    }

    // For all other filters, exclude archived thoughts
    base = base.filter(t => !archivedIds.has(t.id))

    if (activeFilter === 'all') return base
    if (activeFilter === 'mine') return base.filter(t => t.authorId === currentUser?.uid)
    if (activeFilter === 'theirs') return base.filter(t => t.authorId !== currentUser?.uid)
    if (activeFilter === 'saved') return base.filter(t => savedIds.has(t.id))
    if (activeFilter === 'drafts') return [] // Handled separately

    // For read-status filters, only apply to other's thoughts
    return base.filter(t => {
      if (t.authorId === currentUser?.uid) return false
      const readState = readStates[t.id]
      const status = getThoughtReadStatus(t, readState, currentUser?.uid)

      if (activeFilter === 'unread') return status === 'new'
      if (activeFilter === 'partial') return status === 'partial'
      if (activeFilter === 'finished') return status === 'read'
      return true
    })
  }, [thoughts, hiddenIds, activeFilter, readStates, currentUser?.uid, moodFilter, searchQuery, matchesSearch, savedIds, archivedIds])

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const allThoughts = thoughts.filter(t => !hiddenIds.has(t.id))
    const nonArchived = allThoughts.filter(t => !archivedIds.has(t.id))

    const counts = {
      all: nonArchived.length,
      mine: nonArchived.filter(t => t.authorId === currentUser?.uid).length,
      theirs: nonArchived.filter(t => t.authorId !== currentUser?.uid).length,
      saved: nonArchived.filter(t => savedIds.has(t.id)).length,
      archived: allThoughts.filter(t => archivedIds.has(t.id)).length,
      unread: 0,
      partial: 0,
      finished: 0,
      drafts: drafts.length
    }

    // Only count if read states are loaded - exclude archived from unread counts
    if (!readStatesLoading) {
      nonArchived.forEach(t => {
        if (t.authorId === currentUser?.uid) return
        const readState = readStates[t.id]
        const status = getThoughtReadStatus(t, readState, currentUser?.uid)
        if (status === 'new') counts.unread++
        else if (status === 'partial') counts.partial++
        else if (status === 'read') counts.finished++
      })
    }

    return counts
  }, [thoughts, hiddenIds, readStates, readStatesLoading, currentUser?.uid, drafts.length, savedIds, archivedIds])

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

        <div className="thoughts-search-bar">
          <span className="thoughts-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search Thoughts..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="thoughts-search-input"
          />
          {searchInput && (
            <button
              className="thoughts-search-clear"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="thoughts-search-results">
            {visibleThoughts.length} result{visibleThoughts.length !== 1 ? 's' : ''}
          </div>
        )}

        <div className="thoughts-filter-chips">
          {FILTERS.map(filter => {
            const count = filterCounts[filter.key]
            const showCount = filter.key === 'unread' || filter.key === 'drafts' || filter.key === 'partial' || filter.key === 'saved'
            const isLoading = readStatesLoading && ['unread', 'partial', 'finished'].includes(filter.key)
            return (
              <button
                key={filter.key}
                className={`thoughts-filter-chip ${activeFilter === filter.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
                {showCount && !isLoading && count > 0 && (
                  <span className="thoughts-filter-count">{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {activeFilter !== 'drafts' && (
          <div className="thoughts-mood-filter">
            <button
              className={`thoughts-mood-chip ${!moodFilter ? 'active' : ''}`}
              onClick={() => setMoodFilter(null)}
            >
              All moods
            </button>
            {MOOD_OPTIONS.slice(0, 6).map(m => (
              <button
                key={m.value}
                className={`thoughts-mood-chip ${moodFilter === m.value ? 'active' : ''}`}
                onClick={() => setMoodFilter(moodFilter === m.value ? null : m.value)}
                title={m.label}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        )}

        {!thoughtUnavailable && activeFilter === 'all' && !moodFilter && (
          <ContinueReadingCard
            thoughts={baseVisibleThoughts}
            readStates={readStates}
            readStatesLoading={readStatesLoading}
            unreadCommentsMap={unreadCommentsMap}
            currentUserId={currentUser?.uid}
            onOpenThought={handleSelectThought}
          />
        )}

        {thoughtUnavailable && (
          <div className="thought-unavailable-notice">
            <span className="thought-unavailable-icon">💭</span>
            <p>This thought is no longer available.</p>
            <button onClick={() => setThoughtUnavailable(false)}>View All Thoughts</button>
          </div>
        )}

        {!thoughtUnavailable && activeFilter !== 'drafts' && (
          <div className="thoughts-page-content">
            <ThoughtList
              thoughts={visibleThoughts}
              loading={loading || (readStatesLoading && ['unread', 'partial', 'finished'].includes(activeFilter))}
              onSelect={handleSelectThought}
              onNewThought={handleNewThought}
              currentUser={currentUser}
              chatId={chatId}
              activeFilter={activeFilter}
              readStates={readStates}
              readStatesLoading={readStatesLoading}
              searchQuery={searchQuery}
            />
          </div>
        )}

        {!thoughtUnavailable && activeFilter === 'drafts' && (
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
            isSaved={savedIds.has(selectedThought.id)}
            onSaveToggle={fetchSavedIds}
            isArchived={archivedIds.has(selectedThought.id)}
            onArchiveToggle={fetchArchivedIds}
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
