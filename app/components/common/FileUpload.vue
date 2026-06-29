<script setup lang="ts">
/**
 * 文件上传组件 — 拖拽 + 点击 + 进度 + 文件列表
 * 用法:
 *   <FileUpload upload-url="/api/contracts/xxx/attachments" @uploaded="refresh" />
 */

interface UploadedFile {
  id: string
  fileName: string
  fileSize: number
  fileUrl?: string
  createdAt?: string
}

interface Props {
  uploadUrl: string
  source?: 'attachment' | 'deliverable'
  /** 接受的文件类型，如 'image/*,.pdf' */
  accept?: string
  /** 最大文件大小 (MB) */
  maxSize?: number
  /** 已上传的文件列表 */
  files?: UploadedFile[]
  /** 是否正在加载文件列表 */
  loading?: boolean
  /** 上传中 */
  uploading?: boolean
  /** 是否允许多文件 */
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip',
  maxSize: 20,
  files: () => [],
  loading: false,
  uploading: false,
  multiple: false,
  source: 'attachment',
})

const emit = defineEmits<{
  uploaded: [file: any]
  delete: [file: UploadedFile]
}>()

const toast = useToast()
const authStore = useAuthStore()
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(1) + ' ' + units[i]
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) await uploadFile(file)
}

async function handleDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) await uploadFile(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

async function uploadFile(file: File) {
  if (props.maxSize && file.size > props.maxSize * 1024 * 1024) {
    toast.add({ title: `文件太大了，最多 ${props.maxSize} MB`, color: 'warning' })
    return
  }

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch(props.uploadUrl, {
      method: 'POST',
      body: formData,
      headers: { ...useAuthHeaders() },
    }) as any

    if (response?.code === 0) {
      toast.add({ title: '上传完成', color: 'success' })
      emit('uploaded', response.data || response)
      if (fileInput.value) fileInput.value.value = ''
    } else {
      toast.add({ title: response?.message || '上传出了点问题', color: 'error' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '上传出了点问题', color: 'error' })
  }
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    pdf: 'i-lucide-file-text',
    doc: 'i-lucide-file-text', docx: 'i-lucide-file-text',
    xls: 'i-lucide-file-spreadsheet', xlsx: 'i-lucide-file-spreadsheet',
    ppt: 'i-lucide-file-presentation', pptx: 'i-lucide-file-presentation',
    png: 'i-lucide-file-image', jpg: 'i-lucide-file-image', jpeg: 'i-lucide-file-image', gif: 'i-lucide-file-image', webp: 'i-lucide-file-image', svg: 'i-lucide-file-image',
  }
  return iconMap[ext || ''] || 'i-lucide-file'
}

function getFileTypeGroup(fileName: string): 'image' | 'pdf' | 'office' | 'spreadsheet' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet'
  if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return 'office'
  return 'other'
}

const previewFile = ref<any>(null)
const showPreview = ref(false)
const previewUrl = computed(() => {
  if (!previewFile.value) return ''
  return `/api/attachments/${previewFile.value.id}/preview?source=${props.source}&token=${authStore.accessToken}`
})

function openPreview(file: UploadedFile) {
  previewFile.value = file
  showPreview.value = true
}

function openPreviewUrl() {
  if (previewUrl.value) window.open(previewUrl.value, '_blank')
}

</script>

<template>
  <div>
    <!-- 上传区域 -->
    <div
      :class="[
        'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
        dragOver
          ? 'border-brand-400 bg-brand-50'
          : 'border-line hover:border-brand-300 hover:bg-surface-hover'
      ]"
      @click="triggerFileInput"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :multiple="multiple"
        class="hidden"
        @change="handleFileSelect"
      />

      <div v-if="props.uploading" class="space-y-2">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 text-brand-500 mx-auto animate-spin" />
        <p class="text-sm text-content-muted">上传中...</p>
      </div>
      <div v-else>
        <UIcon name="i-lucide-upload-cloud" class="w-8 h-8 text-content-muted mx-auto mb-2" />
        <p class="text-sm text-content-muted">拖拽文件到此处，或点击选择</p>
        <p class="text-xs text-content-muted mt-1">支持 {{ accept?.replace(/\./g, '').replace(/,/g, ', ') }} (最大 {{ maxSize }}MB)</p>
      </div>
    </div>

    <!-- 已上传文件列表 -->
    <div v-if="props.files && props.files.length > 0" class="mt-3 space-y-1">
      <p class="text-xs text-content-muted mb-1">已上传 {{ props.files.length }} 个文件</p>
      <div
        v-for="file in props.files"
        :key="file.id"
        class="flex items-center justify-between px-3 py-2 rounded-md bg-surface-hover hover:bg-surface-hover transition-colors group"
      >
        <div class="flex items-center gap-2 min-w-0">
          <UIcon :name="getFileIcon(file.fileName)" class="w-4 h-4 text-content-muted flex-shrink-0" />
          <a
            href="#"
            class="text-sm text-brand-600 hover:text-brand-700 hover:underline truncate transition-colors"
            @click.prevent="openPreview(file)"
          >{{ file.fileName }}</a>
          <span class="text-xs text-content-muted flex-shrink-0">{{ formatFileSize(file.fileSize) }}</span>
        </div>
        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="xs"
          class="opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="$emit('delete', file)"
        />
      </div>
    </div>
    <div v-else-if="loading" class="mt-3 text-center text-xs text-content-muted py-4">加载中...</div>

    <!-- 文件预览弹窗（全屏） -->
    <UModal v-model:open="showPreview" :ui="{ content: 'w-screen h-screen !max-w-none !max-h-none rounded-none' }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <span class="text-sm font-medium truncate text-content-secondary">{{ previewFile?.fileName }}</span>
          <UButton
            icon="i-lucide-x"
            variant="solid"
            color="neutral"
            size="sm"
            class="rounded-full"
            @click="showPreview = false"
          >关闭</UButton>
        </div>
      </template>
      <template #body>
        <!-- 图片 -->
        <div v-if="previewFile && getFileTypeGroup(previewFile.fileName) === 'image'" class="flex items-center justify-center p-4">
          <img :src="previewUrl" :alt="previewFile?.fileName" class="max-w-full max-h-[calc(100vh-180px)] object-contain rounded-md" />
        </div>
        <!-- PDF -->
        <template v-else-if="previewFile && getFileTypeGroup(previewFile.fileName) === 'pdf'">
          <PdfViewer :source="previewUrl" class="w-full" style="height: calc(100vh - 180px)" />
        </template>
        <!-- Office 文档 -->
        <iframe v-else-if="previewFile && getFileTypeGroup(previewFile.fileName) === 'office'" :src="previewUrl" class="w-full border-0" style="height: calc(100vh - 180px)" />
        <!-- 不支持的类型 -->
        <div v-else-if="previewUrl" class="flex flex-col items-center justify-center" style="height: calc(100vh - 180px)">
          <UIcon name="i-lucide-file" class="w-16 h-16 mx-auto mb-4 text-content-muted" />
          <p class="text-sm text-content-muted">暂不支持预览此文件类型</p>
          <UButton color="primary" size="sm" class="mt-4" @click="openPreviewUrl">下载文件</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
