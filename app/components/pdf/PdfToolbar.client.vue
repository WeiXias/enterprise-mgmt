<script setup lang="ts">
/**
 * PDF 工具栏 — 缩放、翻页、搜索、打印、下载
 */
const props = defineProps<{
  currentPage: number
  totalPages: number
  scale: number
  /** 是否显示搜索 */
  showSearch?: boolean
  /** 搜索关键词 */
  searchQuery: string
  searchCurrentMatch: number
  searchTotalMatches: number
  searchStatus: 'idle' | 'searching' | 'found' | 'not_found' | 'wrapped'
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  zoomIn: []
  zoomOut: []
  fitWidth: []
  goToPage: [page: number]
  prevPage: []
  nextPage: []
  search: []
  searchNext: []
  searchPrev: []
  searchClear: []
  download: []
  print: []
}>()

const pageInput = ref(String(props.currentPage))

watch(() => props.currentPage, (v) => {
  pageInput.value = String(v)
})

function handlePageInput(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    const num = parseInt(pageInput.value, 10)
    if (num >= 1 && num <= props.totalPages) {
      emit('goToPage', num)
    } else {
      pageInput.value = String(props.currentPage)
    }
  }
}

const scalePercent = computed(() => Math.round(props.scale * 100) + '%')
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-2 bg-surface-hover border-b border-line-light">
    <!-- 翻页 -->
    <div class="flex items-center gap-0.5">
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        color="neutral"
        size="xs"
        class="w-6 h-6"
        :disabled="currentPage <= 1"
        title="上一页"
        @click="emit('prevPage')"
      />
      <span class="flex items-center gap-1 text-xs text-content-muted">
        <input
          v-model="pageInput"
          class="w-8 text-center text-xs border border-line rounded-md bg-surface-card text-content-secondary
                 focus-ring py-0.5"
          @keydown="handlePageInput"
        />
        / {{ totalPages }}
      </span>
      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        color="neutral"
        size="xs"
        class="w-6 h-6"
        :disabled="currentPage >= totalPages"
        title="下一页"
        @click="emit('nextPage')"
      />
    </div>

    <!-- 分隔 -->
    <div class="w-px h-4 bg-line" />

    <!-- 缩放 -->
    <div class="flex items-center gap-0.5">
      <UButton
        icon="i-lucide-zoom-out"
        variant="ghost"
        color="neutral"
        size="xs"
        class="w-6 h-6"
        title="缩小"
        @click="emit('zoomOut')"
      />
      <span class="text-xs text-content-muted min-w-[36px] text-center">{{ scalePercent }}</span>
      <UButton
        icon="i-lucide-zoom-in"
        variant="ghost"
        color="neutral"
        size="xs"
        class="w-6 h-6"
        title="放大"
        @click="emit('zoomIn')"
      />
      <UButton
        variant="ghost"
        color="neutral"
        size="xs"
        class="text-[11px] text-content-muted px-1"
        title="适应宽度"
        @click="emit('fitWidth')"
      >
        适应
      </UButton>
    </div>

    <!-- 分隔 -->
    <div class="w-px h-4 bg-line" />

    <!-- 搜索 -->
    <PdfSearchBar
      v-if="showSearch"
      :model-value="searchQuery"
      :current-match="searchCurrentMatch"
      :total-matches="searchTotalMatches"
      :status="searchStatus"
      @update:model-value="emit('update:searchQuery', $event)"
      @search="emit('search')"
      @next="emit('searchNext')"
      @prev="emit('searchPrev')"
      @clear="emit('searchClear')"
    />

    <!-- 右侧操作 -->
    <div class="flex-1" />
    <div class="flex items-center gap-0.5">
      <UButton
        icon="i-lucide-file-down"
        variant="ghost"
        color="neutral"
        size="xs"
        class="w-6 h-6"
        title="下载"
        @click="emit('download')"
      />
      <UButton
        icon="i-lucide-printer"
        variant="ghost"
        color="neutral"
        size="xs"
        class="w-6 h-6"
        title="打印"
        @click="emit('print')"
      />
    </div>
  </div>
</template>
