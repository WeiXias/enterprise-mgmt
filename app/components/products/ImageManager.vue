<script setup lang="ts">
const toast = useToast()
const { $api } = useNuxtApp()

const props = defineProps<{
  productId: string
}>()

const images = ref<any[]>([])
const loading = ref(false)
const uploading = ref(false)

function getUrl(img: any) { return img.filePath?.startsWith('/uploads') ? img.filePath : `/api/attachments/${img.fileName}` }

async function fetchImages() {
  loading.value = true
  try { const res = await $api(`/api/products/${props.productId}/images`) as any; if (res?.code === 0) images.value = res.data } catch {}
  finally { loading.value = false }
}

async function uploadImage(file: File) {
  if (file.size > 10 * 1024 * 1024) { toast.add({ title: '图片不能超过 10MB', color: 'warning' }); return }
  uploading.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const res = await $fetch(`/api/products/${props.productId}/images`, { method: 'POST', body: fd }) as any
    if (res?.code === 0) { toast.add({ title: '图片已上传', color: 'success' }); fetchImages() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '上传失败', color: 'error' }) }
  finally { uploading.value = false }
}

async function deleteImage(imageId: string) {
  try {
    const res = await $api(`/api/products/${props.productId}/images/${imageId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '图片已删除', color: 'success' }); fetchImages() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) { uploadImage(input.files[0]!); input.value = '' }
}

defineExpose({ fetchImages, images, getUrl })
</script>

<template>
  <div>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelect" />
    <div v-if="images.length > 1" class="mb-5">
      <h3 class="text-sm font-medium text-content-secondary mb-3">全部图片 ({{ images.length }})</h3>
      <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        <div v-for="img in images" :key="img.id" class="relative group rounded-lg border border-line overflow-hidden aspect-square">
          <img :src="getUrl(img)" class="w-full h-full object-cover" />
          <button class="absolute top-1 right-1 w-5 h-5 rounded-full bg-danger-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" @click="deleteImage(img.id)"><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
