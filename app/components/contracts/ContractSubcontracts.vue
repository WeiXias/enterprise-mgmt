<script setup lang="ts">
const props = defineProps<{ contractId: string }>()

const emit = defineEmits<{ save: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()
const subcontracts = ref<any[]>([])
const showSubcontractModal = ref(false)
const subLoading = ref(false)
const subForm = ref({ name: '', totalAmount: 0, subcontractPartyId: '', taxRate: 0.05, serviceFee: 0, items: [] as any[] })
const subParties = ref<any[]>([])
const editSubId = ref<string | null>(null)
const showDeleteSubDialog = ref(false)
const deleteSubTarget = ref<any>(null)

function formatMoney(v: any) {
  const n = Number(v)
  if (isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function fetchSubcontracts() {
  try {
    const res = await $api(`/api/contracts/${props.contractId}/subcontracts`) as any
    if (res?.code === 0) subcontracts.value = res.data || []
  } catch { /* ignore */ }
}

async function openSubcontractModal() {
  try {
    const partiesRes = await $api('/api/subcontract-parties') as any
    if (partiesRes?.code === 0) subParties.value = partiesRes.data || []
  } catch {}
  subForm.value = { name: '', totalAmount: 0, subcontractPartyId: '', taxRate: 0.05, serviceFee: 0, items: [] }
  editSubId.value = null
  showSubcontractModal.value = true
}

function openEditSubcontract(sc: any) {
  subForm.value = { name: sc.name, totalAmount: sc.totalAmount, subcontractPartyId: sc.subcontractPartyId || '', taxRate: sc.taxRate || 0.05, serviceFee: sc.serviceFee || 0, items: [] }
  editSubId.value = sc.id
  showSubcontractModal.value = true
}

async function handleSaveSubcontract() {
  if (!subForm.value.name || !subForm.value.totalAmount) { toast.add({ title: '名称和金额还没填呢', color: 'warning' }); return }
  subLoading.value = true
  try {
    if (editSubId.value) {
      await $api(`/api/subcontracts/${editSubId.value}`, { method: 'PUT', body: subForm.value })
    } else {
      await $api(`/api/contracts/${props.contractId}/subcontracts`, { method: 'POST', body: subForm.value })
    }
    toast.add({ title: '已保存', color: 'success' }); showSubcontractModal.value = false; fetchSubcontracts()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { subLoading.value = false }
}

function promptDeleteSubcontract(sc: any) {
  deleteSubTarget.value = sc
  showDeleteSubDialog.value = true
}

async function handleDeleteSubcontractConfirmed() {
  if (!deleteSubTarget.value) return
  try {
    await $api(`/api/subcontracts/${deleteSubTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' }); fetchSubcontracts()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { showDeleteSubDialog.value = false }
}

const statusColor: Record<string, string> = {
  draft: 'bg-surface-hover text-content-secondary',
  in_progress: 'bg-teal-50 text-teal-700',
  completed: 'bg-teal-50 text-teal-700',
  terminated: 'bg-danger-50 text-danger-600',
}

const statusLabel: Record<string, string> = {
  draft: '草稿', in_progress: '进行中', completed: '已完成', terminated: '已终止',
}

onMounted(() => fetchSubcontracts())
</script>

<template>
  <div class="mt-4">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm text-content-muted">分包合同列表</span>
      <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openSubcontractModal">创建分包</UButton>
    </div>
    <div v-if="!subcontracts?.length" class="text-center py-8 text-content-muted text-sm">暂无分包合同</div>
    <div v-else class="space-y-2">
      <div v-for="sc in subcontracts" :key="sc.id" class="em-card flex items-center gap-4">
        <div class="flex-1">
          <span class="text-sm text-content-primary font-medium">{{ sc.name }}</span>
          <span :class="['ml-2 text-[10px] px-1.5 py-0.5 rounded-full', statusColor[sc.status] || '']">{{ statusLabel[sc.status] || sc.status }}</span>
          <p class="text-xs text-content-muted mt-0.5">{{ sc.subcontractPartyName || '-' }} · {{ formatMoney(sc.totalAmount) }} · 税费 {{ (sc.taxRate * 100).toFixed(0) }}%</p>
        </div>
        <div class="flex gap-1">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditSubcontract(sc)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="promptDeleteSubcontract(sc)" />
        </div>
      </div>
    </div>

    <FormModal v-if="showSubcontractModal" v-model:open="showSubcontractModal" :title="editSubId ? '编辑分包合同' : '创建分包合同'" :loading="subLoading" @confirm="handleSaveSubcontract">
      <div class="space-y-4">
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">基本信息</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">名称 <span class="text-danger-500">*</span></label><input v-model="subForm.name" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">分包对象</label><EnumSelect v-model="subForm.subcontractPartyId" :options="subParties.map(p => ({ value: p.id, label: p.name }))" placeholder="选择分包对象" /></div>
          </div>
        </div>
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">金额与税费</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">基础分包金额 <span class="text-danger-500">*</span></label><input v-model.number="subForm.totalAmount" type="number" step="0.01" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">税费率</label><input v-model.number="subForm.taxRate" type="number" step="0.01" min="0" max="1" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
          </div>
          <div class="mt-3"><label class="block text-sm text-content-secondary mb-1">技术服务费</label><input v-model.number="subForm.serviceFee" type="number" step="0.01" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
        </div>
        <div class="rounded-xl bg-brand-50 border border-brand-200 p-4 text-sm space-y-1">
          <p>含税总额：<span class="font-medium text-brand-700">{{ formatMoney(subForm.totalAmount * (1 + (subForm.taxRate || 0))) }}</span></p>
          <p v-if="subForm.serviceFee" class="text-xs text-content-muted">技术服务费：{{ formatMoney(subForm.serviceFee) }}</p>
        </div>
      </div>
    </FormModal>

    <ConfirmDialog v-model:open="showDeleteSubDialog" :danger="true" title="删除分包合同" message="确定要删除这个分包合同吗？" @confirm="handleDeleteSubcontractConfirmed" />
  </div>
</template>
