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

async function handleAdd() {
  if (!form.value.name) { toast.add({ title: '交付物名称不能为空', color: 'warning' }); return }
  loading.value = true
  try {
    const res = await $api(`/api/projects/${props.projectId}/deliverables`, { method: 'POST', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '交付物已添加', color: 'success' }); showModal.value = false; form.value = { name: '', description: '' }; emit('refresh') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { loading.value = false }
}
</script>

<template>
  <div class="em-card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-secondary">交付物</h3>
      <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="form = { name: '', description: '' }; showModal = true">添加</UButton>
    </div>
    <div v-if="deliverables?.length" class="space-y-2">
      <div v-for="d in deliverables" :key="d.id" class="p-2 rounded-md hover:bg-surface-hover transition-colors">
        <div class="flex items-center justify-between">
          <span class="text-sm text-content-secondary">{{ d.name }}</span>
          <span :class="['text-[10px] px-1 py-0.5 rounded-full', { 'bg-surface-hover text-content-muted': d.status === 'pending', 'bg-brand-50 text-brand-600': d.status === 'submitted', 'bg-teal-50 text-teal-600': d.status === 'accepted', 'bg-danger-50 text-danger-500': d.status === 'rejected' }]">
            {{ ({ pending: '待提交', submitted: '已提交', accepted: '已验收', rejected: '已驳回' } as Record<string, string>)[d.status] || d.status }}
          </span>
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
