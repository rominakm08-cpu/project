import { create } from 'zustand'
import { authApi } from '../api'

interface Store {
  user: any
  profile: any
  tgUser: any
  loading: boolean
  init: () => Promise<void>
  setProfile: (p: any) => void
}

export const useStore = create<Store>(set => ({
  user: null, profile: null, tgUser: null, loading: true,
  init: async () => {
    try {
      const { data } = await authApi.login()
      set({ user: data.user, profile: data.profile, tgUser: data.tgUser, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  setProfile: p => set({ profile: p }),
}))
