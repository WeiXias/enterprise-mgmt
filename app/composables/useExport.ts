/**
 * Excel 导出 composable
 * 调用后端导出接口，触发浏览器文件下载
 */

export function useExport() {
  const toast = useToast()
  const { $api } = useNuxtApp()
  const exporting = ref(false)

  async function exportFile(url: string, params?: Record<string, any>, filename?: string) {
    exporting.value = true
    try {
      const fullUrl = new URL(url, window.location.origin)
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v != null && v !== '') fullUrl.searchParams.set(k, String(v))
        })
      }

      const response = await fetch(fullUrl.toString(), {
        headers: { ...useAuthHeaders() },
      })

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename || `export_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      toast.add({ title: '导出完成', color: 'success' })
    } catch {
      toast.add({ title: '导出出了点问题', color: 'error' })
    } finally {
      exporting.value = false
    }
  }

  /**
   * 使用 $api 方式导出（适用于 Nuxt server routes）
   */
  async function exportViaApi(url: string, params?: Record<string, any>, filename?: string) {
    exporting.value = true
    try {
      // 尝试通过 $api 获取 blob
      const query = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v != null && v !== '') query.set(k, String(v))
        })
      }
      const queryStr = query.toString()
      const endpoint = queryStr ? `${url}?${queryStr}` : url

      // Fallback: navigate to the export URL directly to trigger browser download
      window.open(endpoint, '_blank')
      toast.add({ title: '导出中...', color: 'info' })
    } catch {
      toast.add({ title: '导出出了点问题', color: 'error' })
    } finally {
      exporting.value = false
    }
  }

  return { exportFile, exportViaApi, exporting }
}
