// URL regex - safe, only http/https
const URL_REGEX = /https?:\/\/[^\s<>"\])}]+/gi

export function extractLinksFromText(text) {
  if (!text) return []
  const matches = text.match(URL_REGEX)
  if (!matches) return []

  // Deduplicate and sanitize
  const seen = new Set()
  return matches.filter(url => {
    const normalized = url.toLowerCase()
    if (seen.has(normalized)) return false
    seen.add(normalized)
    // Only allow http/https
    return /^https?:\/\//i.test(url)
  })
}

export function getDomainFromUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url
  }
}

export function isImageContentType(contentType) {
  if (!contentType) return false
  return [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/avif'
  ].includes(contentType)
}

export function isVideoContentType(contentType) {
  if (!contentType) return false
  return [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ].includes(contentType)
}

export function isDocumentContentType(contentType) {
  if (!contentType) return false
  return [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ].includes(contentType)
}

export function isVoiceMessage(message) {
  return message.type === 'voice' && message.voice?.storagePath
}

export function getMessageMediaKind(message) {
  if (message.type === 'voice') return 'voice'
  if (message.type === 'video') return 'video'
  if (message.type === 'file' && message.file) {
    if (isImageContentType(message.file.contentType)) return 'image'
    if (isVideoContentType(message.file.contentType)) return 'video'
    if (isDocumentContentType(message.file.contentType)) return 'document'
    return 'document' // Default for other file types
  }
  if (message.type === 'text' && message.text) {
    const links = extractLinksFromText(message.text)
    if (links.length > 0) return 'link'
  }
  return null
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function truncateText(text, maxLength = 100) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
