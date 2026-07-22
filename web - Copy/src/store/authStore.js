import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import { useDataStore } from './dataStore'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,

      login: async (phone, password) => {
        const { token, user } = await api.login(phone, password)
        localStorage.setItem('protutor_token', token)
        set({ user })
        // Bootstrap all data after login
        await useDataStore.getState().bootstrap()
        return user
      },

      logout: () => {
        localStorage.removeItem('protutor_token')
        set({ user: null })
      },

      isManager:     () => get().user?.role === 'manager',
      isCoordinator: () => get().user?.role === 'coordinator',
      isSupport:     () => get().user?.role === 'support',
      canWrite:      () => ['manager', 'coordinator'].includes(get().user?.role),

      cityAllowed: (city) => {
        const user = get().user
        if (!user) return false
        if (user.role === 'manager') return true
        if (!user.cities?.length) return true
        return user.cities.includes(city)
      },
    }),
    {
      name: 'protutor-auth',
      partialize: (state) => ({ user: state.user }),
      // Re-bootstrap data when the page reloads with an existing session
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          const token = localStorage.getItem('protutor_token')
          if (token) useDataStore.getState().bootstrap()
        }
      },
    }
  )
)
