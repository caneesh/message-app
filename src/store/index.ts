import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AuthSlice } from './slices/authSlice'
import type { UISlice } from './slices/uiSlice'
import type { ChatSlice } from './slices/chatSlice'
import type { NotificationSlice } from './slices/notificationSlice'
import { createAuthSlice } from './slices/authSlice'
import { createUISlice } from './slices/uiSlice'
import { createChatSlice } from './slices/chatSlice'
import { createNotificationSlice } from './slices/notificationSlice'

export interface RootStore extends AuthSlice, UISlice, ChatSlice, NotificationSlice {
  hydrate: () => Promise<void>
  reset: () => void
}

export const useStore = create<RootStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((...args) => ({
          ...createAuthSlice(...args),
          ...createUISlice(...args),
          ...createChatSlice(...args),
          ...createNotificationSlice(...args),

          hydrate: async () => {
            // Hydrate from persisted storage and fetch fresh data
            const [set, get] = args
            const state = get()

            if (state.isAuthenticated && state.currentChatId) {
              // Refresh chat data
              await state.loadMessages(state.currentChatId)
            }
          },

          reset: () => {
            const [set] = args
            set((state) => {
              // Reset all slices to initial state
              state.user = null
              state.isAuthenticated = false
              state.currentChatId = null
              state.messages = {}
              state.notifications = []
            })
          },
        })),
        {
          name: 'oneroom-store',
          partialize: (state) => ({
            // Only persist these fields
            theme: state.theme,
            sidebarCollapsed: state.sidebarCollapsed,
            lastChatId: state.currentChatId,
          }),
        }
      )
    ),
    { name: 'OneRoom Store' }
  )
)

// Typed selectors
export const useAuth = () => useStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isAuthLoading,
  login: state.login,
  logout: state.logout,
}))

export const useUI = () => useStore((state) => ({
  theme: state.theme,
  setTheme: state.setTheme,
  sidebarCollapsed: state.sidebarCollapsed,
  toggleSidebar: state.toggleSidebar,
  activeModal: state.activeModal,
  openModal: state.openModal,
  closeModal: state.closeModal,
}))

export const useChat = () => useStore((state) => ({
  currentChatId: state.currentChatId,
  messages: state.currentChatId ? state.messages[state.currentChatId] || [] : [],
  isLoading: state.isChatLoading,
  sendMessage: state.sendMessage,
  loadMessages: state.loadMessages,
}))

export const useNotifications = () => useStore((state) => ({
  notifications: state.notifications,
  unreadCount: state.notifications.filter((n) => !n.read).length,
  addNotification: state.addNotification,
  markAsRead: state.markAsRead,
  clearAll: state.clearAllNotifications,
}))

export type { AuthSlice, UISlice, ChatSlice, NotificationSlice }
