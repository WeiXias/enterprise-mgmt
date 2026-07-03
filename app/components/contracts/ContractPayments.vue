<script setup lang="ts">
const props = defineProps<{ contractId: string }>()

const emit = defineEmits<{ save: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()
const contract = inject<any>('contract')
const { getLabel } = useEnum()
const showPaymentModal = ref(false)
const paymentLoading = ref(false)
const paymentForm = ref({ amount: 0, paymentDate: '', paymentMethod: '', paymentPlanId: '', remark: '', attachmentPath: '' })

function formatMoney(v: any) {
  const n = Number(v)
  if (isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function formatDate(v: any) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

async function addPayment() {
  if (!paymentForm.value.amount || !paymentForm.value.paymentDate) {
    toast.add({ title: '金额和日期都得填', color: 'warning' })
    return
  }
  paymentLoading.value = true
  try {
    const res = await $api(`/api/contracts/${props.contractId}/payments`, { method: 'POST', body: paymentForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '收款已登记', color: 'success' })
      showPaymentModal.value = false
      paymentForm.value = { amount: 0, paymentDate: '', paymentMethod: '', paymentPlanId: '', remark: '', attachmentPath: '' }
      emit('save')
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '登记失败', color: 'error' }) }
  finally { paymentLoading.value = false }
}

async function deletePayment(paymentId: string) {
  try {
    const res = await $api(`/api/contracts/${props.contractId}/payments/${paymentId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '收款记录已删除', color: 'success' }); emit('save') }
  } catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
}
</script>

<template>
  <div class="mt-4">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm text-content-muted">收款记录列表</span>
      <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="paymentForm = { amount: 0, paymentDate: '', paymentMethod: '', paymentPlanId: '', remark: '', attachmentPath: '' }; showPaymentModal = true">登记收款</UButton>
    </div>
    <div v-if="!contract?.payments?.length" class="text-center py-8 text-content-muted text-sm">暂无收款记录</div>
    <div v-else class="space-y-2">
      <div v-for="pay in contract.payments" :key="pay.id" class="em-card flex items-center gap-4">
        <div class="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
        <div class="flex-1 flex items-center gap-4">
          <span class="text-sm text-content-primary font-medium">{{ formatMoney(pay.amount) }}</span>
          <span class="text-xs text-content-muted">{{ formatDate(pay.paymentDate) }}</span>
          <span v-if="pay.paymentMethod" class="text-xs text-content-muted">{{ getLabel('PaymentMethod', pay.paymentMethod) || pay.paymentMethod }}</span>
          <span v-if="pay.remark" class="text-xs text-content-muted">{{ pay.remark }}</span>
        </div>
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deletePayment(pay.id)" />
      </div>
    </div>

    <FormModal v-if="showPaymentModal" v-model:open="showPaymentModal" title="登记收款" size="compact" :loading="paymentLoading">
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">收款金额 <span class="text-danger-500">*</span></label>
          <input v-model.number="paymentForm.amount" type="number" step="0.01" placeholder="0.00" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">收款日期 <span class="text-danger-500">*</span></label>
          <input v-model="paymentForm.paymentDate" type="date" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">付款方式</label>
          <EnumSelect v-model="paymentForm.paymentMethod" dict="PaymentMethod" placeholder="选择方式" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">关联收款计划</label>
          <select v-model="paymentForm.paymentPlanId" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15">
            <option value="">不关联</option>
            <option v-for="plan in contract.paymentPlans" :key="plan.id" :value="plan.id">
              {{ formatMoney(plan.amount) }} - {{ plan.planDate }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">备注</label>
          <input v-model="paymentForm.remark" type="text" placeholder="备注信息..." class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">付款凭证</label>
          <FileUpload
            :upload-url="`/api/attachments?source=payment`"
            accept=".pdf,.png,.jpg,.jpeg"
            @uploaded="(f: any) => { paymentForm.attachmentPath = f.filePath || f.path || '' }"
          />
        </div>
      </div>
      <template #footer>
        <UButton color="primary" :loading="paymentLoading" @click="addPayment">登记</UButton>
        <UButton variant="ghost" color="neutral" @click="showPaymentModal = false">算了</UButton>
      </template>
    </FormModal>
  </div>
</template>
