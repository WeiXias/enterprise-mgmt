import { defineStore } from 'pinia'

interface User {
  id: string
  name: string
  username: string
  role: string
  avatar: string | null
}

interface AuthPayload { code: number; data: { accessToken: string; refreshToken: string; user: User }; message?: string }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: '',
    refreshToken: '',
    initialized: false
  }),

  getters: {
    isLoggedIn: (state) => !!state.accessToken && !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isSalesManager: (state) => state.user?.role === 'sales_manager',
    isFinance: (state) => state.user?.role === 'finance',
    roleLabel: (state) => {
      const labels: Record<string, string> = {
        admin: '管理员',
        sales_manager: '销售负责人',
        sales_member: '成员',
        finance: '财务'
      }
      return labels[state.user?.role || ''] || ''
    }
  },

  actions: {
    async login(username: string, password: string) {
      try {
        const result = await $fetch('/api/auth/login', {
          method: 'POST',
          body: { username, password }
        }) as AuthPayload

        if (result?.code === 0 && result.data) {
          this.accessToken = result.data.accessToken
          this.refreshToken = result.data.refreshToken
          this.user = result.data.user
          this.saveToStorage()
          return true
        }
        return false
      } catch {
        return false
      }
    },

    logout() {
      this.user = null
      this.accessToken = ''
      this.refreshToken = ''
      this.clearStorage()
      navigateTo('/login')
    },

    async refreshAccessToken() {
      if (!this.refreshToken) return false

      try {
        const result = await $fetch('/api/auth/refresh', {
          method: 'POST',
          body: { refreshToken: this.refreshToken }
        }) as AuthPayload

        if (result?.code === 0 && result.data) {
          this.accessToken = result.data.accessToken
          this.refreshToken = result.data.refreshToken
          this.saveToStorage()
          return true
        }
      } catch { /* ignore */ }

      this.logout()
      return false
    },

    saveToStorage() {
      if (import.meta.client) {
        localStorage.setItem('auth_token', this.accessToken)
        localStorage.setItem('refresh_token', this.refreshToken)
        localStorage.setItem('auth_user', JSON.stringify(this.user))
      }
    },

    loadFromStorage() {
      if (import.meta.client) {
        const token = localStorage.getItem('auth_token')
        const refresh = localStorage.getItem('refresh_token')
        const user = localStorage.getItem('auth_user')
        if (token && user) {
          this.accessToken = token
          this.refreshToken = refresh || ''
          this.user = JSON.parse(user)
        }
      }
      this.initialized = true
    },

    clearStorage() {
      if (import.meta.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('auth_user')
      }
    },

    init() {
      this.loadFromStorage()
    }
  }
})
