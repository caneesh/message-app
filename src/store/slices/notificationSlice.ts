import type { StateCreator } from 'zustand'
import type { RootStore } from '../index'

export interface Notification {
  id: string
  type: 'message' | 'decision' | 'promise' | 'reminder' | 'system' | 'ai-insight'
  title: string
  body: string
  read: boolean
  timestamp: Date
  data?: Record<string, unknown>
  actionUrl?: string
}

export interface NotificationSlice {
  notifications: Notification[]
  pushEnabled: boolean
  quietHours: { start: number; end: number } | null

  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void

  setPushEnabled: (enabled: boolean) => void
  setQuietHours: (hours: { start: number; end: number } | null) => void
  isInQuietHours: () => boolean
}

const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const createNotificationSlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  NotificationSlice
> = (set, get) => ({
  notifications: [],
  pushEnabled: true,
  quietHours: null,

  addNotification: (notification) => {
    // Skip if in quiet hours
    if (get().isInQuietHours()) return

    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      read: false,
      timestamp: new Date(),
    }

    set((state) => {
      state.notifications.unshift(newNotification)

      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50)
      }
    })
  },

  markAsRead: (id: string) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id)
      if (notification) {
        notification.read = true
      }
    })
  },

  markAllAsRead: () => {
    set((state) => {
      state.notifications.forEach((n) => {
        n.read = true
      })
    })
  },

  removeNotification: (id: string) => {
    set((state) => {
      state.notifications = state.notifications.filter((n) => n.id !== id)
    })
  },

  clearAllNotifications: () => {
    set((state) => {
      state.notifications = []
    })
  },

  setPushEnabled: (enabled: boolean) => {
    set((state) => {
      state.pushEnabled = enabled
    })
  },

  setQuietHours: (hours) => {
    set((state) => {
      state.quietHours = hours
    })
  },

  isInQuietHours: () => {
    const { quietHours } = get()
    if (!quietHours) return false

    const now = new Date()
    const currentHour = now.getHours()

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (quietHours.start > quietHours.end) {
      return currentHour >= quietHours.start || currentHour < quietHours.end
    }

    return currentHour >= quietHours.start && currentHour < quietHours.end
  },
})
