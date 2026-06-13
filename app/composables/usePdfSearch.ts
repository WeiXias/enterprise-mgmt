/**
 * PDF 关键词搜索 — 基于 pdfjs-dist 的 EventBus + PDFFindController
 * 仅客户端使用
 */

import type { PdfSearchState } from '~/types/pdf'

export function usePdfSearch() {
  const state = reactive<PdfSearchState>({
    query: '',
    currentMatch: 0,
    totalMatches: 0,
    status: 'idle',
    caseSensitive: false,
  })

  let eventBus: any = null
  let findController: any = null
  let linkService: any = null

  async function init(pdfDocument: any) {
    if (!import.meta.client) return

    try {
      const { EventBus, PDFFindController } = await import('pdfjs-dist/web/pdf_viewer.mjs')
      eventBus = new EventBus()

      linkService = {
        get page() { return 1 },
        set page(_v: number) {},
        get pagesCount() { return pdfDocument?.numPages ?? 0 },
        get isInPresentationMode() { return false },
        getPage(_idx: number) { return null },
      }

      findController = new PDFFindController({
        eventBus,
        linkService,
      })
      findController.setDocument(pdfDocument)

      eventBus.on('updatefindmatchescount', (evt: any) => {
        if (evt.matchesCount) {
          state.currentMatch = evt.matchesCount.current
          state.totalMatches = evt.matchesCount.total
        }
      })

      eventBus.on('updatefindcontrolstate', (evt: any) => {
        // 0=FOUND, 1=NOT_FOUND, 2=WRAPPED, 3=PENDING
        const statusMap: Record<number, PdfSearchState['status']> = {
          0: 'found',
          1: 'not_found',
          2: 'wrapped',
          3: 'searching',
        }
        state.status = statusMap[evt.state] ?? 'searching'
        if (evt.matchesCount) {
          state.currentMatch = evt.matchesCount.current
          state.totalMatches = evt.matchesCount.total
        }
      })
    } catch (err) {
      console.warn('PDF search init failed:', err)
    }
  }

  function search(query: string) {
    if (!eventBus || !query.trim()) {
      resetState()
      return
    }
    state.query = query
    state.status = 'searching'
    eventBus.dispatch('find', {
      type: '',
      query,
      caseSensitive: state.caseSensitive,
      highlightAll: true,
      findPrevious: false,
    })
  }

  function findNext() {
    if (!eventBus || !state.query) return
    eventBus.dispatch('find', {
      type: '',
      query: state.query,
      caseSensitive: state.caseSensitive,
      highlightAll: true,
      findPrevious: false,
    })
  }

  function findPrev() {
    if (!eventBus || !state.query) return
    eventBus.dispatch('find', {
      type: '',
      query: state.query,
      caseSensitive: state.caseSensitive,
      highlightAll: true,
      findPrevious: true,
    })
  }

  function clearSearch() {
    resetState()
    if (eventBus) {
      eventBus.dispatch('find', {
        type: '',
        query: '',
        caseSensitive: false,
        highlightAll: false,
        findPrevious: false,
      })
    }
  }

  function resetState() {
    state.query = ''
    state.currentMatch = 0
    state.totalMatches = 0
    state.status = 'idle'
  }

  function destroy() {
    findController?.destroy?.()
    eventBus = null
    findController = null
  }

  return {
    state: toRefs(state),
    init,
    search,
    findNext,
    findPrev,
    clearSearch,
    destroy,
  }
}
