/**
 * Utility functions for exporting thoughts
 */

const MOOD_LABELS = {
  normal: 'Normal',
  warm: 'Warm',
  love: 'Love',
  quiet: 'Quiet',
  missing: 'Missing'
}

/**
 * Format a timestamp for display in exports
 * @param {Object|Date|number} timestamp - Firestore timestamp, Date, or milliseconds
 * @returns {string}
 */
function formatExportDate(timestamp) {
  if (!timestamp) return ''
  try {
    let date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp)
    } else {
      date = new Date(timestamp)
    }
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

/**
 * Format a timestamp for ISO format in JSON exports
 * @param {Object|Date|number} timestamp
 * @returns {string|null}
 */
function formatIsoDate(timestamp) {
  if (!timestamp) return null
  try {
    let date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      date = new Date(timestamp)
    }
    return date.toISOString()
  } catch {
    return null
  }
}

/**
 * Build a Markdown export of thoughts
 * @param {Array} thoughts - Array of thought objects
 * @param {Object} context - { scope: 'my_thoughts' | 'all_shared', currentUserId }
 * @returns {string}
 */
export function buildThoughtsMarkdownExport(thoughts, context) {
  const { scope, currentUserId } = context
  const scopeLabel = scope === 'my_thoughts' ? 'My Thoughts' : 'All Shared Thoughts'
  const exportedAt = formatExportDate(new Date())

  let markdown = `# Thoughts Export\n\n`
  markdown += `Exported at: ${exportedAt}\n`
  markdown += `Scope: ${scopeLabel}\n`
  markdown += `Total: ${thoughts.length} thought${thoughts.length !== 1 ? 's' : ''}\n`

  if (thoughts.length === 0) {
    markdown += `\n---\n\nNo thoughts to export.\n`
    return markdown
  }

  for (const thought of thoughts) {
    markdown += `\n---\n\n`

    if (thought.title) {
      markdown += `## ${thought.title}\n\n`
    } else {
      markdown += `## Untitled Thought\n\n`
    }

    const authorLabel = thought.authorId === currentUserId ? 'You' : 'Other person'
    markdown += `**Author:** ${authorLabel}\n`
    markdown += `**Created:** ${formatExportDate(thought.createdAt)}\n`

    if (thought.updatedAt && thought.updatedAt !== thought.createdAt) {
      const createdMs = thought.createdAt?.toMillis?.() || thought.createdAt
      const updatedMs = thought.updatedAt?.toMillis?.() || thought.updatedAt
      if (updatedMs !== createdMs) {
        markdown += `**Updated:** ${formatExportDate(thought.updatedAt)}\n`
      }
    }

    if (thought.mood && thought.mood !== 'normal') {
      markdown += `**Mood:** ${MOOD_LABELS[thought.mood] || thought.mood}\n`
    }

    markdown += `\n`

    if (thought.body) {
      markdown += `${thought.body}\n`
    }
  }

  return markdown
}

/**
 * Build a JSON export of thoughts
 * @param {Array} thoughts - Array of thought objects
 * @param {Object} context - { scope, currentUserId, chatId }
 * @returns {Object}
 */
export function buildThoughtsJsonExport(thoughts, context) {
  const { scope, currentUserId, chatId } = context

  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    chatId: chatId || null,
    scope: scope,
    thoughtCount: thoughts.length,
    thoughts: thoughts.map(thought => ({
      thoughtId: thought.id,
      authorId: thought.authorId,
      authorLabel: thought.authorId === currentUserId ? 'You' : 'Other person',
      title: thought.title || null,
      body: thought.body || '',
      mood: thought.mood || 'normal',
      createdAt: formatIsoDate(thought.createdAt),
      updatedAt: formatIsoDate(thought.updatedAt)
    }))
  }
}

/**
 * Sanitize a string for use in a filename
 * @param {string} name
 * @returns {string}
 */
export function sanitizeExportFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

/**
 * Get current date string for filename
 * @returns {string}
 */
function getDateString() {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Download a text file
 * @param {string} filename
 * @param {string} content
 * @param {string} mimeType
 * @returns {Object} - { success, fallbackNeeded, error }
 */
export function downloadTextFile(filename, content, mimeType) {
  try {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'

    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)

    return { success: true, fallbackNeeded: false }
  } catch (error) {
    console.error('Download failed:', error)
    return { success: false, fallbackNeeded: true, error: error.message }
  }
}

/**
 * Generate export filename
 * @param {string} scope - 'my_thoughts' | 'all_shared'
 * @param {string} format - 'markdown' | 'json'
 * @returns {string}
 */
export function generateExportFilename(scope, format) {
  const dateStr = getDateString()
  const scopeSlug = scope === 'my_thoughts' ? 'my-thoughts' : 'all-shared'
  const ext = format === 'json' ? 'json' : 'md'
  return `thoughts-${scopeSlug}-${dateStr}.${ext}`
}

/**
 * Check if browser supports file download
 * @returns {boolean}
 */
export function supportsDownload() {
  const a = document.createElement('a')
  return typeof a.download !== 'undefined'
}

export default {
  buildThoughtsMarkdownExport,
  buildThoughtsJsonExport,
  sanitizeExportFileName,
  downloadTextFile,
  generateExportFilename,
  supportsDownload
}
