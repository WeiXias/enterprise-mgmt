<script setup lang="ts">
import { CHAT_EMOJIS } from '~/utils/constants'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  showTypingLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  fileChange: [file: File]
}>()

const { getDraft, setDraft, clearDraft } = useIMDraft()
const imStore = useIMStore()
const authStore = useAuthStore()

const showEmojiPicker = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const isComposing = ref(false)

// typing
let typingTimer: ReturnType<typeof setTimeout> | null = null
async function sendTyping() {
  if (!imStore.activeConversationId) return
  try {
    const token = authStore.accessToken
    await $fetch(`/api/im/conversations/${imStore.activeConversationId}/typing`, { method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch { /* ignore */ }
}

function onInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  emit('update:modelValue', val)
  sendTyping()
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(sendTyping, 3000)
  if (imStore.activeConversationId) setDraft(imStore.activeConversationId, val)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !isComposing.value) {
    e.preventDefault()
    emit('send')
  }
}

function insertEmoji(emoji: string) {
  emit('update:modelValue', props.modelValue + emoji)
  showEmojiPicker.value = false
}

function triggerFileUpload() { fileInput.value?.click() }
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    uploading.value = true
    emit('fileChange', file)
  }
  (e.target as HTMLInputElement).value = ''
}

// 恢复草稿
watch(() => imStore.activeConversationId, (id) => {
  if (id) emit('update:modelValue', getDraft(id))
})

// 发送后清除草稿
watch(() => props.modelValue, (val) => {
  if (val === '' && imStore.activeConversationId) clearDraft(imStore.activeConversationId)
})
</script>

<template>
  <div class="shrink-0 px-4 py-3 border-t border-line bg-surface-card">
    <div v-if="showEmojiPicker" class="mb-2 p-2 bg-surface-card border border-line rounded-xl shadow-sm">
      <div class="grid grid-cols-10 gap-1">
        <button v-for="e in CHAT_EMOJIS" :key="e" class="w-7 h-7 text-sm hover:bg-surface-hover rounded flex items-center justify-center" @click="insertEmoji(e)">{{ e }}</button>
      </div>
    </div>
    <p v-if="showTypingLabel" class="text-xs text-brand-600 mb-1 italic">{{ showTypingLabel }}</p>
    <form class="flex items-end gap-2" @submit.prevent="emit('send')">
      <button type="button" class="p-2 rounded-md text-content-muted hover:text-brand-600 hover:bg-surface-hover transition-colors" @click="showEmojiPicker = !showEmojiPicker">
        <UIcon name="i-lucide-smile" class="w-5 h-5" />
      </button>
      <button type="button" class="p-2 rounded-md text-content-muted hover:text-brand-600 hover:bg-surface-hover transition-colors" :disabled="uploading" @click="triggerFileUpload">
        <UIcon :name="uploading ? 'i-lucide-loader' : 'i-lucide-paperclip'" class="w-5 h-5" :class="{ 'animate-spin': uploading }" />
      </button>
      <input ref="fileInput" type="file" class="hidden" @change="onFileChange" />
      <textarea
        :value="modelValue"
        rows="1"
        :placeholder="placeholder || '输入消息，回车发送...'"
        :disabled="disabled"
        class="flex-1 resize-none px-3 py-2 text-sm rounded-md border border-line focus-ring"
        @input="onInput"
        @keydown="onKeydown"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
      />
      <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!modelValue.trim() || disabled" :loading="loading" @click="emit('send')" />
    </form>
  </div>
</template>
