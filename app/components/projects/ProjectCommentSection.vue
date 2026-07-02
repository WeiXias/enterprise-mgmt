<script setup lang="ts">
const props = defineProps<{
  projectId: string
  members: any[]
}>()

const emit = defineEmits<{ refreshed: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()

const comments = ref<any[]>([])
const commentLoading = ref(false)
const newComment = ref('')
const showMentionList = ref(false)
const mentionFilter = ref('')
const mentionIndex = ref(0)

const mentionableMembers = computed(() => {
  const m = props.members || []
  if (!mentionFilter.value) return m.slice(0, 5)
  return m.filter((m: any) => m.name.includes(mentionFilter.value))
})

function onCommentInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  newComment.value = val
  const pos = (e.target as HTMLInputElement).selectionStart || 0
  const textBefore = val.slice(0, pos)
  const atIdx = textBefore.lastIndexOf('@')
  if (atIdx >= 0 && (atIdx === 0 || textBefore[atIdx - 1] === ' ' || textBefore[atIdx - 1] === '\n')) {
    const filter = textBefore.slice(atIdx + 1)
    if (!filter.includes(' ')) {
      mentionFilter.value = filter
      showMentionList.value = true
      mentionIndex.value = 0
      return
    }
  }
  showMentionList.value = false
}

function insertMention(member: any) {
  const pos = (document.activeElement as HTMLInputElement)?.selectionStart || newComment.value.length
  const textBefore = newComment.value.slice(0, pos)
  const atIdx = textBefore.lastIndexOf('@')
  const before = newComment.value.slice(0, atIdx)
  const after = newComment.value.slice(pos)
  newComment.value = before + '@' + member.name + ' ' + after
  showMentionList.value = false
}

function onMentionKeydown(e: KeyboardEvent) {
  if (!showMentionList.value) return
  if (e.key === 'ArrowDown') { e.preventDefault(); mentionIndex.value = Math.min(mentionIndex.value + 1, mentionableMembers.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mentionIndex.value = Math.max(mentionIndex.value - 1, 0) }
  else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    if (mentionableMembers.value[mentionIndex.value]) insertMention(mentionableMembers.value[mentionIndex.value])
  }
}

async function fetchComments() {
  commentLoading.value = true
  try {
    const res = await $api(`/api/projects/${props.projectId}/comments`) as any
    if (res?.code === 0) comments.value = res.data.items || res.data
  } catch { /* ignore */ }
  finally { commentLoading.value = false }
}

async function handlePostComment() {
  if (!newComment.value.trim()) return
  try {
    const res = await $api(`/api/projects/${props.projectId}/comments`, { method: 'POST', body: { content: newComment.value } }) as any
    if (res?.code === 0) {
      toast.add({ title: '评论已发表', color: 'success' })
      newComment.value = ''
      fetchComments()
    }
  } catch (err: any) { toast.add({ title: '发表失败', color: 'error' }) }
}

async function handleDeleteComment(commentId: string) {
  try {
    const res = await $api(`/api/comments/${commentId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); fetchComments() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

onMounted(() => { fetchComments() })

defineExpose({ fetchComments })
</script>

<template>
  <div class="mt-4">
    <div class="em-card">
      <h3 class="text-sm font-medium text-content-secondary mb-3">讨论</h3>
      <div v-if="commentLoading" class="text-center py-4 text-content-muted text-xs">加载中...</div>
      <div v-else-if="comments.length === 0" class="text-center py-6 text-content-muted text-xs">暂无讨论，来说点什么吧</div>
      <div v-else class="space-y-3 mb-4">
        <div v-for="c in comments" :key="c.id" class="p-3 rounded-md bg-surface-hover group">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center"><span class="text-brand-700 text-xs">{{ (c.userName || '?').charAt(0) }}</span></div>
            <span class="text-sm text-content-secondary">{{ c.userName }}</span>
            <span class="text-xs text-content-muted">{{ c.createdAt?.slice(0, 10) }}</span>
            <div class="flex-1" />
            <UButton icon="i-lucide-trash-2" variant="ghost" color="neutral" size="xs" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="handleDeleteComment(c.id)" />
          </div>
          <p class="text-sm text-content-secondary ml-8">{{ c.content }}</p>
        </div>
      </div>
      <div class="flex gap-2 pt-3 border-t border-line-light relative">
        <div class="flex-1 relative">
          <input v-model="newComment" type="text" placeholder="输入评论...（输入 @ 选择成员）" class="w-full input-base focus-ring" @keyup.enter="handlePostComment" @input="onCommentInput" @keydown="onMentionKeydown" />
          <div v-if="showMentionList && mentionableMembers.length" class="absolute bottom-full left-0 mb-1 w-56 bg-surface-card rounded-xl border border-line shadow-lg overflow-hidden z-10">
            <div
              v-for="(m, i) in mentionableMembers" :key="m.userId"
              :class="['flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-brand-50 transition-colors', i === mentionIndex ? 'bg-brand-50' : '']"
              @mousedown.prevent="insertMention(m)"
            >
              <div class="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                <span class="text-brand-700 text-xs">{{ m.name?.charAt(0) || '?' }}</span>
              </div>
              <span class="text-content-secondary">{{ m.name }}</span>
            </div>
          </div>
        </div>
        <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!newComment.trim()" @click="handlePostComment" />
      </div>
    </div>
  </div>
</template>
