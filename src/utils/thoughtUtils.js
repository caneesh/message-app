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
 * Calculate read progress percentage
 * @param {Array} readBlockIds - Array of block IDs that have been read
 * @param {number} totalBlocks - Total number of blocks in the thought
 * @returns {number} - Percentage from 0 to 100
 */
export function calculateReadPercent(readBlockIds, totalBlocks) {
  if (!totalBlocks || totalBlocks <= 0) return 0
  if (!readBlockIds || !Array.isArray(readBlockIds)) return 0

  const readCount = readBlockIds.length
  const percent = Math.round((readCount / totalBlocks) * 100)

  return Math.min(100, Math.max(0, percent))
}

/**
 * Validate mood value
 * @param {string} mood - The mood to validate
 * @returns {boolean} - True if valid
 */
export function isValidMood(mood) {
  const validMoods = ['normal', 'warm', 'love', 'quiet', 'missing']
  return validMoods.includes(mood)
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
  calculateReadPercent,
  isValidMood,
  isValidStatus
}
