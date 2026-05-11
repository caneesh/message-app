import type { Timestamp } from 'firebase/firestore'

// Base insight type
export type AIInsightType =
  | 'agreement_reminder'
  | 'memory_resurface'
  | 'conflict_signal'
  | 'promise_nudge'
  | 'coordination_tip'
  | 'emotional_clarity'
  | 'workload_awareness'

export interface AIInsight {
  id: string
  type: AIInsightType
  title: string
  message: string
  context?: string
  confidence: number
  createdAt: Timestamp
  expiresAt: Timestamp
  targetUserId: string
  sourceMessageId?: string
  relatedItemId?: string
  relatedItemType?: 'decision' | 'promise' | 'memory' | 'reminder'
  status: 'pending' | 'accepted' | 'dismissed' | 'expired'
  dismissedAt?: Timestamp
  acceptedAt?: Timestamp
  metadata?: Record<string, unknown>
}

// Agreement match when conversation relates to existing decision
export interface AgreementMatch extends AIInsight {
  type: 'agreement_reminder'
  metadata: {
    decisionId: string
    decisionTitle: string
    decisionText: string
    decidedAt: Timestamp
    matchedKeywords: string[]
    relevanceScore: number
  }
}

// Conflict signal for unresolved conversations
export interface ConflictSignal extends AIInsight {
  type: 'conflict_signal'
  metadata: {
    conversationStart: Timestamp
    conversationEnd: Timestamp
    topic: string
    indicators: string[]
    suggestedApproach: string
    requiresBothOptIn: boolean
    partnerOptedIn?: boolean
  }
}

// Promise detection from conversation
export interface PromiseDetection extends AIInsight {
  type: 'promise_nudge'
  metadata: {
    promiseText: string
    promiserId: string
    inferredDueDate?: Timestamp
    daysPastDue?: number
    escalationLevel: 1 | 2 | 3 | 4
    suggestedFollowUp?: string
  }
}

// Memory trigger for resurfacing
export interface MemoryTrigger extends AIInsight {
  type: 'memory_resurface'
  metadata: {
    memoryId: string
    memoryTitle: string
    memoryDate: Timestamp
    thumbnailUrl?: string
    triggerReason: 'anniversary' | 'keyword' | 'on_this_day' | 'contextual'
  }
}

// Coordination suggestions
export interface CoordinationTip extends AIInsight {
  type: 'coordination_tip'
  metadata: {
    actionType: 'add_to_calendar' | 'create_reminder' | 'save_to_vault' | 'create_list'
    extractedData: {
      title?: string
      date?: Timestamp
      time?: string
      location?: string
      participants?: string[]
    }
  }
}

// Emotional tone analysis
export interface EmotionalClarity extends AIInsight {
  type: 'emotional_clarity'
  metadata: {
    detectedTone: 'neutral' | 'warm' | 'tense' | 'frustrated' | 'loving' | 'anxious'
    toneStrength: number
    suggestions: string[]
    originalText: string
  }
}

// Workload balance insight
export interface WorkloadAwareness extends AIInsight {
  type: 'workload_awareness'
  metadata: {
    period: 'weekly' | 'monthly'
    categories: {
      name: string
      userContributions: number
      partnerContributions: number
    }[]
    celebrationNote: string
    growthAreas?: string[]
  }
}

// Relationship pulse metrics
export interface RelationshipPulseData {
  periodStart: Timestamp
  periodEnd: Timestamp
  messageCount: {
    user: number
    partner: number
  }
  averageResponseTime: {
    user: number
    partner: number
  }
  emotionalCheckIns: {
    count: number
    averageMood: number
  }
  decisionsCompleted: number
  promisesFulfilled: number
  memoriesCreated: number
  activeDecisions: number
  pendingPromises: number
  trends: {
    communication: 'improving' | 'stable' | 'declining'
    engagement: 'improving' | 'stable' | 'declining'
    accountability: 'improving' | 'stable' | 'declining'
  }
}

// AI Settings per user
export interface AIUserSettings {
  aiEnabled: boolean
  features: {
    agreementReminders: boolean
    memoryResurfacing: boolean
    conflictDetection: boolean
    promiseTracking: boolean
    coordinationTips: boolean
    emotionalClarity: boolean
    workloadAwareness: boolean
    relationshipPulse: boolean
  }
  notifications: {
    enabled: boolean
    quietHoursStart: number
    quietHoursEnd: number
    maxPerDay: number
  }
  privacy: {
    allowMessageAnalysis: boolean
    shareInsightsWithPartner: boolean
  }
  consentedAt: Timestamp
  consentVersion: string
}
