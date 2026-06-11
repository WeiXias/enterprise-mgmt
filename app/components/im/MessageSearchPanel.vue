<script setup lang="ts">
const emit = defineEmits<{ close: []; select: [conversationId: string] }>()

const { $api } = useNuxtApp()
const keyword = ref('')
const loading = ref(false)
const results = ref<any[]>([])
const total = ref(0)
const page = ref(1)

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) { results.value = []; return }
  loading.value = true
  try {
    const res = await $fetch('/api/im/messages/search', {
      params: { keyword: kw, page: page.value, pageSize: 20 },
      headers: useAuthHeaders(),
    }) as any
    if (res?.code === 0) {
      if (page.value === 1) results.value = res.data.items || []
      else results.value = [...results.value, ...(res.data.items || [])]
      total.value = res.data.total
    }
  } catch { /* ignore */ } finally { loading.value = false }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  page.value = 1
  searchTimer = setTimeout(doSearch, 300)
}

function handleSelect(conversationId: string) {
  emit('select', conversationId)
}

function loadMore() {
  page.value++
  doSearch()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-stone-100">
      <div class="relative flex-1">
        <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input v-model="keyword" type="text" placeholder="搜索聊天记录..." class="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" @input="onSearchInput" />
      </div>
      <button class="text-xs text-stone-400 hover:text-stone-600" @click="emit('close')">取消</button>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div v-if="loading && results.length === 0" class="text-center py-8 text-xs text-stone-400">搜索中...</div>
      <div v-else-if="!keyword.trim()" class="text-center py-8 text-xs text-stone-400">输入关键词搜索</div>
      <div v-else-if="results.length === 0" class="text-center py-8 text-xs text-stone-400">没有找到相关内容</div>
      <div v-else>
        <button
          v-for="r in results" :key="r.id"
          class="w-full text-left px-3 py-2.5 border-b border-stone-50 hover:bg-stone-50 transition-colors"
          @click="handleSelect(r.conversationId)"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span class="text-amber-700 text-[8px] font-medium">{{ r.sender?.name?.charAt(0) || '?' }}</span>
            </span>
            <span class="text-xs text-stone-800 font-medium">{{ r.sender?.name || '已注销' }}</span>
            <span class="text-[10px] text-stone-400">{{ r.createdAt?.slice(0, 16) }}</span>
          </div>
          <p class="text-xs text-stone-500 line-clamp-1">
            <span v-if="r.type === 'file'" class="text-amber-600">[文件] </span>
            {{ r.content?.length > 60 ? r.content.slice(0, 60) + '...' : r.content }}
          </p>
        </button>
        <div v-if="results.length < total" class="text-center py-3">
          <UButton variant="ghost" color="neutral" size="xs" @click="loadMore">加载更多</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
