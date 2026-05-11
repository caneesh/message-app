import type { StateCreator } from 'zustand'
import type { RootStore } from '../index'

export interface User {
  id: string
  phoneNumber: string
  displayName?: string
  photoURL?: string
  createdAt: Date
}

export interface AuthSlice {
  user: User | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  authError: string | null

  login: (phoneNumber: string, verificationCode: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  clearAuthError: () => void
}

export const createAuthSlice: StateCreator<
  RootStore,
  [['zustand/immer', never]],
  [],
  AuthSlice
> = (set, get) => ({
  user: null,
  isAuthenticated: false,
  isAuthLoading: false,
  authError: null,

  login: async (phoneNumber: string, verificationCode: string) => {
    set((state) => {
      state.isAuthLoading = true
      state.authError = null
    })

    try {
      // Firebase auth would happen here
      // const result = await signInWithPhoneNumber(phoneNumber, verificationCode)

      set((state) => {
        state.isAuthenticated = true
        state.isAuthLoading = false
        // state.user = mapFirebaseUser(result.user)
      })
    } catch (error) {
      set((state) => {
        state.isAuthLoading = false
        state.authError = error instanceof Error ? error.message : 'Login failed'
      })
      throw error
    }
  },

  logout: async () => {
    set((state) => {
      state.isAuthLoading = true
    })

    try {
      // Firebase signOut would happen here
      // await signOut(auth)

      set((state) => {
        state.user = null
        state.isAuthenticated = false
        state.isAuthLoading = false
      })

      // Reset entire store
      get().reset()
    } catch (error) {
      set((state) => {
        state.isAuthLoading = false
        state.authError = error instanceof Error ? error.message : 'Logout failed'
      })
    }
  },

  setUser: (user: User | null) => {
    set((state) => {
      state.user = user
      state.isAuthenticated = user !== null
    })
  },

  clearAuthError: () => {
    set((state) => {
      state.authError = null
    })
  },
})
