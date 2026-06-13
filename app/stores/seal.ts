/**
 * 印章管理 Pinia Store
 * 缓存印章列表、签章记录
 */

import type { SealInfo, PdfSignaturePlacement } from '~/types/pdf'

interface SealStoreState {
  seals: SealInfo[]
  loading: boolean
  signRecords: Map<string, PdfSignaturePlacement[]>
}

export const useSealStore = defineStore('seal', () => {
  const seals = ref<SealInfo[]>([])
  const loading = ref(false)

  async function fetchSeals(type?: string) {
    loading.value = true
    try {
      const { $api } = useNuxtApp()
      const params: any = { pageSize: 100 }
      if (type) params.type = type
      const res = await $api('/api/seals', { params }) as any
      if (res?.code === 0) {
        seals.value = res.data.items
      }
    } finally {
      loading.value = false
    }
  }

  async function uploadSeal(file: File): Promise<SealInfo | null> {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const { $api } = useNuxtApp()
      const res = await $api('/api/seals', {
        method: 'POST',
        body: formData,
      }) as any
      if (res?.code === 0) {
        const seal = res.data
        seals.value.unshift(seal)
        return seal
      }
      return null
    } catch {
      return null
    }
  }

  async function deleteSeal(sealId: string) {
    try {
      const { $api } = useNuxtApp()
      await $api(`/api/seals/${sealId}`, { method: 'DELETE' })
      seals.value = seals.value.filter(s => s.id !== sealId)
    } catch {
      // ignore
    }
  }

  return {
    seals,
    loading,
    fetchSeals,
    uploadSeal,
    deleteSeal,
  }
})
