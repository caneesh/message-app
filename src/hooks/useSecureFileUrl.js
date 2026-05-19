import { useState, useEffect, useCallback } from 'react'
import { storage } from '../firebase/firebaseConfig'
import { ref, getDownloadURL } from 'firebase/storage'

const urlCache = new Map()
const CACHE_DURATION_MS = 30 * 60 * 1000 // 30 minutes

export function useSecureFileUrl(chatId, storagePath) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUrl = useCallback(async () => {
    if (!chatId || !storagePath) {
      setLoading(false)
      return
    }

    const cacheKey = `${chatId}:${storagePath}`
    const cached = urlCache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const storageRef = ref(storage, storagePath)
      const downloadUrl = await getDownloadURL(storageRef)

      urlCache.set(cacheKey, {
        url: downloadUrl,
        expiresAt: Date.now() + CACHE_DURATION_MS,
      })

      setUrl(downloadUrl)
    } catch (err) {
      console.error('Failed to get download URL:', err)
      setError(err.message || 'Failed to load file')
    } finally {
      setLoading(false)
    }
  }, [chatId, storagePath])

  useEffect(() => {
    fetchUrl()
  }, [fetchUrl])

  return { url, loading, error, refetch: fetchUrl }
}
