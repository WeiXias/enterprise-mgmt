import { jsonToCsv, downloadCsv, type CsvColumn } from '~/utils/export-csv'

export function useExportCsv() {
  const { $api } = useNuxtApp()
  const toast = useToast()
  const exporting = ref(false)

  async function exportCsv(apiPath: string, columns: CsvColumn[], filename: string) {
    exporting.value = true
    try {
      const res = await $api(apiPath, { params: { pageSize: 9999 } }) as any
      const items = res?.data?.items || res?.data?.list || []
      const csv = jsonToCsv(items, columns)
      downloadCsv(csv, filename)
    } catch {
      toast.add({ title: '导出失败，请重试', color: 'error' })
    } finally {
      exporting.value = false
    }
  }

  return { exporting, exportCsv }
}