export function useIMDraft() {
  function getKey(conversationId: string) { return `im-draft-${conversationId}` }

  function getDraft(conversationId: string): string {
    if (!import.meta.client) return ''
    return localStorage.getItem(getKey(conversationId)) || ''
  }

  function setDraft(conversationId: string, content: string) {
    if (!import.meta.client) return
    if (content.trim()) localStorage.setItem(getKey(conversationId), content)
    else localStorage.removeItem(getKey(conversationId))
  }

  function clearDraft(conversationId: string) {
    if (!import.meta.client) return
    localStorage.removeItem(getKey(conversationId))
  }

  return { getDraft, setDraft, clearDraft }
}
