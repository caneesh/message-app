import { useState, useEffect, useRef } from 'react'
import { getThoughtPreview, getMoodDisplay } from '../utils/thoughtUtils'
import { getThoughtReadStatus, isUnreadStatus } from '../utils/thoughtUnreadUtils'
import { getThoughtReadReceipt, getThoughtReadState } from '../services/thoughtService'
import { useThoughtUnreadComments } from '../hooks/useUnreadComments'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

function WaxSeal({ size = 'medium' }) {
  const sizeMap = { small: 24, medium: 40, large: 56 }
  const px = sizeMap[size] || 40

  return (
    <div className={`wax-seal wax-seal--${size}`} style={{ width: px, height: px }}>
      <div className="wax-seal-glow" />
      <div className="wax-seal-inner">
        <svg width={px * 0.5} height={px * 0.5} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    </div>
  )
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' })
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  } catch {
    return ''
  }
}

function ReadStatusLabel({ receipt, receiptsLoaded, receiptsError }) {
  if (receiptsError) {
    return <span className="my-thought-read-status my-thought-read-status--error">Read status unavailable</span>
  }

  if (!receiptsLoaded) {
    return <span className="my-thought-read-status my-thought-read-status--loading">Checking…</span>
  }

  if (!receipt || receipt.readPercent === undefined || receipt.readPercent === null) {
    return <span className="my-thought-read-status">Not opened yet</span>
  }

  if (receipt.readPercent === 0) {
    return <span className="my-thought-read-status">Opened</span>
  }

  if (receipt.readPercent >= 100) {
    return <span className="my-thought-read-status my-thought-read-status--finished">Finished reading</span>
  }

  return <span className="my-thought-read-status">Read {Math.round(receipt.readPercent)}%</span>
}

function ThoughtList({ thoughts, loading, onSelect, onNewThought, currentUser, chatId, activeFilter, readStates: parentReadStates, readStatesLoading: parentReadStatesLoading, searchQuery }) {
  const [readReceipts, setReadReceipts] = useState({})
  const [receiptsLoaded, setReceiptsLoaded] = useState(false)
  const [receiptsError, setReceiptsError] = useState(false)
  const [myReadStates, setMyReadStates] = useState({})
  const [myReadStatesLoaded, setMyReadStatesLoaded] = useState(false)
  const [otherMemberUid, setOtherMemberUid] = useState(null)
  const { unreadMap: unreadCommentsMap } = useThoughtUnreadComments(chatId, currentUser?.uid, thoughts)

  // Use parent-provided read states if available, otherwise use local
  const effectiveReadStates = parentReadStates || myReadStates
  const effectiveReadStatesLoaded = parentReadStates ? !parentReadStatesLoading : myReadStatesLoaded

  const prevChatIdRef = useRef(chatId)
  const prevUserIdRef = useRef(currentUser?.uid)

  // Clear state when chatId or user changes to prevent stale data
  useEffect(() => {
    if (prevChatIdRef.current !== chatId || prevUserIdRef.current !== currentUser?.uid) {
      setReadReceipts({})
      setReceiptsLoaded(false)
      setReceiptsError(false)
      setMyReadStates({})
      setMyReadStatesLoaded(false)
      setOtherMemberUid(null)
      prevChatIdRef.current = chatId
      prevUserIdRef.current = currentUser?.uid
    }
  }, [chatId, currentUser?.uid])

  useEffect(() => {
    const fetchOtherMember = async () => {
      if (!chatId || !currentUser?.uid) return
      try {
        const chatRef = doc(db, 'chats', chatId)
        const chatSnap = await getDoc(chatRef)
        if (chatSnap.exists()) {
          const members = chatSnap.data().members || []
          const other = members.find(uid => uid !== currentUser.uid)
          setOtherMemberUid(other || null)
        }
      } catch (err) {
        console.error('Error fetching chat members:', err)
      }
    }
    fetchOtherMember()
  }, [chatId, currentUser?.uid])

  // Fetch read receipts for author's thoughts (to show reader progress)
  useEffect(() => {
    if (!otherMemberUid || !currentUser?.uid) return

    let cancelled = false

    const fetchReceipts = async () => {
      setReceiptsLoaded(false)
      setReceiptsError(false)

      const myThoughtIds = thoughts
        .filter(t => t.authorId === currentUser.uid)
        .map(t => t.id)

      if (myThoughtIds.length === 0) {
        setReceiptsLoaded(true)
        return
      }

      try {
        const receipts = {}
        const fetchPromises = myThoughtIds.map(async (thoughtId) => {
          const result = await getThoughtReadReceipt(chatId, thoughtId, otherMemberUid)
          if (result.success && result.receipt) {
            receipts[thoughtId] = result.receipt
          }
        })

        await Promise.all(fetchPromises)

        if (!cancelled) {
          setReadReceipts(receipts)
          setReceiptsLoaded(true)
        }
      } catch (err) {
        console.error('Error fetching read receipts:', err)
        if (!cancelled) {
          setReceiptsError(true)
          setReceiptsLoaded(true)
        }
      }
    }

    fetchReceipts()

    return () => {
      cancelled = true
    }
  }, [thoughts, currentUser?.uid, chatId, otherMemberUid])

  // Fetch my read states for other's thoughts
  useEffect(() => {
    if (!currentUser?.uid || !chatId) return

    let cancelled = false

    const fetchMyReadStates = async () => {
      setMyReadStatesLoaded(false)

      const otherThoughtIds = thoughts
        .filter(t => t.authorId !== currentUser.uid)
        .map(t => t.id)

      if (otherThoughtIds.length === 0) {
        setMyReadStatesLoaded(true)
        return
      }

      try {
        const states = {}
        const fetchPromises = otherThoughtIds.map(async (thoughtId) => {
          const result = await getThoughtReadState(chatId, currentUser.uid, thoughtId)
          if (result.success && result.readState) {
            states[thoughtId] = result.readState
          }
        })

        await Promise.all(fetchPromises)

        if (!cancelled) {
          setMyReadStates(states)
          setMyReadStatesLoaded(true)
        }
      } catch (err) {
        console.error('Error fetching my read states:', err)
        if (!cancelled) {
          setMyReadStatesLoaded(true)
        }
      }
    }

    fetchMyReadStates()

    return () => {
      cancelled = true
    }
  }, [thoughts, currentUser?.uid, chatId])

  if (loading) {
    return (
      <div className="thought-list-loading">
        <span>Loading thoughts...</span>
      </div>
    )
  }

  // Separate thoughts into waiting (unread from others) and opened (read or own)
  const waitingThoughts = []
  const openedThoughts = []
  const myThoughts = []

  for (const thought of thoughts) {
    const isAuthor = thought.authorId === currentUser?.uid
    if (isAuthor) {
      myThoughts.push(thought)
    } else {
      // Only categorize if read states are loaded, otherwise treat as loading
      if (effectiveReadStatesLoaded) {
        const readState = effectiveReadStates[thought.id]
        const status = getThoughtReadStatus(thought, readState, currentUser?.uid)
        if (isUnreadStatus(status)) {
          waitingThoughts.push({ ...thought, readStatus: status, readState })
        } else {
          openedThoughts.push({ ...thought, readStatus: status, readState })
        }
      }
    }
  }

  // Sort waiting by createdAt desc, opened by createdAt desc
  waitingThoughts.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt)
    const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt)
    return bTime - aTime
  })

  openedThoughts.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt)
    const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt)
    return bTime - aTime
  })

  const hero = waitingThoughts[0]
  const alsoWaiting = waitingThoughts.slice(1)

  // Check if we have other's thoughts but read states are still loading
  const hasOtherThoughts = thoughts.some(t => t.authorId !== currentUser?.uid)
  const otherThoughtsLoading = hasOtherThoughts && !effectiveReadStatesLoaded

  return (
    <div className="thought-list">
      <button className="thought-list-new-btn" onClick={onNewThought}>
        <span className="thought-list-new-icon">+</span>
        New Thought
      </button>

      {thoughts.length === 0 ? (
        <div className="thought-list-empty">
          <span className="thought-list-empty-icon">
            {searchQuery ? '🔍' :
             activeFilter === 'unread' ? '✓' :
             activeFilter === 'partial' ? '📖' :
             activeFilter === 'finished' ? '📚' :
             activeFilter === 'saved' ? '💜' :
             activeFilter === 'archived' ? '📦' :
             activeFilter === 'mine' ? '✏️' :
             activeFilter === 'theirs' ? '💌' : '💭'}
          </span>
          <p>
            {searchQuery ? 'No thoughts matched your search.' :
             activeFilter === 'unread' ? 'All caught up!' :
             activeFilter === 'partial' ? 'No thoughts in progress.' :
             activeFilter === 'finished' ? 'No finished thoughts yet.' :
             activeFilter === 'saved' ? 'No saved thoughts yet.' :
             activeFilter === 'archived' ? 'No archived thoughts.' :
             activeFilter === 'mine' ? 'You haven\'t shared any thoughts yet.' :
             activeFilter === 'theirs' ? 'No thoughts from them yet.' :
             'No thoughts shared yet.'}
          </p>
          <p className="thought-list-empty-hint">
            {searchQuery ? 'Try a different search term.' :
             activeFilter === 'unread' ? 'You\'ve read all the thoughts waiting for you.' :
             activeFilter === 'partial' ? 'Start reading a thought to see it here.' :
             activeFilter === 'finished' ? 'Thoughts you\'ve fully read will appear here.' :
             activeFilter === 'saved' ? 'Tap the heart on any thought to save it here.' :
             activeFilter === 'archived' ? 'Archived thoughts will appear here.' :
             activeFilter === 'mine' ? 'Tap the + button to share your first thought.' :
             activeFilter === 'theirs' ? 'When they share thoughts, they\'ll appear here.' :
             'Share your reflections, feelings, or longer messages here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Loading state for other's thoughts categorization */}
          {otherThoughtsLoading && (
            <div className="thought-list-categorizing">
              <span>Loading thoughts…</span>
            </div>
          )}

          {/* Waiting Zone (Warm) - Unread thoughts from partner */}
          {!otherThoughtsLoading && waitingThoughts.length > 0 && (
            <section className="waiting-zone">
              <div className="zone-header">
                <span className="zone-eyebrow">WAITING FOR YOU</span>
                <span className="zone-count">{waitingThoughts.length}</span>
              </div>

              {/* Hero Card */}
              <div className={`hero-stack ${alsoWaiting.length > 0 ? 'has-more' : ''}`}>
                {alsoWaiting.length > 0 && <div className="stack-paper" />}
                <article className="hero-card" onClick={() => onSelect(hero)}>
                  <WaxSeal size="large" />
                  <h2 className="hero-title">{hero.title || 'Untitled'}</h2>
                  <p className="hero-preview">{getThoughtPreview(hero)}</p>
                  <div className="hero-meta">
                    <time className="hero-time">{formatDate(hero.createdAt)}</time>
                  </div>
                  <button className="open-letter-btn" onClick={(e) => { e.stopPropagation(); onSelect(hero) }}>
                    Open letter
                  </button>
                </article>
              </div>

              {/* Also Waiting */}
              {alsoWaiting.length > 0 && (
                <div className="also-waiting">
                  <span className="also-waiting-label">Also waiting</span>
                  <ul className="also-waiting-list">
                    {alsoWaiting.map((thought) => (
                      <li key={thought.id}>
                        <button className="waiting-card" onClick={() => onSelect(thought)}>
                          <WaxSeal size="small" />
                          <div className="waiting-card-content">
                            <span className="waiting-card-title">{thought.title || 'Untitled'}</span>
                            <time className="waiting-card-time">{formatDate(thought.createdAt)}</time>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Caught Up State */}
          {!otherThoughtsLoading && waitingThoughts.length === 0 && openedThoughts.length > 0 && (
            <div className="caught-up-state">
              <div className="caught-up-icon">✓</div>
              <h3 className="caught-up-title">You're all caught up</h3>
              <p className="caught-up-subtitle">No new thoughts waiting for you</p>
            </div>
          )}

          {/* Opened Tray (Cool) - Read thoughts from partner */}
          {!otherThoughtsLoading && openedThoughts.length > 0 && (
            <section className="opened-tray">
              <div className="tray-header">
                <span className="tray-label">OPENED</span>
              </div>
              <ul className="opened-list">
                {openedThoughts.slice(0, 5).map((thought) => {
                  const unreadComments = unreadCommentsMap[thought.id]
                  const commentCount = thought.commentsSummary?.commentCount || 0
                  return (
                    <li key={thought.id}>
                      <button className="opened-card" onClick={() => onSelect(thought)}>
                        <span className="opened-check">✓</span>
                        <div className="opened-card-content">
                          <span className="opened-card-title">{thought.title || 'Untitled'}</span>
                          <span className="opened-card-preview">{getThoughtPreview(thought)}</span>
                        </div>
                        <div className="opened-card-meta">
                          {commentCount > 0 && (
                            <span className="opened-card-comments">
                              💬 {commentCount}
                              {unreadComments?.hasUnread && unreadComments.count > 0 && (
                                <span className="comment-badge">{unreadComments.count}</span>
                              )}
                            </span>
                          )}
                          <time className="opened-card-time">{formatDate(thought.createdAt)}</time>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {openedThoughts.length > 5 && (
                <button className="opened-more">
                  +{openedThoughts.length - 5} more
                </button>
              )}
            </section>
          )}

          {/* My Thoughts */}
          {myThoughts.length > 0 && (
            <section className="my-thoughts-section">
              <div className="tray-header">
                <span className="tray-label">YOUR THOUGHTS</span>
              </div>
              <ul className="my-thoughts-list">
                {myThoughts.map((thought) => {
                  const receipt = readReceipts[thought.id]
                  const unreadComments = unreadCommentsMap[thought.id]
                  const commentCount = thought.commentsSummary?.commentCount || 0
                  const moodInfo = getMoodDisplay(thought.mood)

                  return (
                    <li key={thought.id}>
                      <button className="my-thought-card" onClick={() => onSelect(thought)}>
                        <span className="my-thought-mood" title={moodInfo.label}>{moodInfo.emoji}</span>
                        <div className="my-thought-content">
                          <span className="my-thought-title">{thought.title || 'Untitled'}</span>
                          <ReadStatusLabel
                            receipt={receipt}
                            receiptsLoaded={receiptsLoaded}
                            receiptsError={receiptsError}
                          />
                        </div>
                        <div className="my-thought-meta">
                          {commentCount > 0 && (
                            <span className="my-thought-comments">
                              💬 {commentCount}
                              {unreadComments?.hasUnread && unreadComments.count > 0 && (
                                <span className="comment-badge">{unreadComments.count}</span>
                              )}
                            </span>
                          )}
                          <time className="my-thought-time">{formatDate(thought.createdAt)}</time>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default ThoughtList
