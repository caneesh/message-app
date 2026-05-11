import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: any, format: 'full' | 'short' | 'long' = 'full'): string {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    if (format === 'short') {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
    if (format === 'long') {
      return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    }
    return date.toLocaleDateString()
  } catch {
    return ''
  }
}

export function formatRelativeTime(timestamp: any): string {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffSecs < 60) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    if (diffMonths < 12) return `${diffMonths}mo ago`
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

export function formatTime(timestamp: any): string {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function formatDateTime(timestamp: any): string {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function truncateText(text: string, maxLength: number = 80): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function isImageType(contentType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'].includes(contentType)
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
