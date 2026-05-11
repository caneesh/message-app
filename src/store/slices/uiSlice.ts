import type { StateCreator } from 'zustand'
import type { RootStore } from '../index'

export type Theme = 'light' | 'dark' | 'system'
export type ModalType = 'decision-create' | 'decision-edit' | 'promise-create' | 'settings' | 'ai-settings' | null

export interface UISlice {
  // Theme
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Modals
  activeModal: ModalType
  modalData: Record<string, unknown> | null
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void
  closeModal: () => void

  // Mobile
  isMobileMenuOpen: boolean
  toggleMobileMenu: () => void
  setMobileMenuOpen: (open: boolean) => void

  // Loading states
  isPageLoading: boolean
  setPageLoading: (loading: boolean) => void

  // Toast/Snackbar
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  hideToast: () => void
}

export const createUISlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  UISlice
> = (set, get) => ({
  // Theme
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: (theme: Theme) => {
    set((state) => {
      state.theme = theme

      // Resolve actual theme
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        state.resolvedTheme = prefersDark ? 'dark' : 'light'
      } else {
        state.resolvedTheme = theme
      }

      // Apply to document
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(state.resolvedTheme)
    })
  },

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => {
    set((state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    })
  },
  setSidebarCollapsed: (collapsed: boolean) => {
    set((state) => {
      state.sidebarCollapsed = collapsed
    })
  },

  // Modals
  activeModal: null,
  modalData: null,
  openModal: (modal: ModalType, data?: Record<string, unknown>) => {
    set((state) => {
      state.activeModal = modal
      state.modalData = data || null
    })
  },
  closeModal: () => {
    set((state) => {
      state.activeModal = null
      state.modalData = null
    })
  },

  // Mobile
  isMobileMenuOpen: false,
  toggleMobileMenu: () => {
    set((state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen
    })
  },
  setMobileMenuOpen: (open: boolean) => {
    set((state) => {
      state.isMobileMenuOpen = open
    })
  },

  // Loading
  isPageLoading: false,
  setPageLoading: (loading: boolean) => {
    set((state) => {
      state.isPageLoading = loading
    })
  },

  // Toast
  toast: null,
  showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    set((state) => {
      state.toast = { message, type }
    })

    // Auto-hide after 4 seconds
    setTimeout(() => {
      get().hideToast()
    }, 4000)
  },
  hideToast: () => {
    set((state) => {
      state.toast = null
    })
  },
})
