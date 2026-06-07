/**
 * Utility functions for calculating thought read status
 */

/**
 * Get the read status for a thought
 * @param {Object} thought - The thought object
 * @param {Object|null} readState - The user's read state for this thought
 * @param {string} currentUserId - The current user's ID
 * @returns {string} - Status: 'own', 'new', 'partial', 'updated', 'read'
 */
export function getThoughtReadStatus(thought, readState, currentUserId) {
  if (!thought || !currentUserId) return 'read'

  // Current user's own thoughts are not unread
  if (thought.authorId === currentUserId) {
    return 'own'
  }

  // Only check shared thoughts
  if (thought.status !== 'shared') {
    return 'read'
  }

  // No read state exists - new thought
  if (!readState) {
    return 'new'
  }

  const readPercent = readState.readPercent ?? 0
  const lastReadAt = readState.lastReadAt?.toMillis?.() || readState.lastReadAt || 0
  const updatedAt = thought.updatedAt?.toMillis?.() || thought.updatedAt || 0

  // Check if thought was updated after last read
  if (updatedAt > lastReadAt && readPercent > 0) {
    return 'updated'
  }

  // Partially read
  if (readPercent > 0 && readPercent < 100) {
    return 'partial'
  }

  // Not started reading yet (readPercent is 0 but state exists)
  if (readPercent === 0) {
    return 'new'
  }

  // Fully read
  return 'read'
}

/**
 * Check if a thought needs attention (should be counted in badge)
 * @param {string} status - The read status
 * @returns {boolean}
 */
export function isUnreadStatus(status) {
  return status === 'new' || status === 'partial' || status === 'updated'
}

/**
 * Calculate unread thought count from thoughts and read states
 * @param {Array} thoughts - Array of thought objects
 * @param {Object} readStatesByThoughtId - Map of thoughtId -> readState
 * @param {string} currentUserId - The current user's ID
 * @returns {number}
 */
export function calculateUnreadThoughtCount(thoughts, readStatesByThoughtId, currentUserId) {
  if (!thoughts || !currentUserId) return 0

  let count = 0
  for (const thought of thoughts) {
    const readState = readStatesByThoughtId[thought.id] || null
    const status = getThoughtReadStatus(thought, readState, currentUserId)
    if (isUnreadStatus(status)) {
      count++
    }
  }
  return count
}

/**
 * Get display label for read status
 * @param {string} status - The read status
 * @param {number} readPercent - The read percentage (optional)
 * @returns {string|null}
 */
export function getStatusLabel(status, readPercent) {
  switch (status) {
    case 'new':
      return 'New'
    case 'partial':
      return readPercent ? `Continue · ${Math.round(readPercent)}%` : 'Continue reading'
    case 'updated':
      return 'Updated'
    case 'read':
      return null
    case 'own':
      return null
    default:
      return null
  }
}

export default {
  getThoughtReadStatus,
  isUnreadStatus,
  calculateUnreadThoughtCount,
  getStatusLabel
}
