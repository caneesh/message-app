/**
 * Thought utilities for the Thoughts feature
 */

const MAX_BLOCK_LENGTH = 2000
const MAX_PREVIEW_LENGTH = 150

/**
 * Split thought body into paragraph blocks
 * @param {string} body - The full thought body text
 * @returns {Array} - Array of block objects with blockId, type, and text
 */
export function splitThoughtIntoBlocks(body) {
  if (!body || typeof body !== 'string') return []

  const paragraphs = body.split(/\n\n+/).filter(p => p.trim())

  return paragraphs.map((text, index) => ({
    blockId: `block-${index}`,
    type: 'paragraph',
    text: text.trim().slice(0, MAX_BLOCK_LENGTH)
  }))
}

/**
 * Get a preview of a thought for display in lists
 * @param {Object} thought - The thought object
 * @returns {string} - Preview text
 */
export function getThoughtPreview(thought) {
  if (!thought) return ''

  if (thought.title && thought.title.trim()) {
    return thought.title.trim()
  }

  if (thought.body) {
    const preview = thought.body.trim().slice(0, MAX_PREVIEW_LENGTH)
    return preview.length < thought.body.trim().length
      ? preview + '...'
      : preview
  }

  if (thought.blocks && thought.blocks.length > 0) {
    const firstBlock = thought.blocks[0]
    if (firstBlock.text) {
      const preview = firstBlock.text.trim().slice(0, MAX_PREVIEW_LENGTH)
      return preview.length < firstBlock.text.trim().length
        ? preview + '...'
        : preview
    }
  }

  return ''
}

/**
 * Build a quote snippet from a block of text
 * @param {string} blockText - The text from a specific block
 * @returns {string} - Formatted quote text
 */
export function buildThoughtQuote(blockText) {
  if (!blockText || typeof blockText !== 'string') return ''

  const trimmed = blockText.trim()
  const maxQuoteLength = 100

  if (trimmed.length <= maxQuoteLength) {
    return trimmed
  }

  return trimmed.slice(0, maxQuoteLength) + '...'
}

/**
 * Get only readable (non-empty paragraph) blocks from a thought
 * @param {Object} thought - The thought object with blocks array
 * @returns {Array} - Array of readable block objects
 */
export function getReadableBlocks(thought) {
  if (!thought?.blocks || !Array.isArray(thought.blocks)) return []
  return thought.blocks.filter(block =>
    block.type === 'paragraph' && block.text && block.text.trim().length > 0
  )
}

/**
 * Calculate read progress percentage
 * @param {Array} readBlockIds - Array of block IDs that have been read
 * @param {number} totalBlocks - Total number of readable blocks in the thought
 * @returns {number} - Percentage from 0 to 100
 */
export function calculateReadPercent(readBlockIds, totalBlocks) {
  if (!totalBlocks || totalBlocks <= 0) return 100 // No blocks = fully read
  if (!readBlockIds || !Array.isArray(readBlockIds)) return 0

  const readCount = readBlockIds.length
  const percent = Math.round((readCount / totalBlocks) * 100)

  return Math.min(100, Math.max(0, percent))
}

/**
 * Calculate read percent ensuring it never decreases (monotonic)
 * @param {number} previousPercent - Previously stored percentage
 * @param {number} newPercent - Newly calculated percentage
 * @returns {number} - The higher of the two values
 */
export function mergeReadPercent(previousPercent, newPercent) {
  const prev = previousPercent ?? 0
  const next = newPercent ?? 0
  return Math.max(prev, next)
}

/**
 * Validate mood value
 * @param {string} mood - The mood to validate
 * @returns {boolean} - True if valid
 */
export function isValidMood(mood) {
  const validMoods = [
    'normal', 'warm', 'love', 'quiet', 'missing',
    'happy', 'hurt', 'romantic', 'confused', 'memory', 'question', 'important'
  ]
  return validMoods.includes(mood)
}

export const MOOD_OPTIONS = [
  { value: 'normal', label: 'Normal', emoji: '💭' },
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'missing', label: 'Missing you', emoji: '💫' },
  { value: 'hurt', label: 'Hurt', emoji: '💔' },
  { value: 'romantic', label: 'Romantic', emoji: '💕' },
  { value: 'confused', label: 'Confused', emoji: '🤔' },
  { value: 'memory', label: 'Memory', emoji: '🌅' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'important', label: 'Important', emoji: '⭐' },
  { value: 'quiet', label: 'Quiet', emoji: '🌙' },
  { value: 'warm', label: 'Warm', emoji: '🌤️' },
  { value: 'love', label: 'Love', emoji: '❤️' }
]

export function getMoodDisplay(mood) {
  const found = MOOD_OPTIONS.find(m => m.value === mood)
  return found || MOOD_OPTIONS[0]
}

/**
 * Validate status value
 * @param {string} status - The status to validate
 * @returns {boolean} - True if valid
 */
export function isValidStatus(status) {
  const validStatuses = ['shared', 'deleted']
  return validStatuses.includes(status)
}

export default {
  splitThoughtIntoBlocks,
  getThoughtPreview,
  buildThoughtQuote,
  getReadableBlocks,
  calculateReadPercent,
  mergeReadPercent,
  isValidMood,
  isValidStatus,
  MOOD_OPTIONS,
  getMoodDisplay
}
