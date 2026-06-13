export function useIMPolling() {
  const imStore = useIMStore()
  const isChatPanelOpen = ref(false)
  const authStore = useAuthStore()

  // SSE 连接
  let eventSource: EventSource | null = null
  let sseErrorTimer: ReturnType<typeof setTimeout> | null = null

  function connectSSE(conversationId?: string) {
    if (!import.meta.client) return
    disconnectSSE()
    const url = new URL('/api/im/events', window.location.origin)
    // EventSource 不支持自定义 header，token 通过 URL 参数传递
    const token = useAuthStore().accessToken
    if (token) url.searchParams.set('token', token)
    if (conversationId) url.searchParams.set('conversationId', conversationId)
    eventSource = new EventSource(url.toString())

    eventSource.addEventListener('message_update', (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data?.conversationId) {
          imStore.fetchConversations()
          if (data.conversationId === imStore.activeConversationId) {
            imStore.fetchMessages(data.conversationId, 1)
          }
        }
      } catch { /* ignore */ }
    })

    eventSource.addEventListener('connected', () => {
      // SSE 接管，停掉所有轮询
      imStore.stopAllPolling()
      if (sseErrorTimer) { clearTimeout(sseErrorTimer); sseErrorTimer = null }
    })

    eventSource.onerror = () => {
      disconnectSSE()
      // 防抖 3s 后才回退轮询
      if (!sseErrorTimer) {
        sseErrorTimer = setTimeout(() => {
          sseErrorTimer = null
          imStore.startPolling()
          if (isChatPanelOpen.value && imStore.activeConversationId) {
            imStore.startMessagePolling(imStore.activeConversationId)
          }
        }, 3000)
      }
    }
  }

  function disconnectSSE() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    if (sseErrorTimer) {
      clearTimeout(sseErrorTimer)
      sseErrorTimer = null
    }
  }

  function startPolling() {
    imStore.startPolling()
  }

  function handleVisibility() {
    if (!import.meta.client) return
    if (document.hidden) {
      imStore.stopAllPolling()
      disconnectSSE()
    } else {
      imStore.startPolling()
      if (isChatPanelOpen.value && imStore.activeConversationId) {
        // 回到页面时先拉一次新消息
        imStore.fetchMessages(imStore.activeConversationId, 1)
      }
    }
  }

  function start() {
    connectSSE()
    imStore.fetchUnreadCount()
    imStore.fetchConversations()
    if (import.meta.client) {
      document.addEventListener('visibilitychange', handleVisibility)
    }
  }

  function openChatPanel(conversationId?: string) {
    isChatPanelOpen.value = true
    if (conversationId) imStore.setActiveConversation(conversationId)
    if (conversationId) connectSSE(conversationId)
  }

  function closeChatPanel() {
    isChatPanelOpen.value = false
    imStore.stopMessagePolling()
    disconnectSSE()
    connectSSE() // 恢复全局 SSE
  }

  function switchConversation(conversationId: string) {
    imStore.stopMessagePolling()
    // 切会话时清空旧消息，避免短暂显示上一个会话的内容
    imStore.messages = []
    imStore.setActiveConversation(conversationId)
    connectSSE(conversationId)
    // 用最新一条消息标记已读（得等消息加载完才做）
  }

  onUnmounted(() => {
    imStore.stopAllPolling()
    disconnectSSE()
    if (import.meta.client) {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  })

  return { start, openChatPanel, closeChatPanel, switchConversation, isChatPanelOpen }
}
