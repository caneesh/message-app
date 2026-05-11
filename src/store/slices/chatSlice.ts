import type { StateCreator } from 'zustand'
import type { RootStore } from '../index'

export interface Message {
  id: string
  chatId: string
  senderId: string
  text: string
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  replyToId?: string
  attachments?: Attachment[]
  reactions?: Reaction[]
}

export interface Attachment {
  id: string
  type: 'image' | 'file' | 'voice'
  url: string
  name?: string
  size?: number
}

export interface Reaction {
  userId: string
  emoji: string
  timestamp: Date
}

export interface ChatSlice {
  // State
  currentChatId: string | null
  messages: Record<string, Message[]>
  isChatLoading: boolean
  chatError: string | null
  typingUsers: Record<string, string[]>
  draftMessages: Record<string, string>

  // Actions
  setCurrentChat: (chatId: string | null) => void
  loadMessages: (chatId: string) => Promise<void>
  sendMessage: (chatId: string, text: string, replyToId?: string) => Promise<void>
  addOptimisticMessage: (chatId: string, message: Message) => void
  updateMessageStatus: (chatId: string, messageId: string, status: Message['status']) => void
  removeMessage: (chatId: string, messageId: string) => void
  addReaction: (chatId: string, messageId: string, emoji: string) => void
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void
  setDraft: (chatId: string, text: string) => void
  clearDraft: (chatId: string) => void
}

// Temp ID generator for optimistic updates
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const createChatSlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  ChatSlice
> = (set, get) => ({
  currentChatId: null,
  messages: {},
  isChatLoading: false,
  chatError: null,
  typingUsers: {},
  draftMessages: {},

  setCurrentChat: (chatId: string | null) => {
    set((state) => {
      state.currentChatId = chatId
    })
  },

  loadMessages: async (chatId: string) => {
    set((state) => {
      state.isChatLoading = true
      state.chatError = null
    })

    try {
      // Would fetch from Firestore
      // const messages = await fetchMessages(chatId)

      set((state) => {
        state.isChatLoading = false
        // state.messages[chatId] = messages
      })
    } catch (error) {
      set((state) => {
        state.isChatLoading = false
        state.chatError = error instanceof Error ? error.message : 'Failed to load messages'
      })
    }
  },

  sendMessage: async (chatId: string, text: string, replyToId?: string) => {
    const user = get().user
    if (!user) throw new Error('Not authenticated')

    const tempId = generateTempId()
    const optimisticMessage: Message = {
      id: tempId,
      chatId,
      senderId: user.id,
      text,
      timestamp: new Date(),
      status: 'sending',
      replyToId,
    }

    // 1. Add optimistic message
    get().addOptimisticMessage(chatId, optimisticMessage)
    get().clearDraft(chatId)

    try {
      // 2. Send to server
      // const result = await api.messages.send(chatId, { text, replyToId })

      // 3. Update with real ID and status
      set((state) => {
        const messages = state.messages[chatId]
        if (messages) {
          const index = messages.findIndex((m) => m.id === tempId)
          if (index !== -1) {
            messages[index] = {
              ...messages[index],
              // id: result.id,
              status: 'sent',
            }
          }
        }
      })
    } catch (error) {
      // 4. Rollback on failure
      set((state) => {
        const messages = state.messages[chatId]
        if (messages) {
          const index = messages.findIndex((m) => m.id === tempId)
          if (index !== -1) {
            messages[index].status = 'failed'
          }
        }
      })

      get().showToast('Failed to send message', 'error')
      throw error
    }
  },

  addOptimisticMessage: (chatId: string, message: Message) => {
    set((state) => {
      if (!state.messages[chatId]) {
        state.messages[chatId] = []
      }
      state.messages[chatId].push(message)
    })
  },

  updateMessageStatus: (chatId: string, messageId: string, status: Message['status']) => {
    set((state) => {
      const messages = state.messages[chatId]
      if (messages) {
        const message = messages.find((m) => m.id === messageId)
        if (message) {
          message.status = status
        }
      }
    })
  },

  removeMessage: (chatId: string, messageId: string) => {
    set((state) => {
      const messages = state.messages[chatId]
      if (messages) {
        const index = messages.findIndex((m) => m.id === messageId)
        if (index !== -1) {
          messages.splice(index, 1)
        }
      }
    })
  },

  addReaction: (chatId: string, messageId: string, emoji: string) => {
    const user = get().user
    if (!user) return

    set((state) => {
      const messages = state.messages[chatId]
      if (messages) {
        const message = messages.find((m) => m.id === messageId)
        if (message) {
          if (!message.reactions) {
            message.reactions = []
          }

          // Remove existing reaction from same user
          message.reactions = message.reactions.filter((r) => r.userId !== user.id)

          // Add new reaction
          message.reactions.push({
            userId: user.id,
            emoji,
            timestamp: new Date(),
          })
        }
      }
    })
  },

  setTyping: (chatId: string, userId: string, isTyping: boolean) => {
    set((state) => {
      if (!state.typingUsers[chatId]) {
        state.typingUsers[chatId] = []
      }

      if (isTyping) {
        if (!state.typingUsers[chatId].includes(userId)) {
          state.typingUsers[chatId].push(userId)
        }
      } else {
        state.typingUsers[chatId] = state.typingUsers[chatId].filter((id) => id !== userId)
      }
    })
  },

  setDraft: (chatId: string, text: string) => {
    set((state) => {
      state.draftMessages[chatId] = text
    })
  },

  clearDraft: (chatId: string) => {
    set((state) => {
      delete state.draftMessages[chatId]
    })
  },
})
