import { getAPIClient } from '../client'
import type { Message } from '@/store/slices/chatSlice'

export const messagesApi = {
  // Path helper
  getPath: (chatId: string) => `chats/${chatId}/messages`,
  getDocPath: (chatId: string, messageId: string) => `chats/${chatId}/messages/${messageId}`,

  // Fetch messages
  async getAll(chatId: string, options?: { limit?: number }): Promise<Message[]> {
    const api = getAPIClient()
    return api.fetchAll<Message>(this.getPath(chatId), {
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: options?.limit || 50,
    })
  },

  // Subscribe to messages
  subscribe(chatId: string, callback: (messages: Message[]) => void) {
    const api = getAPIClient()
    return api.subscribe<Message>(
      this.getPath(chatId),
      callback,
      { orderBy: { field: 'timestamp', direction: 'asc' } }
    )
  },

  // Send message
  async send(chatId: string, data: {
    text: string
    senderId: string
    replyToId?: string
    attachments?: Array<{ type: string; url: string; name?: string }>
  }): Promise<string> {
    const api = getAPIClient()
    return api.create<Message>(this.getPath(chatId), {
      ...data,
      chatId,
      status: 'sent',
      timestamp: new Date(),
    } as Omit<Message, 'id' | 'createdAt' | 'updatedAt'>)
  },

  // Update message status
  async updateStatus(chatId: string, messageId: string, status: Message['status']) {
    const api = getAPIClient()
    return api.update<Message>(this.getDocPath(chatId, messageId), { status })
  },

  // Add reaction
  async addReaction(chatId: string, messageId: string, userId: string, emoji: string) {
    const api = getAPIClient()
    // Would need to handle array update - simplified here
    return api.update<Message>(this.getDocPath(chatId, messageId), {
      // reactions: arrayUnion({ userId, emoji, timestamp: new Date() })
    })
  },

  // Delete message
  async delete(chatId: string, messageId: string) {
    const api = getAPIClient()
    return api.delete(this.getDocPath(chatId, messageId))
  },
}

export default messagesApi
