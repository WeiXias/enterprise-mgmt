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

interface IMMessage {
  id: string; conversationId: string; type?: string
  sender: { id: string; name: string; avatar: string | null }
  content: string | null; isDeleted: boolean; mentions: string[] | null; attachments?: any[]
  replyTo?: { content: string | null; sender: { id: string; name: string } | null } | null
  readByCount?: number; readByNames?: string[]
  createdAt: string
}

interface UnreadResult { code: number; data: { count: number } }
interface ConvListResult { code: number; data: { items: IMConversation[]; total: number; page: number; totalPages: number } }
interface ConvResult { code: number; data: { id: string; type: string; participant: { id: string; name: string; avatar: string | null } } }
interface MsgListResult { code: number; data: { items: IMMessage[]; total: number; page: number; totalPages: number } }

export const useIMConversationStore = defineStore('im-conversation', {
  state: () => ({
    conversations: [] as IMConversation[],
    unreadTotal: 0,
    conversationsLoading: false,
    activeConversationId: null as string | null,
    pollTimer: null as ReturnType<typeof setInterval> | null,
    // message state
    messages: [] as IMMessage[],
    messagesLoading: false,
    messagesTotal: 0,
    messagesTotalPages: 0,
    messagesPage: 1,
    messagePollTimer: null as ReturnType<typeof setInterval> | null,
  }),

  getters: {
    activeConversation: (state) => state.conversations.find(c => c.id === state.activeConversationId) || null,
  },

  actions: {
    _authHeaders(): Record<string, string> {
      const authStore = useAuthStore()
      return authStore.accessToken ? { Authorization: `Bearer ${authStore.accessToken}` } : {}
    },

    async fetchUnreadCount() {
      try {
        const result = await $fetch('/api/im/unread-count', { headers: this._authHeaders() }) as UnreadResult
        if (result?.code === 0) this.unreadTotal = result.data?.count || 0
      } catch { /* ignore */ }
    },
    async fetchConversations(page = 1) {
      this.conversationsLoading = true
      try {
        const result = await $fetch('/api/im/conversations', { params: { page, pageSize: 30 }, headers: this._authHeaders() }) as ConvListResult
        if (result?.code === 0) this.conversations = result.data.items || []
      } catch { /* ignore */ } finally { this.conversationsLoading = false }
    },
    async createConversation(participantId: string): Promise<string | null> {
      try {
        const result = await $fetch('/api/im/conversations', { method: 'POST', body: { participantId }, headers: this._authHeaders() }) as ConvResult
        if (result?.code === 0 && result.data) { await this.fetchConversations(); return result.data.id }
      } catch { /* ignore */ }
      return null
    },
    setActiveConversation(id: string | null) { this.activeConversationId = id },

    // message actions
    async fetchMessages(conversationId: string, page?: number, replace = false) {
      if (!conversationId) return
      this.messagesLoading = true
      const p = page || 1
      try {
        const result = await $fetch(`/api/im/conversations/${conversationId}/messages`, { params: { page: p, pageSize: 50 }, headers: this._authHeaders() }) as MsgListResult
        if (result?.code === 0) {
          // API 返回 DESC（最新在前），reverse 为 ASC（旧→新）便于渲染
          const items = (result.data.items || []).reverse()
          if (replace) { this.messages = items }
          else if (p > 1) {
            // 加载更早的消息，prepend
            const existing = new Set(this.messages.map(m => m.id))
            this.messages = [...items.filter((m: IMMessage) => !existing.has(m.id)), ...this.messages]
          } else {
            // page=1 增量合并：追加新消息 + 更新已有消息状态
            this.mergeNewMessages(items)
          }
          this.messagesTotal = result.data.total; this.messagesTotalPages = result.data.totalPages; this.messagesPage = p
        }
      } catch { /* ignore */ } finally { this.messagesLoading = false }
    },

    // 增量合并：只追加本地没有的新消息，更新已存在消息（如撤回状态）
    mergeNewMessages(newItems: IMMessage[]) {
      const existingMap = new Map(this.messages.map(m => [m.id, m]))
      for (const item of newItems) {
        // 防止串话：消息的 conversationId 必须匹配当前活跃会话
        if (item.conversationId !== this.activeConversationId) continue
        const existing = existingMap.get(item.id)
        if (existing) {
          existing.isDeleted = item.isDeleted
          existing.content = item.content
          existing.readByCount = item.readByCount
          existing.readByNames = item.readByNames
        } else {
          this.messages.push(item)
        }
      }
    },

    async sendMessage(conversationId: string, content: string, replyTo?: string): Promise<boolean> {
      try {
        const result = await $fetch(`/api/im/conversations/${conversationId}/messages`, { method: 'POST', body: { content, replyTo }, headers: this._authHeaders() }) as any
        if (result?.code === 0 && result.data) {
          // 乐观插入：直接把服务端返回的新消息加到本地列表末尾
          const msg: IMMessage = {
            id: result.data.id,
            conversationId,
            type: 'text',
            sender: { id: result.data.senderId, name: '', avatar: null },
            content: result.data.content,
            isDeleted: false,
            mentions: result.data.mentions || null,
            createdAt: result.data.createdAt,
          }
          // 避免轮询返回的重复
          if (!this.messages.find(m => m.id === msg.id)) {
            this.messages.push(msg)
          }
          this.messagesTotal++
          return true
        }
        return result?.code === 0
      } catch { return false }
    },

    async deleteMessage(messageId: string) {
      try {
        await $fetch(`/api/im/messages/${messageId}`, { method: 'DELETE', headers: this._authHeaders() })
        const msg = this.messages.find(m => m.id === messageId)
        if (msg) { msg.isDeleted = true; msg.content = null }
      } catch { /* ignore */ }
    },

    async markAsRead(conversationId: string, messageId: string) {
      try { await $fetch(`/api/im/conversations/${conversationId}/read`, { method: 'PUT', body: { messageId }, headers: this._authHeaders() }) } catch { /* ignore */ }
    },

    startMessagePolling(conversationId: string) {
      this.stopMessagePolling()
      if (import.meta.client) this.messagePollTimer = setInterval(() => this.fetchMessages(conversationId, 1), 3000)
    },
    stopMessagePolling() { if (this.messagePollTimer) { clearInterval(this.messagePollTimer); this.messagePollTimer = null } },

    startPolling() { this.stopPolling(); this.fetchUnreadCount(); this.fetchConversations(); if (import.meta.client) this.pollTimer = setInterval(() => { this.fetchUnreadCount(); this.fetchConversations() }, 10000) },
    stopPolling() { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null } },
    stopAllPolling() { this.stopPolling(); this.stopMessagePolling() },
  },
})