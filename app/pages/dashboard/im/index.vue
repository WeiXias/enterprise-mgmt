<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '畅聊', middleware: ['auth'] })

const imStore = useIMStore()
const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()
const { start, switchConversation } = useIMPolling()
const { getDraft, setDraft, clearDraft } = useIMDraft()

const messageInput = ref('')
const sending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const shouldAutoScroll = ref(true)
const searchKeyword = ref('')
const loadMoreTrigger = ref<HTMLElement | null>(null)
const showEmojiPicker = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const replyTarget = ref<any>(null)

// 输入状态
const typingUsers = ref<{ userId: string; name: string }[]>([])
let typingTimer: ReturnType<typeof setTimeout> | null = null
let typingPollTimer: ReturnType<typeof setInterval> | null = null

async function sendTyping() {
  if (!imStore.activeConversationId) return
  try {
    const token = authStore.accessToken
    await $fetch(`/api/im/conversations/${imStore.activeConversationId}/typing`, { method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch { /* ignore */ }
}

async function fetchTyping() {
  if (!imStore.activeConversationId) return
  try {
    const token = authStore.accessToken
    const res = await $fetch(`/api/im/conversations/${imStore.activeConversationId}/typing`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }) as any
    if (res?.code === 0) typingUsers.value = res.data || []
  } catch { typingUsers.value = [] }
}

function onInputChange() {
  sendTyping()
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(sendTyping, 3000)
  // 草稿
  if (imStore.activeConversationId) setDraft(imStore.activeConversationId, messageInput.value)
}

function startTypingPoll() { stopTypingPoll(); typingPollTimer = setInterval(fetchTyping, 3000) }
function stopTypingPoll() { if (typingPollTimer) { clearInterval(typingPollTimer); typingPollTimer = null } }

const typingLabel = computed(() => {
  if (!typingUsers.value.length) return ''
  if (typingUsers.value.length <= 2) return typingUsers.value.map(u => u.name).join('、') + ' 正在输入...'
  return typingUsers.value.length + ' 人正在输入...'
})

const showCreateGroup = ref(false)
const showMemberPanel = ref(false)
const showSearchPanel = ref(false)
const showDeleteConvModal = ref(false)
const deleteConvTarget = ref<any>(null)
const deleteConvLoading = ref(false)
const showColleagueList = ref(false)
const showForwardModal = ref(false)
const forwardTarget = ref<any>(null)
const colleagues = ref<any[]>([])
const colleaguesLoading = ref(false)

const activeConv = computed(() => imStore.conversations.find(c => c.id === imStore.activeConversationId))

// 置顶和普通会话
const pinnedConversations = computed(() => imStore.conversations.filter(c => (c as any).isPinned))
const normalConversations = computed(() => imStore.conversations.filter(c => !(c as any).isPinned))

// 右键菜单
const convMenuTarget = ref<any>(null)
const convMenuPos = ref({ x: 0, y: 0 })
function showConvMenu(conv: any, e: MouseEvent) {
  convMenuTarget.value = conv
  convMenuPos.value = { x: e.clientX, y: e.clientY }
  nextTick(() => window.addEventListener('click', closeConvMenu, { once: true }))
}
function closeConvMenu() { convMenuTarget.value = null }

async function togglePin() {
  if (!convMenuTarget.value) return
  try {
    const token = authStore.accessToken
    await $fetch(`/api/im/conversations/${convMenuTarget.value.id}`, {
      method: 'PATCH' as 'GET', body: { isPinned: !(convMenuTarget.value.isPinned) }, headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    imStore.fetchConversations()
  } catch { toast.add({ title: '操作失败', color: 'error' }) }
  convMenuTarget.value = null
}

const searchFilteredConvs = computed(() => {
  if (!searchKeyword.value) return []
  const kw = searchKeyword.value.toLowerCase()
  return imStore.conversations.filter(c => c.type === 'group' ? (c.title || '').toLowerCase().includes(kw) : c.participant?.name?.toLowerCase().includes(kw))
})

// 未读分割线
const unreadAfterId = ref<string | null>(null)
function computeUnreadDivider(messages: any[]) {
  // 在最后一条已读和第一条未读之间
  unreadAfterId.value = null
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].readByCount && messages[i].readByCount > 0) {
      unreadAfterId.value = messages[i].id
      break
    }
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr); const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return diffMin + '分钟前'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDay = Math.floor((today.getTime() - msgDay.getTime()) / 86400000)
  if (diffDay === 0) return d.toTimeString().slice(0, 5)
  if (diffDay === 1) return '昨天'
  if (diffDay < 7) return diffDay + '天前'
  return dateStr.slice(0, 10)
}

function formatMessageTime(dateStr: string): string { return dateStr ? new Date(dateStr).toTimeString().slice(0, 5) : '' }

function parseFileJson(content: string | null) { if (!content) return null; try { return JSON.parse(content) } catch { return null } }

function getLastMsgPreview(lm: any): string {
  if (!lm?.content) return '开始聊天吧'
  const c = lm.content
  if (c.startsWith('{') && c.includes('"fileName"')) { try { return '[文件] ' + JSON.parse(c).fileName } catch { } }
  return c.length > 25 ? c.slice(0, 25) + '...' : c
}

function onMessagesScroll() {
  if (!messagesContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  shouldAutoScroll.value = scrollHeight - scrollTop - clientHeight < 100
}

function scrollToBottom(smooth = false) {
  nextTick(() => {
    requestAnimationFrame(() => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTo({ top: messagesContainer.value.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
        }
      })
    })
  })
}

let loadMoreObserver: IntersectionObserver | null = null
async function setupLoadMore() {
  if (!import.meta.client) return
  loadMoreObserver?.disconnect()
  if (loadMoreTrigger.value) {
    await nextTick()
    loadMoreObserver = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !imStore.messagesLoading && imStore.messagesPage < imStore.messagesTotalPages) {
        imStore.fetchMessages(imStore.activeConversationId!, imStore.messagesPage + 1)
      }
    }, { root: messagesContainer.value, threshold: 0 })
    loadMoreObserver.observe(loadMoreTrigger.value)
  }
}

function selectConversation(conv: any) {
  switchConversation(conv.id)
  // 恢复草稿
  messageInput.value = getDraft(conv.id)
  imStore.fetchMessages(conv.id, 1).then(() => {
    computeUnreadDivider(imStore.messages)
    const msgs = imStore.messages
    if (msgs.length > 0) imStore.markAsRead(conv.id, msgs[msgs.length - 1]!.id)
    scrollToBottom()
  })
  nextTick(setupLoadMore)
  startTypingPoll()
}

function handleGroupCreated(convId: string) { imStore.fetchConversations(); switchConversation(convId); imStore.fetchMessages(convId, 1).then(() => scrollToBottom()); nextTick(setupLoadMore); startTypingPoll() }

async function handleSend() {
  const content = messageInput.value.trim()
  if (!content || !imStore.activeConversationId) return
  sending.value = true
  const replyToId = replyTarget.value?.id
  const ok = await imStore.sendMessage(imStore.activeConversationId, content, replyToId)
  if (ok) {
    messageInput.value = ''; replyTarget.value = null
    clearDraft(imStore.activeConversationId)
    scrollToBottom(true)
  } else { toast.add({ title: '发送失败，再试试', color: 'error' }) }
  sending.value = false
}

async function handleDeleteMessage(msgId: string) {
  await imStore.deleteMessage(msgId)
  imStore.fetchMessages(imStore.activeConversationId!, 1)
  toast.add({ title: '消息已撤回', color: 'info' })
}

function insertEmoji(emoji: string) { messageInput.value += emoji; showEmojiPicker.value = false }

async function handleDeleteConversation() {
  if (!deleteConvTarget.value) return
  deleteConvLoading.value = true
  try {
    const token = authStore.accessToken
    await $fetch(`/api/im/conversations/${deleteConvTarget.value.id}`, { method: 'PATCH' as 'GET', body: { isDeleted: true }, headers: token ? { Authorization: `Bearer ${token}` } : {} })
    toast.add({ title: '会话已删除', color: 'success' })
    showDeleteConvModal.value = false; deleteConvTarget.value = null
    imStore.fetchConversations()
  } catch { toast.add({ title: '删除失败', color: 'error' }) }
  finally { deleteConvLoading.value = false }
}

async function loadColleagues() {
  showColleagueList.value = true; colleaguesLoading.value = true
  try {
    const token = authStore.accessToken
    const res = await $fetch('/api/users', { params: { pageSize: 200 }, headers: token ? { Authorization: `Bearer ${token}` } : {} }) as any
    if (res?.code === 0) colleagues.value = (res.data.items || []).filter((u: any) => u.id !== authStore.user?.id)
  } catch { /* ignore */ } finally { colleaguesLoading.value = false }
}

async function startDirectChat(userId: string) {
  const convId = await imStore.createConversation(userId)
  if (convId) { showColleagueList.value = false; switchConversation(convId); await imStore.fetchMessages(convId, 1); scrollToBottom(); nextTick(setupLoadMore); startTypingPoll() }
}

function triggerFileUpload() { fileInput.value?.click() }
async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement; const file = input.files?.[0]
  if (!file || !imStore.activeConversationId) return
  if (file.size > 20 * 1024 * 1024) { toast.add({ title: '文件不能超过20MB', color: 'warning' }); return }
  uploading.value = true
  try {
    const formData = new FormData(); formData.append('file', file)
    const token = authStore.accessToken
    const res = await $fetch(`/api/im/conversations/${imStore.activeConversationId}/attachments`, { method: 'POST', body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} }) as any
    if (res?.code === 0) { toast.add({ title: '文件已发送', color: 'success' }); imStore.fetchMessages(imStore.activeConversationId, 1, true); scrollToBottom(true) }
    else { toast.add({ title: res?.statusMessage || '上传失败', color: 'error' }) }
  } catch { toast.add({ title: '上传失败', color: 'error' }) }
  finally { uploading.value = false; input.value = '' }
}

function handleSearchSelect(conversationId: string) { showSearchPanel.value = false; switchConversation(conversationId); imStore.fetchMessages(conversationId, 1).then(() => scrollToBottom()); nextTick(setupLoadMore); startTypingPoll() }

// 转发
async function handleForward(msg: any) { forwardTarget.value = msg; showForwardModal.value = true }
async function doForward(targetConvId: string) {
  if (!forwardTarget.value) return
  try {
    const token = authStore.accessToken
    const content = forwardTarget.value.type === 'file'
      ? forwardTarget.value.content
      : (forwardTarget.value.content || '[消息已撤回]')
    const res = await $fetch(`/api/im/conversations/${targetConvId}/messages`, { method: 'POST', body: { content, forwardFrom: forwardTarget.value.id }, headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {} }) as any
    if (res?.code === 0) toast.add({ title: '已转发', color: 'success' })
    else toast.add({ title: '转发失败', color: 'error' })
  } catch { toast.add({ title: '转发失败', color: 'error' }) }
  showForwardModal.value = false; forwardTarget.value = null
}

// 输入法兼容
const isComposing = ref(false)
function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !isComposing.value) { e.preventDefault(); handleSend() }
}

let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null
watch(() => imStore.messages.length, () => { if (shouldAutoScroll.value) { if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer); scrollDebounceTimer = setTimeout(() => scrollToBottom(), 500) } })
watch(() => imStore.activeConversationId, () => { nextTick(setupLoadMore) })

onMounted(() => start())
onUnmounted(() => { imStore.stopAllPolling(); loadMoreObserver?.disconnect(); stopTypingPoll() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">畅聊</h1>
        <p class="text-sm text-content-muted mt-0.5">和同事聊聊天</p>
      </div>
    </div>
    <div class="flex h-[calc(100vh-7rem)] -m-6">
      <!-- ========== 左侧：会话列表 ========== -->
      <div class="w-72 shrink-0 border-r border-line bg-surface-card flex flex-col">
        <div class="p-3 border-b border-line-light space-y-2">
          <div class="relative">
            <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
            <input v-model="searchKeyword" type="text" placeholder="搜索聊天..." class="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-line focus-ring" />
          </div>
          <UButton icon="i-lucide-user-plus" variant="ghost" color="primary" size="xs" block @click="showCreateGroup = true">新建群聊</UButton>
        </div>

        <div class="flex-1 overflow-y-auto">
          <!-- 搜索模式 -->
          <template v-if="searchKeyword.trim()">
            <div v-if="searchFilteredConvs.length === 0" class="text-center py-12 text-xs text-content-muted">没找到相关聊天</div>
            <button v-for="conv in searchFilteredConvs" :key="conv.id" @click="selectConversation(conv); searchKeyword = ''" :class="['w-full text-left px-3 py-2.5 border-b border-line-light hover:bg-brand-50/50 transition-colors flex gap-2.5', conv.id === imStore.activeConversationId ? 'bg-brand-50/70' : '']">
              <div v-if="conv.type === 'group'" class="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0"><UIcon name="i-lucide-users" class="w-4 h-4 text-teal-600" /></div>
              <div v-else class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0"><span class="text-brand-700 text-xs font-medium">{{ conv.participant?.name?.charAt(0) || '?' }}</span></div>
              <div class="flex-1 min-w-0"><div class="flex items-center justify-between"><span class="text-sm text-content-primary truncate">{{ conv.type === 'group' ? conv.title : conv.participant?.name }}</span><span class="text-[10px] text-content-muted flex-shrink-0 ml-1">{{ conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : '' }}</span></div><div class="flex items-center gap-1 mt-0.5"><p class="text-xs text-content-muted truncate flex-1">{{ getLastMsgPreview(conv.lastMessage) }}</p><span v-if="conv.unreadCount > 0" class="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center flex-shrink-0">{{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}</span></div></div>
            </button>
          </template>

          <!-- 正常模式 -->
          <template v-else>
            <div v-if="imStore.conversationsLoading && imStore.conversations.length === 0" class="text-center py-12 text-xs text-content-muted">马上就好...</div>
            <div v-else-if="imStore.conversations.length === 0" class="text-center py-12">
              <UIcon name="i-lucide-message-circle" class="w-8 h-8 text-content-muted mx-auto mb-2" />
              <p class="text-xs text-content-muted">还没有聊天</p>
              <button class="text-xs text-brand-600 hover:text-brand-700 mt-1 inline-block" @click="loadColleagues">找同事聊聊</button>
            </div>
            <template v-else>
              <!-- 置顶 -->
              <template v-if="pinnedConversations.length > 0">
                <div class="px-3 py-1.5 text-[10px] text-content-muted font-medium">置顶</div>
                <button v-for="conv in pinnedConversations" :key="conv.id" @click="selectConversation(conv)" @contextmenu.prevent="showConvMenu(conv, $event)" :class="['w-full text-left px-3 py-2.5 border-b border-line-light hover:bg-brand-50/50 transition-colors flex gap-2.5', conv.id === imStore.activeConversationId ? 'bg-brand-50/70' : '']">
                  <UIcon name="i-lucide-pin" class="w-3 h-3 text-brand-500 flex-shrink-0 mt-0.5" />
                  <div v-if="conv.type === 'group'" class="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0"><UIcon name="i-lucide-users" class="w-4 h-4 text-teal-600" /></div>
                  <div v-else class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0"><span class="text-brand-700 text-xs font-medium">{{ conv.participant?.name?.charAt(0) || '?' }}</span></div>
                  <div class="flex-1 min-w-0"><div class="flex items-center justify-between"><span class="text-sm text-content-primary truncate">{{ conv.type === 'group' ? conv.title : conv.participant?.name }}</span><span class="text-[10px] text-content-muted flex-shrink-0 ml-1">{{ conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : '' }}</span></div><div class="flex items-center gap-1 mt-0.5"><p class="text-xs text-content-muted truncate flex-1">{{ getLastMsgPreview(conv.lastMessage) }}</p><span v-if="conv.unreadCount > 0" class="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center flex-shrink-0">{{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}</span></div></div>
                </button>
                <div class="px-3 py-1.5 text-[10px] text-content-muted font-medium">其他</div>
              </template>
              <button v-for="conv in normalConversations" :key="conv.id" @click="selectConversation(conv)" @contextmenu.prevent="showConvMenu(conv, $event)" :class="['w-full text-left px-3 py-2.5 border-b border-line-light hover:bg-brand-50/50 transition-colors flex gap-2.5', conv.id === imStore.activeConversationId ? 'bg-brand-50/70' : '']">
                <div v-if="conv.type === 'group'" class="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0"><UIcon name="i-lucide-users" class="w-4 h-4 text-teal-600" /></div>
                <div v-else class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0"><span class="text-brand-700 text-xs font-medium">{{ conv.participant?.name?.charAt(0) || '?' }}</span></div>
                <div class="flex-1 min-w-0"><div class="flex items-center justify-between"><span class="text-sm text-content-primary truncate">{{ conv.type === 'group' ? conv.title : conv.participant?.name }}</span><span class="text-[10px] text-content-muted flex-shrink-0 ml-1">{{ conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : '' }}</span></div><div class="flex items-center gap-1 mt-0.5"><p class="text-xs text-content-muted truncate flex-1">{{ getLastMsgPreview(conv.lastMessage) }}</p><span v-if="conv.unreadCount > 0" class="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center flex-shrink-0">{{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}</span></div></div>
              </button>
            </template>
          </template>
        </div>
      </div>

      <!-- 右键菜单 -->
      <Teleport to="body">
        <div v-if="convMenuTarget" :style="{ position: 'fixed', left: convMenuPos.x + 'px', top: convMenuPos.y + 'px', zIndex: 9999 }" class="bg-surface-card border border-line rounded-xl shadow-lg py-1 min-w-[120px]">
          <button class="w-full text-left px-3 py-2 text-sm text-content-secondary hover:bg-brand-50 flex items-center gap-2" @click="togglePin"><UIcon :name="convMenuTarget.isPinned ? 'i-lucide-pin-off' : 'i-lucide-pin'" class="w-4 h-4 text-content-muted" />{{ convMenuTarget.isPinned ? '取消置顶' : '置顶' }}</button>
          <button class="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2" @click="deleteConvTarget = convMenuTarget; showDeleteConvModal = true; convMenuTarget = null"><UIcon name="i-lucide-trash-2" class="w-4 h-4" />删除会话</button>
        </div>
      </Teleport>

      <!-- ========== 右侧：聊天窗口 ========== -->
      <div class="flex-1 flex flex-col bg-surface-page">
        <div v-if="!imStore.activeConversationId" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <UIcon name="i-lucide-messages-square" class="w-12 h-12 text-content-muted mx-auto mb-3" />
            <p class="text-sm text-content-muted">选择同事开始聊天</p>
            <div class="mt-4 flex flex-col items-center gap-2">
              <div class="flex items-center gap-2 text-xs text-content-muted"><span class="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-[10px]">1</span> 点击左侧「未读」或底部的「找同事聊聊」</div>
              <div class="flex items-center gap-2 text-xs text-content-muted"><span class="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-[10px]">2</span> 输入消息，回车发送</div>
              <div class="flex items-center gap-2 text-xs text-content-muted"><span class="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-[10px]">3</span> 想多拉几个人就点「新建群聊」</div>
            </div>
          </div>
        </div>

        <template v-else>
          <!-- 顶栏 -->
          <div class="h-14 shrink-0 flex items-center justify-between px-4 border-b border-line bg-surface-card">
            <div class="flex items-center gap-2.5">
              <div v-if="activeConv?.type === 'group'" class="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center"><UIcon name="i-lucide-users" class="w-4 h-4 text-teal-600" /></div>
              <div v-else class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center"><span class="text-brand-700 text-xs font-medium">{{ activeConv?.participant?.name?.charAt(0) || '?' }}</span></div>
              <div><span class="text-sm font-medium text-content-primary">{{ activeConv?.type === 'group' ? activeConv.title : activeConv?.participant?.name }}</span><span v-if="activeConv?.type === 'group'" class="text-xs text-content-muted ml-2 cursor-pointer hover:text-brand-600" @click="showMemberPanel = true">{{ activeConv?.memberCount || 0 }}人</span></div>
            </div>
            <div class="flex items-center gap-2">
              <button class="p-1.5 rounded-md text-content-muted hover:text-brand-600 hover:bg-surface-hover" title="搜索消息" @click="showSearchPanel = true"><UIcon name="i-lucide-search" class="w-4 h-4" /></button>
              <button class="p-1.5 rounded-md text-content-muted hover:text-red-500 hover:bg-red-50" title="删除会话" @click="deleteConvTarget = activeConv; showDeleteConvModal = true"><UIcon name="i-lucide-trash-2" class="w-4 h-4" /></button>
            </div>
          </div>

          <!-- 消息列表 -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative" @scroll="onMessagesScroll">
            <div ref="loadMoreTrigger" class="text-center py-1">
              <span v-if="imStore.messagesLoading" class="text-xs text-content-muted">加载中...</span>
              <span v-else-if="imStore.messagesPage < imStore.messagesTotalPages" class="text-xs text-content-muted">上滑加载更多</span>
            </div>
            <div v-if="!imStore.messagesLoading && imStore.messages.length === 0" class="text-center py-12"><p class="text-xs text-content-muted">打个招呼吧</p></div>

            <template v-for="msg in imStore.messages" :key="msg.id">
              <!-- 未读分割线 -->
              <UnreadDivider v-if="unreadAfterId === msg.id && !msg.isDeleted" lastReadLabel="以下为新消息" />
              <div :class="['flex group', msg.sender?.id === authStore.user?.id ? 'justify-end' : 'justify-start']">
                <div v-if="msg.sender?.id !== authStore.user?.id" class="mr-2 flex-shrink-0"><div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center"><span class="text-brand-700 text-[10px] font-medium">{{ msg.sender?.name?.charAt(0) || '?' }}</span></div></div>
                <div :class="['max-w-[70%] px-3 py-2 rounded-xl text-sm', msg.sender?.id === authStore.user?.id ? 'bg-brand-100 text-content-primary rounded-br-md' : 'bg-surface-card border border-line text-content-primary rounded-bl-md', msg.isDeleted ? 'italic text-content-muted' : '']">
                  <!-- 引用回复 -->
                  <div v-if="msg.replyTo && !msg.isDeleted" class="mb-1.5 pl-2 border-l-2 border-brand-300 text-xs text-content-muted bg-brand-50/50 rounded py-0.5"><span class="text-brand-600">{{ msg.replyTo.sender?.name || '已注销' }}</span><span v-if="msg.replyTo.content" class="line-clamp-1">{{ msg.replyTo.content.slice(0, 50) }}</span><span v-else class="italic">消息已撤回</span></div>
                  <template v-if="msg.type === 'file' && !msg.isDeleted"><FileMessage :file-name="parseFileJson(msg.content)?.fileName || '文件'" :file-size="parseFileJson(msg.content)?.fileSize || 0" :file-type="parseFileJson(msg.content)?.fileType || 'application/octet-stream'" :attachment-id="parseFileJson(msg.content)?.attachmentId || ''" /></template>
                  <p v-else-if="msg.isDeleted" class="text-content-muted text-xs">消息已撤回</p>
                  <p v-else class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
                  <div class="flex items-center justify-end gap-1 mt-1">
                    <span v-if="msg.readByCount && msg.readByCount > 0" class="text-[10px] text-brand-600 ml-1">{{ msg.readByNames?.join('、') || msg.readByCount + '人' }} 已读</span>
                    <span class="text-[10px] text-content-muted">{{ formatMessageTime(msg.createdAt) }}</span>
                    <button class="text-xs text-brand-600 font-medium hover:bg-brand-50 px-2 py-0.5 rounded transition-colors" title="引用回复" @click="replyTarget = msg">引用</button>
                    <button class="text-xs text-brand-600 font-medium hover:bg-brand-50 px-2 py-0.5 rounded transition-colors" title="转发" @click="handleForward(msg)">转发</button>
                    <button v-if="!msg.isDeleted && msg.sender?.id === authStore.user?.id" class="text-xs text-brand-600 font-medium hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors" title="撤回" @click="handleDeleteMessage(msg.id)">撤回</button>
                  </div>
                </div>
                <div v-if="msg.sender?.id === authStore.user?.id" class="ml-2 flex-shrink-0"><div class="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center"><span class="text-teal-700 text-[10px] font-medium">{{ authStore.user?.name?.charAt(0) || '?' }}</span></div></div>
              </div>
            </template>

            <button v-if="!shouldAutoScroll" class="sticky bottom-2 float-right w-8 h-8 rounded-full bg-surface-card border border-line shadow flex items-center justify-center hover:bg-surface-hover" @click="scrollToBottom(true)"><UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-content-muted" /></button>
          </div>

          <!-- 输入框 -->
          <div class="shrink-0 px-4 py-3 border-t border-line bg-surface-card">
            <div v-if="showEmojiPicker" class="mb-2 p-2 bg-surface-card border border-line rounded-xl shadow-sm"><div class="grid grid-cols-10 gap-1"><button v-for="e in CHAT_EMOJIS" :key="e" class="w-7 h-7 text-sm hover:bg-surface-hover rounded flex items-center justify-center" @click="insertEmoji(e)">{{ e }}</button></div></div>
            <p v-if="typingLabel" class="text-xs text-brand-600 mb-1 italic">{{ typingLabel }}</p>
            <form class="flex items-end gap-2" @submit.prevent="handleSend">
              <button type="button" class="p-2 rounded-md text-content-muted hover:text-brand-600 hover:bg-surface-hover transition-colors" @click="showEmojiPicker = !showEmojiPicker"><UIcon name="i-lucide-smile" class="w-5 h-5" /></button>
              <button type="button" class="p-2 rounded-md text-content-muted hover:text-brand-600 hover:bg-surface-hover transition-colors" :disabled="uploading" @click="triggerFileUpload"><UIcon :name="uploading ? 'i-lucide-loader' : 'i-lucide-paperclip'" class="w-5 h-5" :class="{ 'animate-spin': uploading }" /></button>
              <input ref="fileInput" type="file" class="hidden" @change="handleFileChange" />
              <textarea v-model="messageInput" rows="1" :placeholder="replyTarget ? '回复 ' + (replyTarget.sender?.name || '') + '...' : '输入消息，回车发送...'" class="flex-1 resize-none px-3 py-2 text-sm rounded-md border border-line focus-ring" @keydown="onInputKeydown" @input="onInputChange" @compositionstart="isComposing = true" @compositionend="isComposing = false" />
              <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!messageInput.trim()" :loading="sending" @click="handleSend" />
            </form>
          </div>
        </template>
      </div>
    </div>

    <!-- 各类弹窗 -->
    <CreateGroupModal v-if="showCreateGroup" :model-value="showCreateGroup" @close="showCreateGroup = false" @created="handleGroupCreated" />
    <GroupMemberPanel v-if="showMemberPanel && imStore.activeConversationId" :conversation-id="imStore.activeConversationId" @close="showMemberPanel = false" />
    <FormModal v-if="showSearchPanel" v-model:open="showSearchPanel" title="搜索消息" size="compact" @cancel="showSearchPanel = false"><template #footer><UButton variant="ghost" color="neutral" @click="showSearchPanel = false">关闭</UButton></template><MessageSearchPanel @close="showSearchPanel = false" @select="handleSearchSelect" /></FormModal>
    <ConfirmDialog v-if="showDeleteConvModal" v-model:open="showDeleteConvModal" title="删除会话" :message="deleteConvTarget?.type === 'group' ? `确定要删除群聊「${deleteConvTarget?.title}」吗？聊天记录还在，但你会看不到它。` : `确定要删除与${deleteConvTarget?.participant?.name || ''}的对话吗？聊天记录还在，但你会看不到它。`" danger :loading="deleteConvLoading" @confirm="handleDeleteConversation" @cancel="showDeleteConvModal = false" />
    <FormModal v-if="showColleagueList" v-model:open="showColleagueList" title="选择同事" size="compact" @cancel="showColleagueList = false"><template #footer><UButton variant="ghost" color="neutral" @click="showColleagueList = false">关闭</UButton></template><div v-if="colleaguesLoading" class="text-center py-8 text-xs text-content-muted">加载中...</div><div v-else-if="colleagues.length === 0" class="text-center py-8 text-xs text-content-muted">暂无其他同事</div><div v-else class="max-h-64 overflow-y-auto space-y-1"><button v-for="u in colleagues" :key="u.id" class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-brand-50 transition-colors" @click="startDirectChat(u.id)"><div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0"><span class="text-brand-700 text-xs font-medium">{{ u.name?.charAt(0) || '?' }}</span></div><span class="text-sm text-content-primary">{{ u.name }}</span></button></div></FormModal>
    <ForwardModal v-if="showForwardModal" @close="showForwardModal = false; forwardTarget = null" @select="doForward" />
  </div>
</template>
