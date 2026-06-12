export function useIMPolling() {
  const imStore = useIMStore()
  const isChatPanelOpen = ref(false)

  function handleVisibility() {
    if (!import.meta.client) return
    if (document.hidden) {
      imStore.stopAllPolling()
    } else {
      imStore.startPolling()
      if (isChatPanelOpen.value && imStore.activeConversationId) {
        imStore.startMessagePolling(imStore.activeConversationId)
      }
    }
  }

  function start() {
    imStore.startPolling()
    if (import.meta.client) {
      document.addEventListener('visibilitychange', handleVisibility)
    }
  }

  function openChatPanel(conversationId?: string) {
    isChatPanelOpen.value = true
    if (conversationId) imStore.setActiveConversation(conversationId)
    if (conversationId) imStore.startMessagePolling(conversationId)
  }

  function closeChatPanel() {
    isChatPanelOpen.value = false
    imStore.stopMessagePolling()
  }

  function switchConversation(conversationId: string) {
    imStore.stopMessagePolling()
    imStore.setActiveConversation(conversationId)
    imStore.startMessagePolling(conversationId)
    // 用最新一条消息标记已读
    const lastMsg = imStore.messages[imStore.messages.length - 1]
    if (lastMsg) {
      imStore.markAsRead(conversationId, lastMsg.id)
    }
  }

  onUnmounted(() => {
    imStore.stopAllPolling()
    if (import.meta.client) {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  })

  return { start, openChatPanel, closeChatPanel, switchConversation, isChatPanelOpen }
}
