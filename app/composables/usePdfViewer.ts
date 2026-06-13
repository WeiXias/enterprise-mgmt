/**
 * PDF 查看器核心逻辑 — pdfjs-dist 渲染、页面管理、缩放、打印、下载
 * 仅客户端使用，需 <ClientOnly> 包裹
 */

import type { PdfViewerState } from '~/types/pdf'

export function usePdfViewer() {
  const state = reactive<PdfViewerState>({
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    loading: false,
    progress: { loaded: 0, total: 0 },
    error: null,
  })

  let pdfDoc: any = null
  const pdfjsLib = shallowRef<any>(null)
  const initialized = ref(false)

  async function initPdfJs() {
    if (initialized.value) return
    if (!import.meta.client) return

    const lib = await import('pdfjs-dist')
    // 始终使用 unpkg CDN 的 worker，比 ?url import 更可靠
    lib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs'
    pdfjsLib.value = lib
    initialized.value = true
  }

  /**
   * 加载 PDF
   * @param source - URL 字符串或 Uint8Array
   * @param httpHeaders - 可选，请求 URL 时附加的 HTTP 头（如 Authorization）
   */
  async function loadPdf(source: string | Uint8Array, httpHeaders?: Record<string, string>) {
    await initPdfJs()
    state.loading = true
    state.error = null
    state.currentPage = 1

    try {
      const params: any = {
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.6.205/cmaps/',
        cMapPacked: true,
        useSystemFonts: true,
      }

      if (typeof source === 'string') {
        params.url = source
        if (httpHeaders) {
          params.httpHeaders = httpHeaders
        }
      } else {
        params.data = source
        // Uint8Array 时需要 range 支持
        params.rangeChunkSize = 65536
      }

      const loadingTask = pdfjsLib.value!.getDocument(params)
      loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
        state.progress = progress
      }

      pdfDoc = await loadingTask.promise
      state.totalPages = pdfDoc.numPages
    } catch (err: any) {
      console.error('PDF load error:', err)
      state.error = err?.message || 'PDF 加载出了点问题'
    } finally {
      state.loading = false
    }
  }

  async function renderPage(pageNum: number, canvas: HTMLCanvasElement, scale?: number) {
    if (!pdfDoc) return
    const s = scale ?? state.scale

    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: s })

    const dpr = window.devicePixelRatio || 1

    // 设置 canvas 物理像素
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    // 设置 CSS 显示尺寸
    canvas.style.width = viewport.width + 'px'
    canvas.style.height = viewport.height + 'px'

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    await page.render({ canvasContext: ctx, viewport }).promise
    page.cleanup()
  }

  async function getPageText(pageNum: number): Promise<string> {
    if (!pdfDoc) return ''
    const page = await pdfDoc.getPage(pageNum)
    const textContent = await page.getTextContent()
    const text = textContent.items.map((item: any) => item.str).join(' ')
    page.cleanup()
    return text
  }

  function zoomIn() {
    state.scale = Math.min(3.0, state.scale + 0.25)
  }

  function zoomOut() {
    state.scale = Math.max(0.5, state.scale - 0.25)
  }

  function fitToWidth(containerWidth: number) {
    if (!pdfDoc || containerWidth <= 0) return
    pdfDoc.getPage(state.currentPage).then((page: any) => {
      const viewport = page.getViewport({ scale: 1 })
      state.scale = containerWidth / viewport.width
      page.cleanup()
    })
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= state.totalPages) {
      state.currentPage = page
    }
  }

  function nextPage() { goToPage(state.currentPage + 1) }
  function prevPage() { goToPage(state.currentPage - 1) }

  function download(filename?: string) {
    const url = typeof pdfDoc?._transport?._params?.url === 'string'
      ? pdfDoc._transport._params.url
      : null
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'document.pdf'
    a.click()
  }

  function print() {
    if (!pdfDoc) return
    const url = typeof pdfDoc._transport?._params?.url === 'string'
      ? pdfDoc._transport._params.url
      : null
    if (!url) return
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    document.body.appendChild(iframe)
    iframe.onload = () => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
  }

  /** 获取 PDF 文档对象（供 usePdfSearch 使用） */
  function getPdfDoc() { return pdfDoc }

  /** 获取 pdfjsLib 实例 */
  function getLib() { return pdfjsLib.value }

  function reset() {
    pdfDoc = null
    state.currentPage = 1
    state.totalPages = 0
    state.scale = 1.0
    state.loading = false
    state.error = null
    state.progress = { loaded: 0, total: 0 }
  }

  return {
    state: toRefs(state),
    getPdfDoc,
    getLib,
    initPdfJs,
    loadPdf,
    renderPage,
    getPageText,
    zoomIn,
    zoomOut,
    fitToWidth,
    goToPage,
    nextPage,
    prevPage,
    download,
    print,
    reset,
  }
}
