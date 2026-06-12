<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '畅聊', middleware: ['auth'] })

const imStore = useIMStore()
const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()

const { start, switchConversation } = useIMPolling()
const messageInput = ref('')
const sending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const shouldAutoScroll = ref(true)
const searchKeyword = ref('')
const loadMoreTrigger = ref<HTMLElement | null>(null)

const showCreateGroup = ref(false)
const showMemberPanel = ref(false)
const showSearchPanel = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

// 表情选择器
const showEmojiPicker = ref(false)
const emojis = ['😀','😂','🤣','😊','😍','🥰','😘','😎','🤩','👍','👏','🙌','❤️','🔥','🎉','💯','✅','❌','🤝','💪','🙏','🤔','😅','😢','😡','👋','🚀','⭐','💰','📌']

// 对话删除
const showDeleteConvModal = ref(false)
const deleteConvTarget = ref<any>(null)
const deleteConvLoading = ref(false)

// 消息引用回复
const replyTarget = ref<any>(null)

const activeConv = computed(() => imStore.conversations.find(c => c.id === imStore.activeConversationId))

// 筛选后的会话列表
const filteredConversations = computed(() => {
  if (!searchKeyword.value) return imStore.conversations
  const kw = searchKeyword.value.toLowerCase()
  return imStore.conversations.filter(c => {
    if (c.type === 'group') return (c.title || '').toLowerCase().includes(kw)
    return c.participant?.name?.toLowerCase().includes(kw)
  })
})

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
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

function formatMessageTime(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toTimeString().slice(0, 5)
}

function parseFileJson(content: string | null) {
  if (!content) return null
  try { return JSON.parse(content) } catch { return null }
}

function getLastMsgPreview(lm: any): string {
  if (!lm?.content) return '开始聊天吧'
  const c = lm.content
  if (c.startsWith('{') && c.includes('"fileName"')) {
    try { return '[文件] ' + JSON.parse(c).fileName } catch { }
  }
  return c.length > 25 ? c.slice(0, 25) + '...' : c
}

function onMessagesScroll() {
  if (!messagesContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  shouldAutoScroll.value = scrollHeight - scrollTop - clientHeight < 100
}

function scrollToBottom(smooth = false) {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  })
}

let loadMoreObserver: IntersectionObserver | null = null
function setupLoadMore() {
  if (!import.meta.client) return
  loadMoreObserver?.disconnect()
  if (loadMoreTrigger.value) {
    loadMoreObserver = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !imStore.messagesLoading && imStore.messagesPage < imStore.messagesTotalPages) {
        imStore.fetchMessages(imStore.activeConversationId!, imStore.messagesPage + 1)
      }
    })
    loadMoreObserver.observe(loadMoreTrigger.value)
  }
}

function selectConversation(conv: any) {
  switchConversation(conv.id)
  scrollToBottom()
  nextTick(setupLoadMore)
}

function handleGroupCreated(convId: string) {
  imStore.fetchConversations()
  switchConversation(convId)
}

async function handleSend() {
  const content = messageInput.value.trim()
  if (!content || !imStore.activeConversationId) return
  sending.value = true
  const replyToId = replyTarget.value?.id
  const ok = await imStore.sendMessage(imStore.activeConversationId, content, replyToId)
  if (ok) {
    messageInput.value = ''
    replyTarget.value = null
    imStore.fetchMessages(imStore.activeConversationId, 1)
    scrollToBottom(true)
  } else {
    toast.add({ title: '发送失败，再试试', color: 'error' })
  }
  sending.value = false
}

async function handleDeleteMessage(msgId: string) {
  await imStore.deleteMessage(msgId)
  imStore.fetchMessages(imStore.activeConversationId!, 1)
  toast.add({ title: '消息已撤回', color: 'info' })
}

function insertEmoji(emoji: string) {
  messageInput.value += emoji
  showEmojiPicker.value = false
}

async function handleDeleteConversation() {
  if (!deleteConvTarget.value) return
  deleteConvLoading.value = true
  try {
    const token = authStore.accessToken
    await $fetch(`/api/im/conversations/${deleteConvTarget.value.id}`, {
      method: 'PATCH' as 'GET', body: { isDeleted: true }, headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    toast.add({ title: '会话已删除', color: 'success' })
    showDeleteConvModal.value = false; deleteConvTarget.value = null
    imStore.fetchConversations()
  } catch { toast.add({ title: '删除失败', color: 'error' }) }
  finally { deleteConvLoading.value = false }
}

// 文件上传
function triggerFileUpload() { fileInput.value?.click() }
async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !imStore.activeConversationId) return
  if (file.size > 20 * 1024 * 1024) { toast.add({ title: '文件不能超过20MB', color: 'warning' }); return }
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const token = authStore.accessToken
    const res = await $fetch(`/api/im/conversations/${imStore.activeConversationId}/attachments`, {
      method: 'POST', body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {},
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '文件已发送', color: 'success' })
      imStore.fetchMessages(imStore.activeConversationId, 1, true)
      scrollToBottom(true)
    } else {
      toast.add({ title: res?.statusMessage || '上传失败', color: 'error' })
    }
  } catch { toast.add({ title: '上传失败', color: 'error' }) }
  finally { uploading.value = false; input.value = '' }
}

// 搜索跳转
function handleSearchSelect(conversationId: string) {
  showSearchPanel.value = false
  switchConversation(conversationId)
}

watch(() => imStore.messages.length, () => { if (shouldAutoScroll.value) scrollToBottom() })
watch(() => imStore.activeConversationId, () => { nextTick(setupLoadMore) })

onMounted(() => start())
onUnmounted(() => { imStore.stopAllPolling(); loadMoreObserver?.disconnect() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">畅聊</h1>
        <p class="text-sm text-stone-400 mt-0.5">和同事聊聊天</p>
      </div>
    </div>
    <div class="flex h-[calc(100vh-7rem)] -m-6">
    <!-- ========== 左侧：会话列表 ========== -->
    <div class="w-72 shrink-0 border-r border-stone-200 bg-white flex flex-col">
      <div class="p-3 border-b border-stone-100 space-y-2">
        <div class="relative">
          <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input v-model="searchKeyword" type="text" placeholder="搜索聊天..." class="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
        </div>
        <UButton icon="i-lucide-user-plus" variant="ghost" color="primary" size="xs" block @click="showCreateGroup = true">新建群聊</UButton>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="imStore.conversationsLoading && imStore.conversations.length === 0" class="text-center py-12 text-xs text-stone-400">马上就好...</div>
        <div v-else-if="filteredConversations.length === 0" class="text-center py-12">
          <UIcon name="i-lucide-message-circle" class="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p class="text-xs text-stone-400">还没有聊天</p>
          <NuxtLink to="/dashboard/users" class="text-xs text-amber-600 hover:text-amber-700 mt-1 inline-block">去找同事聊聊</NuxtLink>
        </div>
        <button
          v-for="conv in filteredConversations" :key="conv.id"
          @click="selectConversation(conv)"
          :class="['w-full text-left px-3 py-2.5 border-b border-stone-50 hover:bg-amber-50/50 transition-colors flex gap-2.5', conv.id === imStore.activeConversationId ? 'bg-amber-50/70' : '']"
        >
          <!-- 群聊图标 / 私聊头像 -->
          <div v-if="conv.type === 'group'" class="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-lucide-users" class="w-4 h-4 text-teal-600" />
          </div>
          <div v-else class="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <span class="text-amber-700 text-xs font-medium">{{ conv.participant?.name?.charAt(0) || '?' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm text-stone-800 truncate">{{ conv.type === 'group' ? conv.title : conv.participant?.name }}</span>
              <span class="text-[10px] text-stone-400 flex-shrink-0 ml-1">{{ conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : '' }}</span>
            </div>
            <div class="flex items-center gap-1 mt-0.5">
              <p class="text-xs text-stone-400 truncate flex-1">
                {{ getLastMsgPreview(conv.lastMessage) }}
              </p>
              <span v-if="conv.unreadCount > 0" class="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center flex-shrink-0">
                {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- ========== 右侧：聊天窗口 ========== -->
    <div class="flex-1 flex flex-col bg-[var(--color-bg-warm)]">
      <!-- 无选中 -->
      <div v-if="!imStore.activeConversationId" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <UIcon name="i-lucide-messages-square" class="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p class="text-sm text-stone-400">选择一个对话开始聊天</p>
        </div>
      </div>

      <template v-else>
        <!-- 顶栏 -->
        <div class="h-14 shrink-0 flex items-center justify-between px-4 border-b border-stone-200 bg-white">
          <div class="flex items-center gap-2.5">
            <div v-if="activeConv?.type === 'group'" class="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <UIcon name="i-lucide-users" class="w-4 h-4 text-teal-600" />
            </div>
            <div v-else class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span class="text-amber-700 text-xs font-medium">{{ activeConv?.participant?.name?.charAt(0) || '?' }}</span>
            </div>
            <div>
              <span class="text-sm font-medium text-stone-800">{{ activeConv?.type === 'group' ? activeConv.title : activeConv?.participant?.name }}</span>
              <span v-if="activeConv?.type === 'group'" class="text-xs text-stone-400 ml-2 cursor-pointer hover:text-amber-600" @click="showMemberPanel = true">{{ activeConv?.memberCount || 0 }}人</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-stone-100" title="搜索消息" @click="showSearchPanel = true">
              <UIcon name="i-lucide-search" class="w-4 h-4" />
            </button>
            <button class="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50" title="删除会话" @click="deleteConvTarget = activeConv; showDeleteConvModal = true">
              <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative" @scroll="onMessagesScroll">
          <div ref="loadMoreTrigger" class="text-center py-1">
            <span v-if="imStore.messagesLoading" class="text-xs text-stone-400">加载中...</span>
            <span v-else-if="imStore.messagesPage < imStore.messagesTotalPages" class="text-xs text-stone-400">上滑加载更多</span>
          </div>
          <div v-if="!imStore.messagesLoading && imStore.messages.length === 0" class="text-center py-12">
            <p class="text-xs text-stone-400">打个招呼吧</p>
          </div>

          <div v-for="msg in imStore.messages" :key="msg.id" :class="['flex group', msg.sender.id === authStore.user?.id ? 'justify-end' : 'justify-start']">
            <div v-if="msg.sender.id !== authStore.user?.id" class="mr-2 flex-shrink-0">
              <div class="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                <span class="text-amber-700 text-[10px] font-medium">{{ msg.sender.name?.charAt(0) || '?' }}</span>
              </div>
            </div>

            <div :class="['max-w-[70%] px-3 py-2 rounded-xl text-sm', msg.sender.id === authStore.user?.id ? 'bg-amber-100 text-stone-800 rounded-br-md' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-md', msg.isDeleted ? 'italic text-stone-400' : '']">
              <!-- 引用回复 -->
              <div v-if="msg.replyTo && !msg.isDeleted" class="mb-1.5 pl-2 border-l-2 border-amber-300 text-xs text-stone-500 bg-amber-50/50 rounded py-0.5">
                <span class="text-amber-600">{{ msg.replyTo.sender?.name || '已注销' }}</span>
                <span v-if="msg.replyTo.content" class="line-clamp-1">{{ msg.replyTo.content.slice(0, 50) }}</span>
                <span v-else class="italic">消息已撤回</span>
              </div>
              <!-- 文件消息 -->
              <template v-if="msg.type === 'file' && !msg.isDeleted">
                <FileMessage
                  :file-name="parseFileJson(msg.content)?.fileName || '文件'"
                  :file-size="parseFileJson(msg.content)?.fileSize || 0"
                  :file-type="parseFileJson(msg.content)?.fileType || 'application/octet-stream'"
                  :attachment-id="parseFileJson(msg.content)?.attachmentId || ''"
                />
              </template>
              <!-- 已撤回消息 -->
              <p v-else-if="msg.isDeleted" class="text-stone-400 text-xs">消息已撤回</p>
              <!-- 文本消息 -->
              <p v-else class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
              <div class="flex items-center justify-end gap-1 mt-1">
                <span class="text-[10px] text-stone-400">{{ formatMessageTime(msg.createdAt) }}</span>
                <button
                  class="text-xs text-amber-600 font-medium hover:bg-amber-50 px-2 py-0.5 rounded transition-colors"
                  title="引用回复" @click="replyTarget = msg"
                >引用</button>
                <button v-if="!msg.isDeleted && msg.sender.id === authStore.user?.id"
                  class="text-xs text-amber-600 font-medium hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
                  title="撤回消息" @click="handleDeleteMessage(msg.id)">撤回</button>
              </div>
            </div>

            <div v-if="msg.sender.id === authStore.user?.id" class="ml-2 flex-shrink-0">
              <div class="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
                <span class="text-teal-700 text-[10px] font-medium">{{ authStore.user?.name?.charAt(0) || '?' }}</span>
              </div>
            </div>
          </div>

          <button v-if="!shouldAutoScroll"
            class="sticky bottom-2 float-right w-8 h-8 rounded-full bg-white border border-stone-200 shadow flex items-center justify-center hover:bg-stone-50"
            @click="scrollToBottom(true)">
            <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-stone-500" />
          </button>
        </div>

        <!-- 输入框 -->
        <div class="shrink-0 px-4 py-3 border-t border-stone-200 bg-white">
          <!-- 表情面板 -->
          <div v-if="showEmojiPicker" class="mb-2 p-2 bg-white border border-stone-200 rounded-lg shadow-sm">
            <div class="grid grid-cols-10 gap-1">
              <button v-for="e in emojis" :key="e" class="w-7 h-7 text-sm hover:bg-stone-100 rounded flex items-center justify-center" @click="insertEmoji(e)">{{ e }}</button>
            </div>
          </div>
          <form class="flex items-end gap-2" @submit.prevent="handleSend">
            <button type="button" class="p-2 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-stone-100 transition-colors" @click="showEmojiPicker = !showEmojiPicker">
              <UIcon name="i-lucide-smile" class="w-5 h-5" />
            </button>
            <button type="button" class="p-2 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-stone-100 transition-colors" :disabled="uploading" @click="triggerFileUpload">
              <UIcon :name="uploading ? 'i-lucide-loader' : 'i-lucide-paperclip'" class="w-5 h-5" :class="{ 'animate-spin': uploading }" />
            </button>
            <input ref="fileInput" type="file" class="hidden" @change="handleFileChange" />
            <textarea v-model="messageInput" rows="1" :placeholder="replyTarget ? '回复 ' + (replyTarget.sender.name || '') + '...' : '输入消息，回车发送...'" class="flex-1 resize-none px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" @keydown.enter.exact.prevent="handleSend" />
            <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!messageInput.trim()" :loading="sending" @click="handleSend" />
          </form>
        </div>
      </template>
    </div>

    <!-- 新建群聊弹窗 -->
    <CreateGroupModal v-if="showCreateGroup" :model-value="showCreateGroup" @close="showCreateGroup = false" @created="handleGroupCreated" />

    <!-- 成员面板 -->
    <GroupMemberPanel v-if="showMemberPanel && imStore.activeConversationId" :conversation-id="imStore.activeConversationId" @close="showMemberPanel = false" />

    <!-- 搜索面板 -->
    <div v-if="showSearchPanel" class="fixed inset-0 z-50 bg-[var(--color-bg-warm)] flex flex-col">
      <MessageSearchPanel @close="showSearchPanel = false" @select="handleSearchSelect" />
    </div>

    <!-- 删除会话确认 -->
    <UModal v-model:open="showDeleteConvModal">
      <template #header>删除会话</template>
      <template #body>
        <p class="text-sm text-stone-600">确定要删除{{ deleteConvTarget?.type === 'group' ? '群聊「' + deleteConvTarget?.title + '」' : '与' + (deleteConvTarget?.participant?.name || '') + '的对话' }}吗？聊天记录还在，但你会看不到它。</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showDeleteConvModal = false">取消</UButton><UButton color="error" :loading="deleteConvLoading" @click="handleDeleteConversation">确认删除</UButton></div>
      </template>
    </UModal>
  </div>
  </div>
</template>
