<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const store = useSealStore()
const toast = useToast()
const uploading = ref(false)

// 删除确认
const showDeleteDialog = ref(false)
const deleteTarget = ref<{ id: string; name: string } | null>(null)

onMounted(() => {
  store.fetchSeals()
})

async function handleUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.png')) {
    toast.add({ title: '印章图片需要 PNG 格式', color: 'warning' })
    return
  }

  uploading.value = true
  try {
    const seal = await store.uploadSeal(file)
    if (seal) {
      toast.add({ title: '印章上传好了', color: 'success' })
    } else {
      toast.add({ title: '上传出了点问题', color: 'error' })
    }
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

function promptDelete(seal: any) {
  deleteTarget.value = seal
  showDeleteDialog.value = true
}

async function handleDeleteConfirmed() {
  if (!deleteTarget.value) return
  await store.deleteSeal(deleteTarget.value.id)
  toast.add({ title: '印章已删除', color: 'success' })
  showDeleteDialog.value = false
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-lg font-medium text-content-primary">印章管理</h1>
        <p class="text-xs text-content-muted mt-1">上传和管理公司公章、签名图等</p>
      </div>
      <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 text-white text-xs cursor-pointer hover:bg-brand-600 transition-colors">
        <UIcon name="i-lucide-upload-cloud" class="w-3.5 h-3.5" />
        {{ uploading ? '上传中...' : '上传印章' }}
        <input type="file" accept=".png" class="hidden" @change="handleUpload" />
      </label>
    </div>

    <div v-if="store.loading" class="text-center py-12 text-xs text-content-muted">加载中...</div>

    <div v-else-if="store.seals.length === 0" class="text-center py-16">
      <UIcon name="i-lucide-stamp" class="w-16 h-16 text-content-muted mx-auto mb-3" />
      <p class="text-sm text-content-muted">还没有印章，上传一个吧</p>
    </div>

    <div v-else class="grid grid-cols-4 gap-4">
      <div
        v-for="seal in store.seals"
        :key="seal.id"
        class="group relative flex flex-col items-center p-4 rounded-xl border border-line-light bg-surface-card hover:border-line transition-colors"
      >
        <div class="w-20 h-20 flex items-center justify-center mb-2">
          <img
            v-if="seal.imageUrl"
            :src="seal.imageUrl"
            :alt="seal.name"
            class="max-w-full max-h-full object-contain"
          />
          <UIcon v-else name="i-lucide-stamp" class="w-12 h-12 text-content-muted" />
        </div>
        <p class="text-xs text-content-secondary text-center truncate w-full">{{ seal.name }}</p>
        <p class="text-[11px] text-content-muted mt-0.5">{{ seal.width }} x {{ seal.height }}</p>

        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="xs"
          class="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
          @click="promptDelete(seal)"
        />
      </div>
    </div>

    <ConfirmDialog
      v-model:open="showDeleteDialog"
      :danger="true"
      :title="`删除「${deleteTarget?.name}」`"
      message="印章删除后无法恢复，确定要删吗？"
      @confirm="handleDeleteConfirmed"
    />
  </div>
</template>
