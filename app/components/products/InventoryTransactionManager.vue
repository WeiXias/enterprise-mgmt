<script setup lang="ts">
const toast = useToast()
const { $api } = useNuxtApp()

const props = defineProps<{
  productId: string
}>()

const emit = defineEmits<{
  inventoryChanged: []
}>()

const transactions = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)
const saving = ref(false)
const form = ref({ type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' })

const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)

async function fetchTransactions() {
  loading.value = true
  try { const res = await $api(`/api/products/${props.productId}/transactions`, { params: { pageSize: 200 } }) as any; if (res?.code === 0) transactions.value = res.data.items || [] } catch {}
  finally { loading.value = false }
}

async function handleSave() {
  if (!form.value.quantity) { toast.add({ title: '数量还没填', color: 'warning' }); return }
  saving.value = true
  try {
    await $api('/api/inventory/transactions', { method: 'POST', body: { ...form.value, productId: props.productId } })
    toast.add({ title: '登记好了！', color: 'success' })
    showModal.value = false
    form.value = { type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' }
    fetchTransactions()
    emit('inventoryChanged')
  } catch (err: any) { toast.add({ title: err?.data?.message || '登记失败', color: 'error' }) }
  finally { saving.value = false }
}

function promptDelete(t: any) { deleteTarget.value = t; showDeleteDialog.value = true }

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await $api(`/api/inventory/transactions/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    showDeleteDialog.value = false
    fetchTransactions()
    emit('inventoryChanged')
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { showDeleteDialog.value = false }
}

defineExpose({ fetchTransactions })

onMounted(() => { fetchTransactions() })
</script>

<template>
  <div class="em-card mb-5">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-secondary">库存流水</h3>
      <UButton size="xs" variant="ghost" color="primary" icon="i-lucide-plus" @click="showModal = true; form = { type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' }">登记流水</UButton>
    </div>
    <div v-if="!transactions.length" class="text-center py-8 text-content-muted text-sm">暂无库存流水</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="border-b border-line-light text-left text-xs text-content-muted">
          <th class="py-2 px-3">类型</th><th class="py-2 px-3 text-right">数量</th><th class="py-2 px-3 text-right">单价</th><th class="py-2 px-3">批次</th><th class="py-2 px-3">备注</th><th class="py-2 px-3">时间</th><th class="py-2 px-3" />
        </tr></thead>
        <tbody>
          <tr v-for="t in transactions" :key="t.id" class="border-b border-line-light">
            <td class="py-2 px-3"><span :class="['text-[10px] px-1.5 py-0.5 rounded-full', t.type === 'inbound' ? 'bg-teal-50 text-teal-700' : t.type === 'outbound' ? 'bg-danger-50 text-danger-600' : 'bg-surface-hover text-content-muted']">{{ ({ inbound: '入库', outbound: '出库', adjustment: '盘点' } as Record<string, string>)[t.type] || t.type }}</span></td>
            <td class="py-2 px-3 text-right" :class="t.quantity > 0 ? 'text-teal-600' : 'text-danger-500'">{{ t.quantity > 0 ? '+' + t.quantity : t.quantity }}</td>
            <td class="py-2 px-3 text-right text-content-secondary">{{ t.unitPrice ? '¥' + t.unitPrice : '-' }}</td>
            <td class="py-2 px-3 text-xs text-content-muted">{{ t.batchNo || '-' }}</td>
            <td class="py-2 px-3 text-xs text-content-muted max-w-[120px] truncate">{{ t.remark || '-' }}</td>
            <td class="py-2 px-3 text-xs text-content-muted">{{ formatDate(t.createdAt) }}</td>
            <td class="py-2 px-3"><UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="promptDelete(t)" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <FormModal v-if="showModal" v-model:open="showModal" title="登记库存流水" size="compact" :loading="saving" @confirm="handleSave">
    <form class="space-y-3" @submit.prevent="handleSave">
      <div><label class="block text-sm text-content-secondary mb-1">类型</label><EnumSelect v-model="form.type" dict="inventoryTransactionType" placeholder="选择类型" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-sm text-content-secondary mb-1">数量 <span class="text-danger-500">*</span></label><input v-model.number="form.quantity" type="number" step="1" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">单价</label><input v-model.number="form.unitPrice" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
      </div>
      <div><label class="block text-sm text-content-secondary mb-1">批次号</label><input v-model="form.batchNo" type="text" class="w-full input-base focus-ring" /></div>
      <div><label class="block text-sm text-content-secondary mb-1">备注</label><input v-model="form.remark" type="text" class="w-full input-base focus-ring" /></div>
    </form>
  </FormModal>

  <ConfirmDialog v-if="showDeleteDialog" v-model:open="showDeleteDialog" :danger="true" title="删除库存记录" message="删除后库存将回退，确定要删吗？" @confirm="handleDelete" />
</template>
