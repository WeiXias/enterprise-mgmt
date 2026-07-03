<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '会计期间', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const items = ref<any[]>([])
const loading = ref(true)

const showModal = ref(false)
const saving = ref(false)
const form = ref({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })

async function fetchItems() {
  loading.value = true
  try {
    const res = await $api('/api/accounting/periods') as any
    if (res?.code === 0) items.value = res.data || []
  } catch {}
  finally { loading.value = false }
}

async function handleCreate() {
  saving.value = true
  try {
    await $api('/api/accounting/periods', { method: 'POST', body: form.value })
    toast.add({ title: '会计期间已创建', color: 'success' })
    showModal.value = false; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleClose(item: any) {
  if (!confirm(`确定要对 ${item.year}年${item.month}月 进行结账吗？结账后该期间不可再录入凭证。`)) return
  saving.value = true
  try {
    const res = await $api(`/api/accounting/periods/${item.id}/close`, { method: 'POST' }) as any
    const data = res?.data
    toast.add({ title: data ? `净利润 ¥${data.netProfit.toLocaleString('zh-CN')}，已结账` : '已结账', color: 'success' })
    fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '结账失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(() => fetchItems())
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">会计期间</h1>
        <p class="text-sm text-content-muted mt-0.5">管理会计期间，结账后锁定该期间</p>
      </div>
      <UButton icon="i-lucide-plus" color="primary" @click="showModal = true">添加期间</UButton>
    </div>

    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else class="space-y-1">
      <div v-for="item in items" :key="item.id" class="em-card !p-2.5 flex items-center gap-3">
        <div :class="['w-2 h-8 rounded-full', item.isClosed ? 'bg-content-muted' : 'bg-teal-400']" />
        <div class="flex-1">
          <span class="text-sm font-medium text-content-primary">{{ item.year }}年{{ item.month }}月</span>
          <span class="text-xs text-content-muted ml-2">{{ item.startDate }} ~ {{ item.endDate }}</span>
        </div>
        <span :class="['text-xs px-1.5 py-0.5 rounded-full', item.isClosed ? 'bg-surface-hover text-content-muted' : 'bg-teal-50 text-teal-600']">
          {{ item.isClosed ? '已结账' : '进行中' }}
        </span>
        <UButton v-if="!item.isClosed" icon="i-lucide-lock" variant="ghost" color="neutral" size="xs" :loading="saving" @click="handleClose(item)">
          结账
        </UButton>
      </div>
    </div>

    <FormModal v-if="showModal" v-model:open="showModal" title="添加会计期间" size="compact" :loading="saving" @confirm="handleCreate" @cancel="showModal = false">
      <form class="space-y-3" @submit.prevent="handleCreate">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">年份</label><input v-model.number="form.year" type="number" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">月份</label><select v-model.number="form.month" class="input-base text-sm h-9 w-full"><option v-for="m in 12" :key="m" :value="m">{{ m }}月</option></select></div>
        </div>
      </form>
    </FormModal>
  </div>
</template>
