import { defineStore } from 'pinia'

interface Notification {
  id: string
  type: string
  title: string
  content?: string
  isRead: boolean
  relatedId?: string
  relatedType?: string
  createdAt: string
}

interface UnreadResult { code: number; data: { count: number } }

interface NotifListResult { code: number; data: { items: Notification[]; total: number; page: number; totalPages: number } }

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    unreadCount: 0,
    notifications: [] as Notification[],
    loading: false,
    pollingTimer: null as ReturnType<typeof setInterval> | null,
  }),

  actions: {
    async fetchUnreadCount() {
      try {
        const result = await $fetch('/api/notifications/unread-count', {
          headers: this.getAuthHeaders(),
        }) as UnreadResult
        if (result?.code === 0) {
          this.unreadCount = result.data?.count || 0
        }
      } catch { /* ignore */ }
    },

    async fetchNotifications(page = 1, isRead?: boolean) {
      this.loading = true
      try {
        const params: Record<string, unknown> = { page, pageSize: 20 }
        if (isRead !== undefined) params.isRead = isRead
        const result = await $fetch('/api/notifications', {
          params,
          headers: this.getAuthHeaders(),
        }) as NotifListResult
        if (result?.code === 0) {
          this.notifications = result.data.items || []
          return { items: result.data.items, total: result.data.total, page: result.data.page, totalPages: result.data.totalPages }
        }
      } catch { /* ignore */ } finally {
        this.loading = false
      }
      return { items: [], total: 0, page: 1, totalPages: 0 }
    },

    async markAsRead(id: string) {
      try {
        await $fetch(`/api/notifications/${id}/read`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
        })
        // 更新本地
        const n = this.notifications.find(n => n.id === id)
        if (n) n.isRead = true
        if (this.unreadCount > 0) this.unreadCount--
      } catch { /* ignore */ }
    },

    async markAllAsRead() {
      try {
        await $fetch('/api/notifications/read-all', {
          method: 'PUT',
          headers: this.getAuthHeaders(),
        })
        this.notifications.forEach(n => n.isRead = true)
        this.unreadCount = 0
      } catch { /* ignore */ }
    },

    startPolling(intervalMs = 30000) {
      this.stopPolling()
      this.fetchUnreadCount()
      if (import.meta.client) {
        this.pollingTimer = setInterval(() => this.fetchUnreadCount(), intervalMs)
      }
    },

    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },

    getAuthHeaders(): Record<string, string> {
      const authStore = useAuthStore()
      return authStore.accessToken ? { Authorization: `Bearer ${authStore.accessToken}` } : {}
    },

    /** 根据通知类型决定跳转路径 */
    getNotificationLink(notification: Notification): string {
      if (notification.relatedType && notification.relatedId) {
        const type = notification.relatedType.toLowerCase()
        if (type.includes('customer')) return `/dashboard/customers/${notification.relatedId}`
        if (type.includes('opportunity')) return `/dashboard/opportunities/${notification.relatedId}`
        if (type.includes('contract')) return `/dashboard/contracts/${notification.relatedId}`
        if (type.includes('payment_plan')) return `/dashboard/contracts/${notification.relatedId}`
        if (type.includes('project')) return `/dashboard/projects/${notification.relatedId}`
        if (type.includes('product')) return `/dashboard/products/${notification.relatedId}`
        if (type.includes('invoice')) return `/dashboard/finance/invoices`
      }
      return '/dashboard/notifications'
    },
  },
})
