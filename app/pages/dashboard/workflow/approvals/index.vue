<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '待审批', middleware: ['auth'] })

const { $api } = useNuxtApp()
const toast = useToast()
const items = ref<any[]>([])
const loading = ref(true)
const actionLoading = ref(false)

async function fetchPending() {
  loading.value = true
  try {
    const res = await $api('/api/workflow/instances/pending') as any
    if (res?.code === 0) items.value = res.data || []
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function doApprove(instanceId: string) {
  actionLoading.value = true
  try {
    const res = await $api(`/api/workflow/instances/${instanceId}/approve`, { method: 'POST' }) as any
    if (res?.code === 0) toast.add({ title: res.message || '已通过', color: 'success' })
    fetchPending()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

async function doReject(instanceId: string) {
  const reason = prompt('驳回原因：')
  if (!reason) return
  actionLoading.value = true
  try {
    const res = await $api(`/api/workflow/instances/${instanceId}/reject`, { method: 'POST', body: { comment: reason } }) as any
    if (res?.code === 0) toast.add({ title: '已驳回', color: 'success' })
    fetchPending()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

const { getLabel } = useEnum()

onMounted(() => { fetchPending() })
</script>

<template>
  <div>
    <CommonPageHeader title="待审批" description="需要你审批的事项都在这里">
      <template #actions>
        <UButton icon="i-lucide-refresh-cw" variant="ghost" color="neutral" size="sm" @click="fetchPending">刷新</UButton>
      </template>
    </CommonPageHeader>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-check-check" class="w-10 h-10 mx-auto mb-2 text-content-muted" />
      <p class="text-sm">没有待审批的事项</p>
    </div>
    <div v-else class="space-y-2">
      <div v-for="item in items" :key="item.instanceId" class="em-card flex items-center gap-4">
        <div class="w-1 h-10 rounded-full flex-shrink-0 bg-brand-400" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary">{{ item.definitionName }}</span>
            <span class="text-xs text-content-muted">{{ getLabel('ApprovalType', item.sourceType) || item.sourceType }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span>当前节点：{{ item.nodeName }}</span>
            <span>提交 {{ item.submittedAt?.slice(0, 10) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <UButton icon="i-lucide-check" color="primary" size="xs" :loading="actionLoading" @click="doApprove(item.instanceId)">通过</UButton>
          <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="doReject(item.instanceId)">驳回</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
