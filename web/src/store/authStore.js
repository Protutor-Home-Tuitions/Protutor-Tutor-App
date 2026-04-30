import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { id, name, phone, role, cities }

      login: (userData) => set({ user: userData }),

      logout: () => set({ user: null }),

      // Role helpers
      isManager: () => {
        const { user } = useAuthStore.getState()
        return user?.role === 'manager'
      },
      isCoordinator: () => {
        const { user } = useAuthStore.getState()
        return user?.role === 'coordinator'
      },
      isSupport: () => {
        const { user } = useAuthStore.getState()
        return user?.role === 'support'
      },
      canWrite: () => {
        const { user } = useAuthStore.getState()
        return user?.role === 'manager' || user?.role === 'coordinator'
      },
      cityAllowed: (city) => {
        const { user } = useAuthStore.getState()
        if (!user) return false
        if (user.role === 'manager') return true
        if (!user.cities || user.cities.length === 0) return true
        return user.cities.includes(city)
      },
    }),
    {
      name: 'protutor-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
