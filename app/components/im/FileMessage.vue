<script setup lang="ts">
const props = defineProps<{
  fileName: string
  fileSize: number
  fileType: string
  attachmentId: string
}>()

const authToken = computed(() => useAuthStore().accessToken)
const isImage = computed(() => props.fileType.startsWith('image/'))
const isPdf = computed(() => props.fileType === 'application/pdf')
const showPreview = ref(false)

// 带鉴权的文件下载/预览 URL
const fileUrl = computed(() => `/api/files/${props.attachmentId}/preview?source=im_attachment&token=${authToken.value}`)

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1024 / 1024).toFixed(1) + 'MB'
}

const getFileIcon = computed(() => {
  const ext = (props.fileName || '').split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    pdf: 'i-lucide-file-text', doc: 'i-lucide-file-text', docx: 'i-lucide-file-text',
    xls: 'i-lucide-file-spreadsheet', xlsx: 'i-lucide-file-spreadsheet',
    png: 'i-lucide-image', jpg: 'i-lucide-image', jpeg: 'i-lucide-image', gif: 'i-lucide-image', webp: 'i-lucide-image',
    zip: 'i-lucide-file-archive', rar: 'i-lucide-file-archive', '7z': 'i-lucide-file-archive',
  }
  return iconMap[ext || ''] || 'i-lucide-file'
})
</script>

<template>
  <div class="inline-block max-w-[280px]">
    <!-- 图片预览 -->
    <div v-if="isImage" class="rounded-xl overflow-hidden cursor-pointer border border-line" @click="showPreview = true">
      <img
        :src="fileUrl"
        :alt="fileName"
        class="max-w-[260px] max-h-[200px] object-cover"
        loading="lazy"
      />
    </div>

    <!-- 文件卡片 -->
    <div v-else class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-card border border-line cursor-pointer hover:border-brand-300 transition-colors" @click="showPreview = true">
      <div class="w-9 h-9 rounded-md bg-surface-hover flex items-center justify-center flex-shrink-0">
        <UIcon :name="getFileIcon" class="w-5 h-5 text-content-muted" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-content-primary truncate">{{ fileName }}</p>
        <p class="text-xs text-content-muted">{{ formatSize(fileSize) }}</p>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <UModal v-model:open="showPreview">
      <template #header>{{ fileName }}</template>
      <template #body>
        <div v-if="isImage" class="flex justify-center">
          <img :src="fileUrl" :alt="fileName" class="max-w-full max-h-[70vh] object-contain rounded-md" />
        </div>
        <template v-if="isPdf">
          <PdfViewer :source="fileUrl" class="w-full" style="height: 70vh" />
        </template>
        <div v-else class="text-center py-8">
          <UIcon name="i-lucide-download" class="w-12 h-12 text-content-muted mx-auto mb-3" />
          <p class="text-sm text-content-secondary">可下载后查看</p>
          <a :href="fileUrl" download class="mt-3 inline-block text-sm text-brand-600 hover:underline">下载文件</a>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton variant="ghost" color="neutral" @click="showPreview = false">关闭</UButton>
          <a :href="fileUrl" download>
            <UButton color="primary" class="ml-2">下载</UButton>
          </a>
        </div>
      </template>
    </UModal>
  </div>
</template>
