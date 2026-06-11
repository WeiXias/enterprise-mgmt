/**
 * 文件上传 composable
 * 使用 multipart/form-data 上传文件
 */

export interface UploadOptions {
  url: string
  accept?: string
  maxSize?: number // bytes
}

export function useUpload(options: UploadOptions) {
  const toast = useToast()
  const { $api } = useNuxtApp()
  const uploading = ref(false)
  const progress = ref(0)

  async function upload(file: File): Promise<any | null> {
    if (options.maxSize && file.size > options.maxSize) {
      const maxMB = Math.round(options.maxSize / 1024 / 1024)
      toast.add({ title: `文件太大了，最多 ${maxMB} MB`, color: 'warning' })
      return null
    }

    uploading.value = true
    progress.value = 0

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Use native fetch for upload with progress (Nuxt $api doesn't easily support progress)
      const response = await $fetch(options.url, {
        method: 'POST',
        body: formData,
      })

interface UploadResponse { code: number; data: unknown; message?: string }

      if (response && (response as UploadResponse).code === 0) {
        toast.add({ title: '上传完成', color: 'success' })
        return (response as UploadResponse).data
      }

      return response
    } catch (err: any) {
      toast.add({ title: err?.data?.message || '上传出了点问题', color: 'error' })
      return null
    } finally {
      uploading.value = false
      progress.value = 100
    }
  }

  return { upload, uploading, progress }
}
