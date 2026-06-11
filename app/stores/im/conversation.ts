import { defineStore } from 'pinia'

interface IMConversation {
  id: string
  type: string
  title?: string | null
  participant: { id: string; name: string; avatar: string | null } | null
  memberCount?: number | null
  lastMessage: { content: string; senderName: string; createdAt: string } | null
  unreadCount: number
}

interface UnreadResult { code: number; data: { count: number } }
interface ConvListResult { code: number; data: { items: IMConversation[]; total: number; page: number; totalPages: number } }
interface ConvResult { code: number; data: { id: string; type: string; participant: { id: string; name: string; avatar: string | null } } }

export const useIMConversationStore = defineStore('im-conversation', {
  state: () => ({
    conversations: [] as IMConversation[],
    unreadTotal: 0,
    conversationsLoading: false,
    pollTimer: null as ReturnType<typeof setInterval> | null,
  }),

  actions: {
    async fetchUnreadCount() {
      try {
        const result = await $fetch('/api/im/unread-count', { headers: this._authHeaders() }) as UnreadResult
        if (result?.code === 0) this.unreadTotal = result.data?.count || 0
      } catch { /* ignore */ }
    },

    async fetchConversations(page = 1) {
      this.conversationsLoading = true
      try {
        const result = await $fetch('/api/im/conversations', {
          params: { page, pageSize: 30 }, headers: this._authHeaders(),
        }) as ConvListResult
        if (result?.code === 0) this.conversations = result.data.items || []
      } catch { /* ignore */ } finally { this.conversationsLoading = false }
    },

    async createConversation(participantId: string): Promise<string | null> {
      try {
        const result = await $fetch('/api/im/conversations', {
          method: 'POST', body: { participantId }, headers: this._authHeaders(),
        }) as ConvResult
        if (result?.code === 0 && result.data) { await this.fetchConversations(); return result.data.id }
      } catch { /* ignore */ }
      return null
    },

    startPolling() {
      this.stopPolling(); this.fetchUnreadCount(); this.fetchConversations()
      if (import.meta.client) this.pollTimer = setInterval(() => { this.fetchUnreadCount(); this.fetchConversations() }, 10000)
    },
    stopPolling() { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null } },

    _authHeaders(): Record<string, string> {
      const authStore = useAuthStore()
      return authStore.accessToken ? { Authorization: `Bearer ${authStore.accessToken}` } : {}
    },
  },
})
