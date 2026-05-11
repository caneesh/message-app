import { getAPIClient } from '../client'
import type { DecisionWithMeta, DecisionStatus } from '@/types/decisions'

interface CreateDecisionData {
  title: string
  decision: string
  reason?: string
  createdBy: string
}

interface UpdateDecisionData {
  decision?: string
  reason?: string
  status?: DecisionStatus
}

export const decisionsApi = {
  // Path helpers
  getPath: (chatId: string) => `chats/${chatId}/decisions`,
  getDocPath: (chatId: string, decisionId: string) => `chats/${chatId}/decisions/${decisionId}`,

  // Fetch all decisions
  async getAll(chatId: string): Promise<DecisionWithMeta[]> {
    const api = getAPIClient()
    return api.fetchAll<DecisionWithMeta>(this.getPath(chatId), {
      orderBy: { field: 'createdAt', direction: 'desc' },
    })
  },

  // Fetch single decision
  async getById(chatId: string, decisionId: string): Promise<DecisionWithMeta | null> {
    const api = getAPIClient()
    return api.fetchOne<DecisionWithMeta>(this.getDocPath(chatId, decisionId))
  },

  // Subscribe to decisions
  subscribe(chatId: string, callback: (decisions: DecisionWithMeta[]) => void) {
    const api = getAPIClient()
    return api.subscribe<DecisionWithMeta>(
      this.getPath(chatId),
      callback,
      { orderBy: { field: 'createdAt', direction: 'desc' } }
    )
  },

  // Subscribe to single decision
  subscribeToOne(chatId: string, decisionId: string, callback: (decision: DecisionWithMeta | null) => void) {
    const api = getAPIClient()
    return api.subscribeToDoc<DecisionWithMeta>(
      this.getDocPath(chatId, decisionId),
      callback
    )
  },

  // Create decision
  async create(chatId: string, data: CreateDecisionData): Promise<string> {
    const api = getAPIClient()
    return api.create<DecisionWithMeta>(this.getPath(chatId), {
      ...data,
      chatId,
      status: 'proposed',
      confirmations: {},
      history: [{
        type: 'created',
        changedBy: data.createdBy,
        changedAt: new Date(),
        newValue: data.decision,
      }],
      linkedConversations: [],
    } as unknown as Omit<DecisionWithMeta, 'id' | 'createdAt' | 'updatedAt'>)
  },

  // Update decision
  async update(chatId: string, decisionId: string, data: UpdateDecisionData, userId: string) {
    const api = getAPIClient()
    return api.update<DecisionWithMeta>(this.getDocPath(chatId, decisionId), {
      ...data,
      // Would also need to add to history array
    })
  },

  // Confirm decision
  async confirm(chatId: string, decisionId: string, userId: string, note?: string) {
    const api = getAPIClient()
    return api.update<DecisionWithMeta>(this.getDocPath(chatId, decisionId), {
      [`confirmations.${userId}`]: {
        status: 'confirmed',
        confirmedAt: new Date(),
        note,
      },
    } as unknown as Partial<DecisionWithMeta>)
  },

  // Dispute decision
  async dispute(chatId: string, decisionId: string, userId: string, reason: string) {
    const api = getAPIClient()
    return api.update<DecisionWithMeta>(this.getDocPath(chatId, decisionId), {
      [`confirmations.${userId}`]: {
        status: 'disputed',
        confirmedAt: new Date(),
        note: reason,
      },
    } as unknown as Partial<DecisionWithMeta>)
  },

  // Mark as completed
  async complete(chatId: string, decisionId: string) {
    const api = getAPIClient()
    return api.update<DecisionWithMeta>(this.getDocPath(chatId, decisionId), {
      status: 'completed',
    })
  },

  // Cancel decision
  async cancel(chatId: string, decisionId: string) {
    const api = getAPIClient()
    return api.update<DecisionWithMeta>(this.getDocPath(chatId, decisionId), {
      status: 'cancelled',
    })
  },
}

export default decisionsApi
