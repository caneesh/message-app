import { useState, useEffect, useCallback } from 'react'
import type { AIInsight, AIInsightType } from '@/types/ai-insights'

interface UseAIInsightsOptions {
  chatId: string
  userId: string
  enabled?: boolean
  maxVisible?: number
  autoHideDelay?: number
}

interface UseAIInsightsReturn {
  insights: AIInsight[]
  visibleInsights: AIInsight[]
  pendingCount: number
  dismissInsight: (id: string) => void
  acceptInsight: (id: string) => void
  dismissAll: () => void
  refreshInsights: () => void
  isLoading: boolean
}

export function useAIInsights({
  chatId,
  userId,
  enabled = true,
  maxVisible = 3,
  autoHideDelay = 8000,
}: UseAIInsightsOptions): UseAIInsightsReturn {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // Filter visible insights
  const visibleInsights = insights
    .filter((i) => i.status === 'pending' && !dismissedIds.has(i.id))
    .slice(0, maxVisible)

  const pendingCount = insights.filter(
    (i) => i.status === 'pending' && !dismissedIds.has(i.id)
  ).length

  // Dismiss an insight
  const dismissInsight = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))

    // Update in Firestore (would be implemented)
    // updateInsightStatus(chatId, id, 'dismissed')
  }, [chatId])

  // Accept an insight
  const acceptInsight = useCallback((id: string) => {
    setInsights((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: 'accepted' as const } : i
      )
    )

    // Update in Firestore (would be implemented)
    // updateInsightStatus(chatId, id, 'accepted')
  }, [chatId])

  // Dismiss all visible insights
  const dismissAll = useCallback(() => {
    visibleInsights.forEach((i) => dismissInsight(i.id))
  }, [visibleInsights, dismissInsight])

  // Refresh insights from server
  const refreshInsights = useCallback(async () => {
    if (!enabled || !chatId || !userId) return

    setIsLoading(true)
    try {
      // Would fetch from Firestore
      // const newInsights = await fetchInsights(chatId, userId)
      // setInsights(newInsights)
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
    } finally {
      setIsLoading(false)
    }
  }, [chatId, userId, enabled])

  // Subscribe to real-time insights (would use Firestore listener)
  useEffect(() => {
    if (!enabled) return

    // Would set up Firestore onSnapshot listener
    // const unsubscribe = subscribeToInsights(chatId, userId, setInsights)
    // return unsubscribe

    return () => {}
  }, [chatId, userId, enabled])

  return {
    insights,
    visibleInsights,
    pendingCount,
    dismissInsight,
    acceptInsight,
    dismissAll,
    refreshInsights,
    isLoading,
  }
}

// Hook for detecting agreement matches in current conversation
interface UseAgreementMatcherOptions {
  chatId: string
  currentMessage: string
  decisions: Array<{ id: string; title: string; decision: string }>
  enabled?: boolean
}

export function useAgreementMatcher({
  chatId,
  currentMessage,
  decisions,
  enabled = true,
}: UseAgreementMatcherOptions) {
  const [matchedDecision, setMatchedDecision] = useState<{
    id: string
    title: string
    decision: string
    relevanceScore: number
  } | null>(null)

  useEffect(() => {
    if (!enabled || !currentMessage || currentMessage.length < 10) {
      setMatchedDecision(null)
      return
    }

    // Simple keyword matching (would be replaced with AI-powered matching)
    const messageLower = currentMessage.toLowerCase()
    const keywords = ['budget', 'dinner', 'date', 'vacation', 'holiday', 'chore', 'clean', 'cook']

    for (const decision of decisions) {
      const decisionLower = decision.decision.toLowerCase()
      const titleLower = decision.title.toLowerCase()

      // Check for keyword overlap
      const matchedKeywords = keywords.filter(
        (kw) => messageLower.includes(kw) && (decisionLower.includes(kw) || titleLower.includes(kw))
      )

      if (matchedKeywords.length > 0) {
        setMatchedDecision({
          ...decision,
          relevanceScore: matchedKeywords.length * 0.3,
        })
        return
      }
    }

    setMatchedDecision(null)
  }, [currentMessage, decisions, enabled])

  return { matchedDecision }
}

// Hook for emotional tone analysis
interface UseEmotionalToneOptions {
  text: string
  enabled?: boolean
}

type EmotionalTone = 'neutral' | 'warm' | 'tense' | 'frustrated' | 'loving' | 'anxious'

export function useEmotionalTone({ text, enabled = true }: UseEmotionalToneOptions) {
  const [tone, setTone] = useState<EmotionalTone>('neutral')
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!enabled || !text || text.length < 10) {
      setTone('neutral')
      setSuggestions([])
      return
    }

    // Simple heuristic analysis (would be replaced with AI-powered analysis)
    const textLower = text.toLowerCase()

    // Tense/frustrated indicators
    const tenseWords = ['never', 'always', 'why don\'t you', 'you never', 'you always', 'seriously']
    const tenseCount = tenseWords.filter((w) => textLower.includes(w)).length

    // Warm/loving indicators
    const warmWords = ['love', 'appreciate', 'thankful', 'grateful', 'miss you', 'proud']
    const warmCount = warmWords.filter((w) => textLower.includes(w)).length

    // Anxious indicators
    const anxiousWords = ['worried', 'concerned', 'stressed', 'nervous', 'scared', 'afraid']
    const anxiousCount = anxiousWords.filter((w) => textLower.includes(w)).length

    if (tenseCount >= 2) {
      setTone('frustrated')
      setSuggestions([
        'Consider focusing on the specific situation instead of patterns',
        'Try "I feel..." instead of "You always/never..."',
      ])
    } else if (tenseCount === 1) {
      setTone('tense')
      setSuggestions([
        'This might come across stronger than intended',
      ])
    } else if (warmCount >= 1) {
      setTone('loving')
      setSuggestions([])
    } else if (anxiousCount >= 1) {
      setTone('anxious')
      setSuggestions([])
    } else {
      setTone('neutral')
      setSuggestions([])
    }
  }, [text, enabled])

  return { tone, suggestions }
}

export default useAIInsights
