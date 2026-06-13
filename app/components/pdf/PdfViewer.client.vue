<script setup lang="ts">
/**
 * PDF 查看器 — Canvas 渲染 + 翻页 + 缩放 + 搜索 + 打印下载
 * .client.vue: Nuxt 自动跳过 SSR，仅在客户端渲染
 */
import type { PdfSignaturePlacement } from '~/types/pdf'

const props = defineProps<{
  source: string | Uint8Array
  showSearch?: boolean
  showToolbar?: boolean
  signMode?: boolean
  placements?: PdfSignaturePlacement[]
}>()

const emit = defineEmits<{
  'update:placements': [placements: PdfSignaturePlacement[]]
  'placement-move': [placement: PdfSignaturePlacement]
  'placement-remove': [placementId: string]
}>()

const {
  state: { currentPage, totalPages, scale, loading, error, progress },
  getPdfDoc,
  loadPdf,
  renderPage,
  zoomIn,
  zoomOut,
  fitToWidth,
  goToPage,
  nextPage,
  prevPage,
  download: downloadPdf,
  print: printPdf,
  reset: resetViewer,
} = usePdfViewer()

const {
  state: { query: searchQuery, currentMatch: searchCurrentMatch, totalMatches: searchTotalMatches, status: searchStatus },
  init: initSearch,
  search,
  findNext,
  findPrev,
  clearSearch,
  destroy: destroySearch,
} = usePdfSearch()

const containerRef = ref<HTMLElement | null>(null)
const canvasContainerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const signOverlayVisible = computed(() => props.signMode ?? false)

// 核心修复：watch source 变化，异步赋值时自动重新加载 PDF
watch(
  () => props.source,
  async (newSource) => {
    if (!newSource) return
    if (typeof newSource === 'string' && !newSource.trim()) return
    resetViewer()
    await loadPdf(newSource)
    const doc = getPdfDoc()
    if (doc) {
      await initSearch(doc)
      await nextTick()
      renderCurrentPage()
    }
  },
  { immediate: true },
)

// 页码 / 缩放变化时重新渲染
watch(currentPage, () => renderCurrentPage())
watch(scale, () => renderCurrentPage())

async function renderCurrentPage() {
  const c = canvasRef.value
  if (!c) return
  await renderPage(currentPage.value, c)
}

function handleFitWidth() {
  const width = containerRef.value?.clientWidth ?? 800
  fitToWidth(width - 40)
  nextTick(() => renderCurrentPage())
}

const searchQuerySynced = ref('')

function handleSearch() { search(searchQuerySynced.value) }
function handleSearchClear() { searchQuerySynced.value = ''; clearSearch() }

watch(currentPage, () => {
  if (searchQuerySynced.value) search(searchQuerySynced.value)
})

onUnmounted(() => {
  destroySearch()
})
</script>

<template>
  <div ref="containerRef" class="pdf-viewer flex flex-col h-full bg-gray-100">
    <PdfToolbar
      v-if="showToolbar !== false"
      :current-page="currentPage"
      :total-pages="totalPages"
      :scale="scale"
      :show-search="showSearch !== false"
      :search-query="searchQuerySynced"
      :search-current-match="searchCurrentMatch"
      :search-total-matches="searchTotalMatches"
      :search-status="searchStatus"
      @update:search-query="searchQuerySynced = $event"
      @zoom-in="zoomIn(); renderCurrentPage()"
      @zoom-out="zoomOut(); renderCurrentPage()"
      @fit-width="handleFitWidth"
      @go-to-page="(p: number) => { goToPage(p); renderCurrentPage() }"
      @prev-page="prevPage(); renderCurrentPage()"
      @next-page="nextPage(); renderCurrentPage()"
      @search="handleSearch"
      @search-next="findNext"
      @search-prev="findPrev"
      @search-clear="handleSearchClear"
      @download="downloadPdf()"
      @print="printPdf()"
    />

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
          <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
          <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
        </div>
        <p class="mt-2 text-xs text-gray-400">
          {{ progress.total ? `加载中 ${Math.round(progress.loaded / progress.total * 100)}%` : '加载中...' }}
        </p>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-file-x" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-500">{{ error }}</p>
      </div>
    </div>

    <div v-else ref="canvasContainerRef" class="flex-1 overflow-auto px-4 py-6 flex flex-col items-center relative">
      <div class="relative inline-block">
        <canvas ref="canvasRef" class="shadow-md rounded-sm bg-white" />
        <div v-if="signOverlayVisible" class="absolute inset-0 pointer-events-none">
          <slot name="sign-overlay" />
        </div>
      </div>
    </div>
  </div>
</template>
