/**
 * Service to extract text from supported attachment types
 * for creating Thoughts from attachments.
 *
 * Supported types (v1):
 * - text/plain
 * - text/markdown
 * - Files with .md extension
 *
 * Does NOT support:
 * - PDF (would need pdf.js or server-side)
 * - DOC/DOCX (would need server-side)
 * - Images (no OCR in v1)
 */

import { storage } from '../firebase/firebaseConfig'
import { ref, getDownloadURL } from 'firebase/storage'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_TEXT_LENGTH = 10000 // Align with Thought body limit

// Supported MIME types for text extraction
const SUPPORTED_TEXT_TYPES = [
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]

/**
 * Check if a file type is supported for text extraction
 * @param {string} contentType - MIME type
 * @param {string} fileName - File name (for extension check)
 * @returns {boolean}
 */
export function isTextExtractionSupported(contentType, fileName) {
  // Check MIME type
  if (contentType && SUPPORTED_TEXT_TYPES.includes(contentType.toLowerCase())) {
    return true
  }

  // Check file extension for markdown files
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext === 'md' || ext === 'txt' || ext === 'markdown') {
      return true
    }
  }

  return false
}

/**
 * Check if file is an image (for special handling)
 * @param {string} contentType - MIME type
 * @returns {boolean}
 */
export function isImageType(contentType) {
  return contentType && contentType.startsWith('image/')
}

/**
 * Extract text from a supported attachment
 * @param {string} chatId - Chat ID for storage path resolution
 * @param {Object} fileInfo - File metadata
 * @param {string} fileInfo.storagePath - Firebase Storage path
 * @param {string} fileInfo.contentType - MIME type
 * @param {string} fileInfo.fileName - Original file name
 * @param {number} [fileInfo.size] - File size in bytes
 * @returns {Promise<Object>} - { success, text, error, warning }
 */
export async function extractTextFromAttachment(chatId, fileInfo) {
  const { storagePath, contentType, fileName, size } = fileInfo

  if (!storagePath) {
    return { success: false, error: 'No storage path provided' }
  }

  // Check file size if known
  if (size && size > MAX_FILE_SIZE) {
    return { success: false, error: 'This file is too large to convert right now.' }
  }

  // Check if it's an image (not supported)
  if (isImageType(contentType)) {
    return { success: false, error: 'Image files cannot be converted to text. Create a Thought manually instead.' }
  }

  // Check if type is supported
  if (!isTextExtractionSupported(contentType, fileName)) {
    return { success: false, error: "This file type can't be converted to a Thought yet." }
  }

  try {
    // Get download URL
    const storageRef = ref(storage, storagePath)
    const url = await getDownloadURL(storageRef)

    // Fetch the file content
    const response = await fetch(url)

    if (!response.ok) {
      return { success: false, error: 'Could not download file.' }
    }

    // Check content length from response
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      return { success: false, error: 'This file is too large to convert right now.' }
    }

    // Read as text
    const text = await response.text()

    if (!text || !text.trim()) {
      return { success: false, error: 'The file appears to be empty.' }
    }

    // Clean up the text
    let cleanedText = text
      .trim()
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive blank lines (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')

    // Check if truncation needed
    let warning = null
    if (cleanedText.length > MAX_TEXT_LENGTH) {
      cleanedText = cleanedText.slice(0, MAX_TEXT_LENGTH)
      warning = 'This file is long. Please review before publishing.'
    }

    return {
      success: true,
      text: cleanedText,
      warning
    }
  } catch (error) {
    console.error('Error extracting text from attachment:', error)
    return { success: false, error: 'Could not read file content.' }
  }
}

/**
 * Get a user-friendly description for unsupported files
 * @param {string} contentType - MIME type
 * @param {string} fileName - File name
 * @returns {string}
 */
export function getUnsupportedFileMessage(contentType, fileName) {
  if (isImageType(contentType)) {
    return 'Image files cannot be converted to Thoughts yet.'
  }

  if (contentType === 'application/pdf') {
    return 'PDF files are not supported for conversion yet.'
  }

  if (contentType?.includes('word') || fileName?.match(/\.docx?$/i)) {
    return 'Word documents are not supported for conversion yet.'
  }

  return "This file type can't be converted to a Thought yet."
}
