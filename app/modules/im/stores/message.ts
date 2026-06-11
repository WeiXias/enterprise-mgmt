import { defineStore } from 'pinia'

interface IMMessage {
  id: string; conversationId: string; type?: string
  sender: { id: string; name: string; avatar: string | null }
  content: string | null; isDeleted: boolean; mentions: string[] | null; attachments?: any[]; createdAt: string
}
interface MsgListResult { code: number; data: { items: IMMessage[]; total: number; page: number; totalPages: number } }

export const useIMMessageStore = defineStore('im-message', {
  state: () => ({
    messages: [] as IMMessage[],
    messagesLoading: false,
    messagesTotal: 0, messagesTotalPages: 0, messagesPage: 1,
    messagePollTimer: null as ReturnType<typeof setInterval> | null,
  }),

  actions: {
    async fetchMessages(conversationId: string, page?: number, replace = false) {
      if (!conversationId) return
      this.messagesLoading = true
      const p = page || 1
      try {
        const result = await $fetch(`/api/im/conversations/${conversationId}/messages`, { params: { page: p, pageSize: 50 }, headers: useAuthHeaders() }) as MsgListResult
        if (result?.code === 0) {
          if (replace) { this.messages = result.data.items || [] }
          else if (p > 1 || page) {
            const existing = new Set(this.messages.map(m => m.id))
            this.messages = [...(result.data.items || []).filter(m => !existing.has(m.id)), ...this.messages]
          } else { this.messages = result.data.items || [] }
          this.messagesTotal = result.data.total; this.messagesTotalPages = result.data.totalPages; this.messagesPage = p
        }
      } catch { /* ignore */ } finally { this.messagesLoading = false }
    },

    async sendMessage(conversationId: string, content: string): Promise<boolean> {
      try {
        const result = await $fetch(`/api/im/conversations/${conversationId}/messages`, { method: 'POST', body: { content }, headers: useAuthHeaders() }) as any
        return result?.code === 0
      } catch { return false }
    },

    async deleteMessage(messageId: string) {
      try {
        await $fetch(`/api/im/messages/${messageId}`, { method: 'DELETE', headers: useAuthHeaders() })
        const msg = this.messages.find(m => m.id === messageId)
        if (msg) { msg.isDeleted = true; msg.content = null }
      } catch { /* ignore */ }
    },

    async markAsRead(conversationId: string, messageId: string) {
      try { await $fetch(`/api/im/conversations/${conversationId}/read`, { method: 'PUT', body: { messageId }, headers: useAuthHeaders() }) } catch { /* ignore */ }
    },

    startMessagePolling(conversationId: string) {
      this.stopMessagePolling()
      if (import.meta.client) this.messagePollTimer = setInterval(() => this.fetchMessages(conversationId, 1), 3000)
    },
    stopMessagePolling() { if (this.messagePollTimer) { clearInterval(this.messagePollTimer); this.messagePollTimer = null } },
  },
})
