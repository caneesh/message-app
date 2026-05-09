import { useState, useEffect } from 'react'
import { db, functions } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

function ToneRepairAiButton({ currentUser, chatId, text, onSuggestion, disabled }) {
  const [aiEnabled, setAiEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentUser) return
    checkAiEnabled()
  }, [currentUser])

  const checkAiEnabled = async () => {
    try {
      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'ai')
      const snapshot = await getDoc(settingsRef)
      if (snapshot.exists()) {
        const settings = snapshot.data()
        setAiEnabled(settings.enabled && settings.features?.toneRepair !== false)
      }
    } catch (err) {
      console.error('Error checking AI settings:', err)
    }
  }

  const handleClick = async () => {
    if (!text?.trim() || loading || disabled) return

    setLoading(true)
    setError('')

    try {
      const aiToneRepair = httpsCallable(functions, 'aiToneRepair')
      const result = await aiToneRepair({
        chatId,
        originalText: text.trim(),
        toneGoal: 'softer',
      })

      if (result.data.suggestion?.rewrittenText) {
        onSuggestion({
          original: text,
          softened: result.data.suggestion.rewrittenText,
          suggestionId: result.data.suggestionId,
          isAi: true,
        })
      } else if (result.data.reason === 'NO_SUGGESTION' || result.data.reason === 'AI_OUTPUT_FILTERED') {
        setError('No changes needed')
        setTimeout(() => setError(''), 2000)
      }
    } catch (err) {
      console.error('AI tone repair error:', err)
      if (err.code === 'functions/resource-exhausted') {
        setError('Rate limit reached')
      } else if (err.code === 'functions/failed-precondition') {
        setError('Enable AI in Settings')
      } else {
        setError('AI unavailable')
      }
      setTimeout(() => setError(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (!aiEnabled) {
    return null
  }

  return (
    <div className="tone-repair-ai">
      <button
        type="button"
        className="tone-ai-btn"
        onClick={handleClick}
        disabled={loading || disabled || !text?.trim()}
        title="AI soften (powered by Claude)"
        aria-label="AI soften message"
      >
        {loading ? '...' : '✨'}
      </button>
      {error && <span className="tone-ai-error">{error}</span>}
    </div>
  )
}

export default ToneRepairAiButton
