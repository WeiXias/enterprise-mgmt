<script setup lang="ts">
const props = defineProps<{
  projectId: string
  deliverables: any[]
}>()

const emit = defineEmits<{ refresh: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()

const showModal = ref(false)
const loading = ref(false)
const form = ref({ name: '', description: '' })
const uploading = ref<Record<string, boolean>>({})

async function handleAdd() {
  if (!form.value.name) { toast.add({ title: '交付物名称不能为空', color: 'warning' }); return }
  loading.value = true
  try {
    const res = await $api(`/api/projects/${props.projectId}/deliverables`, { method: 'POST', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '交付物已添加', color: 'success' }); showModal.value = false; form.value = { name: '', description: '' }; emit('refresh') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { loading.value = false }
}

async function handleUpload(deliverableId: string, file: File) {
  uploading.value[deliverableId] = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $api(`/api/deliverables/${deliverableId}/upload`, { method: 'POST', body: formData }) as any
    if (res?.code === 0) { toast.add({ title: '文件已上传', color: 'success' }); emit('refresh') }
  } catch (err: any) { toast.add({ title: '上传失败', color: 'error' }) }
  finally { uploading.value[deliverableId] = false }
}

async function handleDelete(deliverableId: string) {
  try {
    const res = await $api(`/api/deliverables/${deliverableId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '交付物已删除', color: 'success' }); emit('refresh') }
  } catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
}

function onFileChange(deliverableId: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleUpload(deliverableId, file)
}
</script>

<template>
  <div class="em-card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-secondary">交付物</h3>
      <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="form = { name: '', description: '' }; showModal = true">添加</UButton>
    </div>
    <div v-if="deliverables?.length" class="space-y-2">
      <div v-for="d in deliverables" :key="d.id" class="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover transition-colors group">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-sm text-content-secondary truncate">{{ d.name }}</span>
          <span :class="['text-[10px] px-1 py-0.5 rounded-full flex-shrink-0', { 'bg-surface-hover text-content-muted': d.status === 'pending', 'bg-brand-50 text-brand-600': d.status === 'submitted', 'bg-teal-50 text-teal-600': d.status === 'accepted', 'bg-danger-50 text-danger-500': d.status === 'rejected' }]">
            {{ ({ pending: '待提交', submitted: '已提交', accepted: '已验收', rejected: '已驳回' } as Record<string, string>)[d.status] || d.status }}
          </span>
          <a v-if="d.filePath" :href="d.filePath" target="_blank" class="text-[10px] text-brand-600 hover:underline flex-shrink-0">查看文件</a>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <label :for="`upload-${d.id}`" class="cursor-pointer p-1 text-content-secondary hover:text-brand-600 rounded" :title="uploading[d.id] ? '上传中...' : '上传文件'">
            <UIcon v-if="uploading[d.id]" name="i-lucide-loader" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else name="i-lucide-upload" class="w-3.5 h-3.5" />
          </label>
          <input :id="`upload-${d.id}`" type="file" class="hidden" @change="onFileChange(d.id, $event)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="neutral" size="xs" @click="handleDelete(d.id)" />
        </div>
      </div>
    </div>
    <div v-else class="text-xs text-content-muted py-3 text-center">暂无交付物</div>
  </div>

  <FormModal v-if="showModal" v-model:open="showModal" title="添加交付物" size="compact" :loading="loading" @confirm="handleAdd">
    <form class="space-y-3" @submit.prevent="handleAdd">
      <div><label class="block text-sm text-content-primary mb-1">名称 <span class="text-danger-500">*</span></label><input v-model="form.name" type="text" placeholder="交付物名称" class="w-full input-base focus-ring" /></div>
      <div><label class="block text-sm text-content-primary mb-1">描述</label><textarea v-model="form.description" rows="2" placeholder="交付物说明..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" /></div>
    </form>
  </FormModal>
</template>
