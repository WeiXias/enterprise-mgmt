<script setup lang="ts">
const props = defineProps<{ contractId: string }>()

const emit = defineEmits<{ save: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()
const contract = inject<any>('contract')
const { getLabel } = useEnum()
const showPlanModal = ref(false)
const planLoading = ref(false)
const planForm = ref({ amount: 0, planDate: '', remark: '' })
const editPlanId = ref<string | null>(null)

function formatMoney(v: any) {
  const n = Number(v)
  if (isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function openEditPlan(plan: any) {
  editPlanId.value = plan.id
  planForm.value = { amount: plan.amount, planDate: plan.planDate?.slice(0, 10) || '', remark: plan.remark || '' }
  showPlanModal.value = true
}

async function savePlan() {
  if (!planForm.value.amount || !planForm.value.planDate) { toast.add({ title: '金额和日期都得填', color: 'warning' }); return }
  planLoading.value = true
  try {
    if (editPlanId.value) {
      await $api(`/api/contracts/${props.contractId}/payment-plans/${editPlanId.value}`, { method: 'PUT', body: planForm.value })
    } else {
      await $api(`/api/contracts/${props.contractId}/payment-plans`, { method: 'POST', body: planForm.value })
    }
    toast.add({ title: editPlanId.value ? '收款计划已更新' : '收款计划已添加', color: 'success' })
    showPlanModal.value = false; editPlanId.value = null; planForm.value = { amount: 0, planDate: '', remark: '' }; emit('save')
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { planLoading.value = false }
}

async function deletePlan(planId: string) {
  try {
    const res = await $api(`/api/contracts/${props.contractId}/payment-plans/${planId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '收款计划已删除', color: 'success' }); emit('save') }
  } catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
}
</script>

<template>
  <div class="mt-4">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm text-content-muted">收款计划列表</span>
      <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="editPlanId = null; planForm = { amount: 0, planDate: '', remark: '' }; showPlanModal = true">添加计划</UButton>
    </div>
    <div v-if="!contract?.paymentPlans?.length" class="text-center py-8 text-content-muted text-sm">暂无收款计划</div>
    <div v-else class="space-y-2">
      <div v-for="plan in contract.paymentPlans" :key="plan.id" class="em-card flex items-center gap-4">
        <div :class="['w-2 h-2 rounded-full flex-shrink-0', {
          'bg-surface-hover': plan.status === 'pending',
          'bg-teal-400': plan.status === 'paid',
          'bg-danger-400': plan.status === 'overdue',
        }]" />
        <div class="flex-1 flex items-center gap-4">
          <span class="text-sm text-content-primary font-medium">{{ formatMoney(plan.amount) }}</span>
          <span class="text-xs text-content-muted">{{ plan.planDate }}</span>
          <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', {
            'bg-surface-hover text-content-muted': plan.status === 'pending',
            'bg-teal-50 text-teal-700': plan.status === 'paid',
            'bg-danger-50 text-danger-600': plan.status === 'overdue',
          }]">{{ (['待收款', '已收款', '已逾期'] as Record<number, string>)[['pending','paid','overdue'].indexOf(plan.status)] || plan.status }}</span>
          <span v-if="plan.remark" class="text-xs text-content-muted">{{ plan.remark }}</span>
        </div>
        <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditPlan(plan)" />
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deletePlan(plan.id)" />
      </div>
    </div>

    <FormModal v-if="showPlanModal" v-model:open="showPlanModal" :title="editPlanId ? '编辑收款计划' : '添加收款计划'" :loading="planLoading" size="compact">
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">收款金额 <span class="text-danger-500">*</span></label>
          <input v-model.number="planForm.amount" type="number" step="0.01" placeholder="0.00" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">计划收款日期 <span class="text-danger-500">*</span></label>
          <input v-model="planForm.planDate" type="date" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">备注</label>
          <input v-model="planForm.remark" type="text" placeholder="备注信息..." class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
        </div>
      </div>
      <template #footer>
        <UButton color="primary" :loading="planLoading" @click="savePlan">{{ editPlanId ? '保存' : '添加' }}</UButton>
        <UButton variant="ghost" color="neutral" @click="showPlanModal = false">算了</UButton>
      </template>
    </FormModal>
  </div>
</template>
