import { useMemo } from 'react'
import { getThoughtReadStatus } from '../utils/thoughtUnreadUtils'

function ContinueReadingCard({
  thoughts,
  readStates,
  readStatesLoading,
  unreadCommentsMap,
  currentUserId,
  onOpenThought
}) {
  const summary = useMemo(() => {
    if (readStatesLoading || !thoughts.length) {
      return { unread: 0, partial: 0, withComments: 0, firstUnread: null, firstPartial: null, firstWithComments: null }
    }

    let unread = 0
    let partial = 0
    let withComments = 0
    let firstUnread = null
    let firstPartial = null
    let firstWithComments = null

    for (const thought of thoughts) {
      if (thought.authorId === currentUserId) continue

      const readState = readStates[thought.id]
      const status = getThoughtReadStatus(thought, readState, currentUserId)

      if (status === 'new') {
        unread++
        if (!firstUnread) firstUnread = thought
      } else if (status === 'partial') {
        partial++
        if (!firstPartial) firstPartial = thought
      }

      const commentInfo = unreadCommentsMap?.[thought.id]
      if (commentInfo?.hasUnread && commentInfo.count > 0) {
        withComments++
        if (!firstWithComments) firstWithComments = thought
      }
    }

    return { unread, partial, withComments, firstUnread, firstPartial, firstWithComments }
  }, [thoughts, readStates, readStatesLoading, unreadCommentsMap, currentUserId])

  const hasAnything = summary.unread > 0 || summary.partial > 0 || summary.withComments > 0

  if (readStatesLoading) {
    return null
  }

  if (!hasAnything) {
    return null
  }

  const handleOpenFirst = () => {
    const target = summary.firstUnread || summary.firstPartial || summary.firstWithComments
    if (target && onOpenThought) {
      onOpenThought(target)
    }
  }

  return (
    <div className="continue-reading-card">
      <div className="continue-reading-header">
        <span className="continue-reading-icon">📚</span>
        <span className="continue-reading-title">Continue Reading</span>
      </div>

      <div className="continue-reading-summary">
        {summary.unread > 0 && (
          <span className="continue-reading-stat">
            <span className="stat-count">{summary.unread}</span>
            <span className="stat-label">unread</span>
          </span>
        )}
        {summary.partial > 0 && (
          <span className="continue-reading-stat">
            <span className="stat-count">{summary.partial}</span>
            <span className="stat-label">in progress</span>
          </span>
        )}
        {summary.withComments > 0 && (
          <span className="continue-reading-stat">
            <span className="stat-count">{summary.withComments}</span>
            <span className="stat-label">new comments</span>
          </span>
        )}
      </div>

      <div className="continue-reading-actions">
        {summary.firstUnread && (
          <button
            className="continue-reading-btn continue-reading-btn--primary"
            onClick={() => onOpenThought(summary.firstUnread)}
          >
            Open unread
          </button>
        )}
        {summary.firstPartial && !summary.firstUnread && (
          <button
            className="continue-reading-btn continue-reading-btn--primary"
            onClick={() => onOpenThought(summary.firstPartial)}
          >
            Continue reading
          </button>
        )}
        {summary.firstWithComments && !summary.firstUnread && !summary.firstPartial && (
          <button
            className="continue-reading-btn continue-reading-btn--primary"
            onClick={() => onOpenThought(summary.firstWithComments)}
          >
            View comments
          </button>
        )}
      </div>
    </div>
  )
}

export default ContinueReadingCard
