<script setup lang="ts">
/**
 * PDF 查看器 — 多页滚动渲染 + 缩放 + 搜索 + 打印下载
 * .client.vue: Nuxt 自动跳过 SSR，仅在客户端渲染
 */
import type { PdfSignaturePlacement } from '~/types/pdf'

const props = defineProps<{
  source: string | Uint8Array
  showSearch?: boolean
  showToolbar?: boolean
  signMode?: boolean
  placements?: PdfSignaturePlacement[]
  httpHeaders?: Record<string, string>
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

// 多页渲染：每个页面一个 canvas
const pages = ref<{ pageNum: number; rendered: boolean }[]>([])
const pageCanvasRefs = ref<Map<number, HTMLCanvasElement>>(new Map())

function setPageCanvas(el: HTMLCanvasElement | null, pageNum: number) {
  if (el) pageCanvasRefs.value.set(pageNum, el)
}

// 当前可见的缩放值（所有页面共享）
const currentScale = ref(1.0)

// 核心修复：watch source 变化，异步赋值时自动重新加载 PDF
watch(
  () => props.source,
  async (newSource) => {
    if (!newSource) return
    if (typeof newSource === 'string' && !newSource.trim()) return
    resetViewer()
    await loadPdf(newSource, props.httpHeaders)
    const doc = getPdfDoc()
    if (doc) {
      await initSearch(doc)
      // 初始化多页数组
      pages.value = Array.from({ length: totalPages.value }, (_, i) => ({ pageNum: i + 1, rendered: false }))
      pageCanvasRefs.value = new Map()
      await nextTick()
      // 滚动到顶部
      if (containerRef.value) containerRef.value.scrollTop = 0
      // 渲染前几页
      renderVisiblePages()
    }
  },
  { immediate: true },
)

// 渲染所有页面
async function renderAllPages() {
  const doc = getPdfDoc()
  if (!doc) return
  const s = currentScale.value

  for (const p of pages.value) {
    if (p.rendered) continue
    const canvas = pageCanvasRefs.value.get(p.pageNum)
    if (!canvas) continue
    p.rendered = true
    try {
      await renderPage(p.pageNum, canvas, s)
    } catch { p.rendered = false }
  }
}

// 按需渲染可见页
let renderTimer: ReturnType<typeof setTimeout> | null = null
function renderVisiblePages() {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(async () => {
    const doc = getPdfDoc()
    if (!doc) return
    const s = currentScale.value

    for (const p of pages.value) {
      if (p.rendered) continue
      const canvas = pageCanvasRefs.value.get(p.pageNum)
      if (!canvas) continue
      p.rendered = true
      try {
        await renderPage(p.pageNum, canvas, s)
      } catch { p.rendered = false }
    }
  }, 50)
}

// 缩放改变时重新渲染所有页面
watch(currentScale, async () => {
  for (const p of pages.value) p.rendered = false
  await nextTick()
  renderVisiblePages()
})

function handleZoomIn() {
  zoomIn()
  currentScale.value = scale.value
}
function handleZoomOut() {
  zoomOut()
  currentScale.value = scale.value
}
async function handleFitWidth() {
  const width = containerRef.value?.clientWidth ?? 800
  fitToWidth(width - 40)
  await nextTick()
  currentScale.value = scale.value
}

function handleGoToPage(p: number) {
  goToPage(p)
  const el = pageCanvasRefs.value.get(p)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const searchQuerySynced = ref('')

function handleSearch() { search(searchQuerySynced.value) }
function handleSearchClear() { searchQuerySynced.value = ''; clearSearch() }

// 初始 scale
watch(scale, (s) => { if (s) currentScale.value = s })

onUnmounted(() => { destroySearch() })

// 滚动时渲染可见页
function onScroll() { renderVisiblePages() }
</script>

<template>
  <div ref="containerRef" class="pdf-viewer flex flex-col h-full bg-surface-hover" @scroll="onScroll">
    <PdfToolbar
      v-if="showToolbar !== false"
      :current-page="currentPage"
      :total-pages="totalPages"
      :scale="currentScale"
      :show-search="showSearch !== false"
      :search-query="searchQuerySynced"
      :search-current-match="searchCurrentMatch"
      :search-total-matches="searchTotalMatches"
      :search-status="searchStatus"
      @update:search-query="searchQuerySynced = $event"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @fit-width="handleFitWidth"
      @go-to-page="handleGoToPage"
      @prev-page="prevPage()"
      @next-page="nextPage()"
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
        <p class="mt-2 text-xs text-content-muted">
          {{ progress.total ? `加载中 ${Math.round(progress.loaded / progress.total * 100)}%` : '加载中...' }}
        </p>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-file-x" class="w-12 h-12 text-content-muted mx-auto mb-3" />
        <p class="text-sm text-content-muted">{{ error }}</p>
      </div>
    </div>

    <!-- 多页滚动视图 -->
    <div v-else class="flex-1 overflow-auto px-4 py-6 flex flex-col items-center gap-4">
      <div
        v-for="p in pages"
        :key="p.pageNum"
        :id="`pdf-page-${p.pageNum}`"
        class="relative inline-block"
      >
        <canvas
          :ref="(el: any) => setPageCanvas(el as HTMLCanvasElement, p.pageNum)"
          class="shadow-md rounded-sm bg-surface-card"
        />
        <div class="text-center text-[10px] text-content-muted mt-1">{{ p.pageNum }} / {{ totalPages }}</div>
        <div v-if="signOverlayVisible" class="absolute inset-0 pointer-events-none">
          <slot name="sign-overlay" />
        </div>
      </div>
    </div>
  </div>
</template>
