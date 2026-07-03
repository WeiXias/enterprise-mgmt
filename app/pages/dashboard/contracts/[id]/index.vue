<script setup lang="ts">
import { sanitizeHtml } from '~/utils/sanitize'
import { renderContractContent } from '~/utils/sanitize'

definePageMeta({ layout: 'dashboard', title: '合同详情', middleware: ['auth'], watermark: true })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const { can } = usePermission()
const contractId = route.params.id as string

// 合同数据
const contract = ref<any>(null)
const loading = ref(true)

// 提供给子组件的共享数据
provide('contract', contract)
provide('contractName', computed(() => contract.value?.name || ''))

// 转交
const showTransferModal = ref(false)
const transferToUserId = ref('')
const transferReason = ref('')
const transferLoading = ref(false)
const userOptions = ref<{ id: string; name: string; username: string; role: string }[]>([])
const userSearchKeyword = ref('')
const userSearchLoading = ref(false)

async function loadUsers() {
  userSearchLoading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (userSearchKeyword.value) params.keyword = userSearchKeyword.value
    const res = await $api('/api/users', { params }) as any
    if (res?.code === 0) { userOptions.value = res.data.items || [] }
  } catch { /* ignore */ }
  finally { userSearchLoading.value = false }
}
let userSearchTimer: any = null
function onUserSearch() { clearTimeout(userSearchTimer); userSearchTimer = setTimeout(loadUsers, 250) }

async function handleTransfer() {
  if (!transferToUserId.value) { toast.add({ title: '新归属人还没选呢', color: 'warning' }); return }
  transferLoading.value = true
  try {
    const body: any = { contractIds: [contractId], toUserId: transferToUserId.value }
    if (transferReason.value) body.reason = transferReason.value
    const res = await $api('/api/contracts/batch-transfer', { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '转交完成', color: 'success' })
      showTransferModal.value = false
      fetchContract()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '转交失败', color: 'error' }) }
  finally { transferLoading.value = false }
}

// 附件
const pdfLoading = ref(false)
async function handleExportPdf() {
  pdfLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/export-pdf`, { method: 'POST' }) as any
    if (res?.code === 0 && res.data?.pdfUrl) { window.open(res.data.pdfUrl, '_blank') }
    else { toast.add({ title: '导出出了点问题', color: 'error' }) }
  } catch (err: any) { toast.add({ title: err?.data?.message || '导出失败', color: 'error' }) }
  finally { pdfLoading.value = false }
}

// 编辑合同
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 审批/驳回
const showApproveModal = ref(false)
const approveLoading = ref(false)
const showRejectModal = ref(false)
const rejectLoading = ref(false)
const rejectReason = ref('')

// 删除
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

// 收款计划展开
const showPlans = ref(false)
// 收款记录展开
const showPayments = ref(false)
// 发票展开
const showInvoices = ref(false)
// 关联合同展开
const showRelatedContracts = ref(false)
// 关联采购单展开
const showRelatedPOs = ref(false)

// 状态配置
const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-surface-hover text-content-secondary' },
  approved: { label: '已审批', color: 'bg-brand-50 text-brand-600' },
  in_progress: { label: '执行中', color: 'bg-brand-50 text-brand-700' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  terminated: { label: '已终止', color: 'bg-danger-50 text-danger-600' },
}

function formatMoney(v: any) {
  const n = Number(v)
  if (isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function formatDate(v: any) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

async function fetchContract() {
  loading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}`) as any
    if (res?.code === 0) { contract.value = res.data }
  } catch (err: any) {
    if (err?.statusCode === 404) {
      toast.add({ title: '合同不存在', color: 'error' })
      router.push('/dashboard/contracts')
    } else {
      toast.add({ title: '加载出了点问题', color: 'error' })
    }
  } finally { loading.value = false }
}

function openEditModal() {
  editForm.value = {
    name: contract.value.name,
    totalAmount: contract.value.totalAmount,
    partyA: contract.value.partyA || '',
    partyB: contract.value.partyB || '',
    paymentMethod: contract.value.paymentMethod || '',
    startDate: contract.value.startDate || '',
    endDate: contract.value.endDate || '',
    remark: contract.value.remark || '',
  }
  showEditModal.value = true
}

async function handleEdit() {
  editLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}`, { method: 'PUT', body: editForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: contract.value.status !== 'draft' ? '合同已审批，修改信息已保存' : '已保存', color: 'success' })
      showEditModal.value = false
      fetchContract()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { editLoading.value = false }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '合同已删除', color: 'success' }); router.push('/dashboard/contracts') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

async function handleApprove() {
  approveLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/approve`, { method: 'POST' }) as any
    if (res?.code === 0) { toast.add({ title: '审批通过了！', color: 'success' }); showApproveModal.value = false; fetchContract() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '审批失败', color: 'error' }) }
  finally { approveLoading.value = false }
}

async function handleReject() {
  if (!rejectReason.value) { toast.add({ title: '驳回原因还没填呢', color: 'warning' }); return }
  rejectLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/reject`, { method: 'POST', body: { reason: rejectReason.value } }) as any
    if (res?.code === 0) { toast.add({ title: '已驳回', color: 'success' }); showRejectModal.value = false; rejectReason.value = ''; fetchContract() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '驳回失败', color: 'error' }) }
  finally { rejectLoading.value = false }
}

// 附件
const showAttachmentModal = ref(false)
const attachmentFiles = ref<any[]>([])
const attachmentLoading = ref(false)

async function fetchAttachments() {
  attachmentLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/attachments`) as any
    if (res?.code === 0) attachmentFiles.value = res.data?.items || res.data || []
  } catch { /* ignore */ }
  finally { attachmentLoading.value = false }
}

async function handleDeleteAttachment(file: any) {
  try {
    await $api(`/api/attachments/${file.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    fetchAttachments()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

// 生命周期阶段
const lifecycleStages = computed(() => {
  if (!contract.value) return []
  const stages = [
    { label: '创建', date: contract.value.createdAt, active: true },
    { label: '审批', date: contract.value.approvedAt, active: !!contract.value.approvedAt },
    { label: '执行中', date: null, active: contract.value.status === 'in_progress' || contract.value.status === 'completed' },
    { label: contract.value.status === 'completed' ? '已完成' : contract.value.status === 'terminated' ? '已终止' : '进行中', date: contract.value.status === 'completed' || contract.value.status === 'terminated' ? contract.value.updatedAt : null, active: contract.value.status === 'completed' || contract.value.status === 'terminated' },
  ]
  return stages
})

function stageClass(stage: any, index: number) {
  if (stage.active) return index === lifecycleStages.value.length - 1 && contract.value.status === 'terminated' ? 'bg-danger-400' : 'bg-teal-400'
  return 'bg-surface-muted'
}

onMounted(() => {
  fetchContract()
  fetchAttachments()
})
</script>

<template>
  <div v-if="loading" class="py-4"><DetailSkeleton /></div>
  <div v-else-if="!contract" class="text-center py-12 text-content-muted">合同不存在</div>
  <div v-else>
    <!-- 顶部面包屑 + 操作 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/dashboard/contracts" class="text-content-muted hover:text-brand-600 transition-colors">合同</NuxtLink>
        <span class="text-content-muted">/</span>
        <span class="text-content-primary font-medium">{{ contract.name }}</span>
      </div>
      <div class="flex gap-2">
        <UButton v-if="contract.status === 'draft'" icon="i-lucide-check-circle" color="primary" size="sm" @click="showApproveModal = true">审批通过</UButton>
        <UButton v-if="contract.status === 'approved'" icon="i-lucide-x-circle" color="warning" size="sm" @click="rejectReason = ''; showRejectModal = true">驳回</UButton>
        <!-- 编辑按钮：所有状态都显示 -->
        <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="sm" @click="openEditModal">编辑</UButton>
        <UButton v-if="contract.status === 'draft'" icon="i-lucide-trash-2" variant="ghost" color="error" size="sm" @click="showDeleteModal = true" />
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/contracts')">返回</UButton>
      </div>
    </div>

    <!-- 合同信息卡片 -->
    <div class="em-card mb-6">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-file-text" class="w-6 h-6 text-teal-600" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-base font-medium text-content-inverse">{{ contract.name }}</h2>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full font-medium', contract.type === 'purchase' ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600']">
              {{ contract.type === 'purchase' ? '采购' : '销售' }}
            </span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[contract.status]?.color || '']">
              {{ statusConfig[contract.status]?.label || contract.status }}
            </span>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
            <span v-if="contract.code" class="text-content-muted font-mono text-[11px]">{{ contract.code }}</span>
            <span v-if="contract.customer?.name">
              <UIcon name="i-lucide-building-2" class="w-3 h-3 inline mr-0.5" />
              {{ contract.customer.name }}
            </span>
            <span v-if="contract.supplier?.name">
              <UIcon name="i-lucide-truck" class="w-3 h-3 inline mr-0.5" />
              {{ contract.supplier.name }}
            </span>
            <span :class="['font-medium', contract.direction === 'expense' ? 'text-orange-500' : 'text-teal-600']">{{ formatMoney(contract.totalAmount) }}</span>
            <span>
              <UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />
              {{ contract.startDate || '-' }} 至 {{ contract.endDate || '-' }}
            </span>
          </div>
          <div v-if="contract.partyA || contract.partyB" class="flex gap-4 mt-1 text-xs text-content-muted">
            <span v-if="contract.partyA">甲方：{{ contract.partyA }}</span>
            <span v-if="contract.partyB">乙方：{{ contract.partyB }}</span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span v-if="contract.owner?.name" class="text-xs text-brand-600">
              <UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ contract.owner.name }}
            </span>
            <UButton v-if="can('contract:transfer')" icon="i-lucide-arrow-left-right" variant="ghost" color="warning" size="xs" class="text-xs" @click="showTransferModal = true; loadUsers()">转交</UButton>
          </div>

          <!-- 回款进度 -->
          <div class="mt-3 pt-3 border-t border-line-light">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-content-muted">已收款 {{ formatMoney(contract.receivedAmount || 0) }} / {{ formatMoney(contract.totalAmount) }}</span>
              <span class="text-content-muted">{{ contract.totalAmount > 0 ? Math.round((contract.receivedAmount || 0) / contract.totalAmount * 100) : 0 }}%</span>
            </div>
            <div class="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div class="h-full bg-teal-400 rounded-full transition-all" :style="{ width: (contract.totalAmount > 0 ? Math.round((contract.receivedAmount || 0) / contract.totalAmount * 100) : 0) + '%' }" />
            </div>
          </div>
        </div>
      </div>

      <!-- 审批信息 -->
      <div v-if="contract.approvedBy" class="mt-3 pt-3 border-t border-line-light flex gap-4 text-xs text-content-muted">
        <span>审批人：{{ contract.approvedBy?.name }}</span>
        <span v-if="contract.approvedAt">审批时间：{{ formatDate(contract.approvedAt) }}</span>
      </div>
      <div v-if="contract.rejectReason" class="mt-2 text-xs text-danger-600">驳回原因：{{ contract.rejectReason }}</div>
      <p v-if="contract.remark" class="text-sm text-content-muted mt-3 pt-3 border-t border-line-light">{{ contract.remark }}</p>
    </div>

    <!-- 合同生命周期时间轴 -->
    <div class="em-card mb-6">
      <h3 class="text-sm font-medium text-content-primary mb-3">合同阶段</h3>
      <div class="flex items-center gap-0">
        <template v-for="(stage, idx) in lifecycleStages" :key="stage.label">
          <div class="flex items-center gap-2 flex-shrink-0">
            <div :class="['w-3 h-3 rounded-full', stageClass(stage, idx)]" />
            <div>
              <div class="text-xs font-medium" :class="stage.active ? 'text-content-primary' : 'text-content-muted'">{{ stage.label }}</div>
              <div v-if="stage.date" class="text-[10px] text-content-muted">{{ formatDate(stage.date) }}</div>
            </div>
          </div>
          <div v-if="idx < lifecycleStages.length - 1" :class="['flex-1 h-px mx-2', lifecycleStages[idx + 1].active ? 'bg-teal-300' : 'bg-surface-muted']" />
        </template>
      </div>
    </div>

    <!-- 产品明细 -->
    <div class="em-card mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-content-primary">产品明细</h3>
        <NuxtLink :to="`/dashboard/contracts/${contractId}/products`" class="text-xs text-brand-600 hover:underline">管理产品</NuxtLink>
      </div>
      <div v-if="!contract.products?.length" class="text-center py-6 text-xs text-content-muted">还没有关联产品</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-line-light text-content-muted">
              <th class="text-left py-2 pr-4 font-normal">产品</th>
              <th class="text-left py-2 pr-4 font-normal hidden sm:table-cell">分类</th>
              <th class="text-right py-2 pr-4 font-normal">数量</th>
              <th class="text-right py-2 pr-4 font-normal">单价</th>
              <th class="text-right py-2 pr-4 font-normal hidden sm:table-cell">税率</th>
              <th class="text-right py-2 pr-4 font-normal hidden sm:table-cell">折扣</th>
              <th class="text-right py-2 font-normal">小计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in contract.products" :key="p.id" class="border-b border-line-light/50">
              <td class="py-2 pr-4">
                <div class="text-content-primary">{{ p.productName }}</div>
                <div class="text-content-muted text-[10px]">{{ p.productCode }}</div>
              </td>
              <td class="py-2 pr-4 text-content-muted hidden sm:table-cell">{{ p.categoryName || '-' }}</td>
              <td class="py-2 pr-4 text-right">{{ p.quantity }}</td>
              <td class="py-2 pr-4 text-right">{{ formatMoney(p.unitPrice) }}</td>
              <td class="py-2 pr-4 text-right hidden sm:table-cell">{{ p.taxRate ? p.taxRate + '%' : '-' }}</td>
              <td class="py-2 pr-4 text-right hidden sm:table-cell">{{ ((p.discount || 1) * 100).toFixed(0) }}%</td>
              <td class="py-2 text-right font-medium text-content-primary">{{ formatMoney(p.quantity * p.unitPrice * (p.discount || 1)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="contract.products?.length" class="mt-2 pt-2 border-t border-line-light flex justify-end">
        <span class="text-sm font-medium text-content-primary">合计 {{ formatMoney(contract.products?.reduce((s: number, p: any) => s + p.quantity * p.unitPrice * (p.discount || 1), 0) || 0) }}</span>
      </div>
    </div>

    <!-- 合同全景：收款计划 / 收款记录 / 发票 / 关联合同 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <!-- 收款计划 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-content-primary">收款计划 ({{ contract.paymentPlans?.length || 0 }})</h3>
          <button class="text-xs text-brand-600 hover:underline" @click="showPlans = !showPlans">{{ showPlans ? '收起' : '展开' }}</button>
        </div>
        <div v-if="showPlans && contract.paymentPlans?.length" class="space-y-1">
          <div v-for="plan in contract.paymentPlans.slice(0, 3)" :key="plan.id" class="flex items-center justify-between text-xs py-1 border-b border-line-light/50 last:border-0">
            <span class="text-content-muted">{{ plan.planDate?.slice(0, 10) }}</span>
            <span class="font-medium">{{ formatMoney(plan.amount) }}</span>
            <span :class="plan.status === 'paid' ? 'text-teal-500' : plan.status === 'overdue' ? 'text-danger-500' : 'text-content-muted'">
              {{ plan.status === 'paid' ? '已付' : plan.status === 'overdue' ? '逾期' : '待付' }}
            </span>
          </div>
          <NuxtLink v-if="contract.paymentPlans?.length > 3" :to="`/dashboard/contracts/${contractId}/plans`" class="text-xs text-brand-600 hover:underline block mt-1">查看全部 {{ contract.paymentPlans.length }} 条</NuxtLink>
        </div>
        <div v-else-if="!contract.paymentPlans?.length" class="text-xs text-content-muted">还没有收款计划</div>
      </div>

      <!-- 收款记录 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-content-primary">收款记录 ({{ contract.payments?.length || 0 }})</h3>
          <button class="text-xs text-brand-600 hover:underline" @click="showPayments = !showPayments">{{ showPayments ? '收起' : '展开' }}</button>
        </div>
        <div v-if="showPayments && contract.payments?.length" class="space-y-1">
          <div v-for="pmt in contract.payments.slice(0, 3)" :key="pmt.id" class="flex items-center justify-between text-xs py-1 border-b border-line-light/50 last:border-0">
            <span class="text-content-muted">{{ pmt.paymentDate?.slice(0, 10) }}</span>
            <span class="font-medium text-teal-600">{{ formatMoney(pmt.amount) }}</span>
            <span class="text-content-muted">{{ pmt.paymentMethod }}</span>
          </div>
          <NuxtLink v-if="contract.payments?.length > 3" :to="`/dashboard/contracts/${contractId}/payments`" class="text-xs text-brand-600 hover:underline block mt-1">查看全部 {{ contract.payments.length }} 条</NuxtLink>
        </div>
        <div v-else-if="!contract.payments?.length" class="text-xs text-content-muted">还没有收款记录</div>
        <NuxtLink v-if="contract.payments?.length" :to="`/dashboard/contracts/${contractId}/payments`" class="text-xs text-brand-600 hover:underline mt-1 inline-block">登记收款</NuxtLink>
      </div>

      <!-- 发票 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-content-primary">发票 ({{ contract.invoices?.length || 0 }})</h3>
          <button class="text-xs text-brand-600 hover:underline" @click="showInvoices = !showInvoices">{{ showInvoices ? '收起' : '展开' }}</button>
        </div>
        <div v-if="showInvoices && contract.invoices?.length" class="space-y-1">
          <div v-for="inv in contract.invoices.slice(0, 3)" :key="inv.id" class="flex items-center justify-between text-xs py-1 border-b border-line-light/50 last:border-0">
            <NuxtLink :to="`/dashboard/finance/invoices/${inv.id}`" class="text-brand-600 hover:underline">{{ inv.invoiceNo }}</NuxtLink>
            <span class="font-medium">{{ formatMoney(inv.amount) }}</span>
            <span :class="inv.status === 'issued' ? 'text-teal-500' : inv.status === 'voided' ? 'text-danger-500' : 'text-content-muted'">
              {{ inv.status === 'issued' ? '已开票' : inv.status === 'voided' ? '已作废' : '待开票' }}
            </span>
          </div>
          <NuxtLink v-if="contract.invoices?.length > 3" :to="`/dashboard/contracts/${contractId}/invoices`" class="text-xs text-brand-600 hover:underline block mt-1">查看全部 {{ contract.invoices.length }} 条</NuxtLink>
        </div>
        <div v-else-if="!contract.invoices?.length" class="text-xs text-content-muted">还没有发票</div>
        <NuxtLink :to="`/dashboard/finance/invoices?edit=new&contractId=${contractId}`" class="text-xs text-brand-600 hover:underline mt-1 inline-block">新增发票</NuxtLink>
      </div>

      <!-- 关联合同 -->
      <div class="em-card col-span-full md:col-span-1" v-if="contract.relatedContracts?.length || contract.relatedPurchaseOrders?.length">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-content-primary">关联合同 ({{ (contract.relatedContracts?.length || 0) + (contract.relatedPurchaseOrders?.length || 0) }})</h3>
          <button class="text-xs text-brand-600 hover:underline" @click="showRelatedContracts = !showRelatedContracts">{{ showRelatedContracts ? '收起' : '展开' }}</button>
        </div>
        <div v-if="showRelatedContracts" class="space-y-1">
          <!-- 销售合同 -->
          <template v-if="contract.relatedContracts?.length">
            <div class="text-[10px] text-content-muted mb-1">关联销售合同</div>
            <div v-for="rc in contract.relatedContracts.slice(0, 3)" :key="rc.id" class="flex items-center justify-between text-xs py-1 border-b border-line-light/50 last:border-0">
              <NuxtLink :to="`/dashboard/contracts/${rc.id}`" class="text-brand-600 hover:underline truncate max-w-[160px]">{{ rc.name }}</NuxtLink>
              <span class="font-medium">{{ formatMoney(rc.totalAmount) }}</span>
              <StatusBadge :value="rc.status" enum-type="contractStatus" />
            </div>
          </template>
          <!-- 采购合同 -->
          <template v-if="contract.relatedPurchaseOrders?.length">
            <div class="text-[10px] text-content-muted mb-1 mt-2">关联采购单</div>
            <div v-for="po in contract.relatedPurchaseOrders.slice(0, 3)" :key="po.id" class="flex items-center justify-between text-xs py-1 border-b border-line-light/50 last:border-0">
              <NuxtLink :to="`/dashboard/purchases/${po.id}`" class="text-brand-600 hover:underline">{{ po.code }}</NuxtLink>
              <span class="text-content-muted">{{ po.supplierName || '-' }}</span>
              <span class="font-medium">{{ formatMoney(po.totalAmount) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 合同电子版 -->
    <div class="em-card mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-content-primary">合同电子版 ({{ attachmentFiles.length }})</h3>
        <span class="text-xs text-content-muted">点击文件预览，拖拽上传</span>
      </div>
      <FileUpload
        source="attachment"
        :upload-url="`/api/contracts/${contractId}/attachments`"
        :files="attachmentFiles.map((f: any) => ({ id: f.id, fileName: f.fileName, fileSize: f.fileSize }))"
        :loading="attachmentLoading"
        accept=".pdf"
        :max-size="20"
        @uploaded="fetchAttachments()"
        @delete="(f: any) => handleDeleteAttachment(f)"
      />
    </div>

    <!-- 关联项目 -->
    <div v-if="contract.projects?.length" class="mt-6 em-card">
      <h3 class="text-sm font-medium text-content-primary mb-3">关联项目</h3>
      <div class="space-y-2">
        <NuxtLink v-for="p in contract.projects" :key="p.id" :to="`/dashboard/projects/${p.id}`" class="flex items-center justify-between p-2 rounded-md hover:bg-line-light/40 transition-colors">
          <span class="text-sm text-content-primary">{{ p.name }}</span>
          <span class="text-xs text-content-muted">{{ p.status }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑合同" :loading="editLoading" @confirm="handleEdit">
      <form class="space-y-5" @submit.prevent="handleEdit">
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3"><span class="w-0.5 h-3.5 rounded-full bg-brand-400" /><span class="text-sm font-medium text-brand-700">基本信息</span></div>
          <div class="space-y-3">
            <div><label class="block text-sm text-content-secondary mb-1">合同名称 <span class="text-danger-500">*</span></label><input v-model="editForm.name" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">合同金额</label><input v-model.number="editForm.totalAmount" type="number" step="0.01" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
          </div>
        </div>
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3"><span class="w-0.5 h-3.5 rounded-full bg-brand-400" /><span class="text-sm font-medium text-brand-700">签约方</span></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">甲方</label><input v-model="editForm.partyA" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">乙方</label><input v-model="editForm.partyB" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
          </div>
        </div>
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3"><span class="w-0.5 h-3.5 rounded-full bg-brand-400" /><span class="text-sm font-medium text-brand-700">合同周期</span></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">开始日期</label><input v-model="editForm.startDate" type="date" class="w-full input-base focus-ring" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">结束日期</label><input v-model="editForm.endDate" type="date" class="w-full input-base focus-ring" /></div>
          </div>
        </div>
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3"><span class="w-0.5 h-3.5 rounded-full bg-brand-400" /><span class="text-sm font-medium text-brand-700">其他</span></div>
          <div class="space-y-3">
            <div><label class="block text-sm text-content-secondary mb-1">付款方式</label><EnumSelect v-model="editForm.paymentMethod" dict="PaymentMethod" placeholder="选择方式" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">备注</label><textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 resize-none" /></div>
          </div>
        </div>
      </form>
    </FormModal>

    <!-- 审批弹窗 -->
    <ConfirmDialog v-if="showApproveModal" v-model:open="showApproveModal" title="确认审批" :message="`确定要审批通过合同「${contract.name}」吗？`" confirm-text="确认审批" :loading="approveLoading" @confirm="handleApprove" />

    <!-- 驳回弹窗 -->
    <FormModal v-if="showRejectModal" v-model:open="showRejectModal" title="驳回合同" :loading="rejectLoading" size="compact" @confirm="handleReject">
      <div class="space-y-3"><p class="text-sm text-content-secondary">请填写驳回原因：</p><textarea v-model="rejectReason" rows="3" placeholder="写明驳回原因..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 resize-none" /></div>
      <template #footer><UButton color="warning" :loading="rejectLoading" @click="handleReject">确认驳回</UButton><UButton variant="ghost" color="neutral" @click="showRejectModal = false">算了</UButton></template>
    </FormModal>

    <!-- 删除弹窗 -->
    <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除" :message="`确定要删除合同「${contract.name}」吗？删了就找不回来。`" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" />

    <!-- 转交弹窗 -->
    <FormModal v-if="showTransferModal" v-model:open="showTransferModal" title="转交合同" size="compact" :loading="transferLoading">
      <div class="space-y-4">
        <div><label class="block text-sm text-content-secondary mb-2">新归属人 <span class="text-danger-500">*</span></label>
          <div class="relative"><UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" /><input v-model="userSearchKeyword" type="text" placeholder="搜索同事姓名..." class="w-full pl-8 input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" @input="onUserSearch" @focus="loadUsers" /></div>
          <div v-if="userOptions.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-line rounded-md divide-y divide-line-light">
            <button v-for="u in userOptions" :key="u.id" :class="['w-full text-left px-3 py-2.5 text-sm hover:bg-brand-50 transition-colors flex items-center gap-2', transferToUserId === u.id ? 'bg-brand-50' : '']" @click="transferToUserId = u.id">
              <span class="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0"><span class="text-brand-700 text-[10px]">{{ u.name?.charAt(0) }}</span></span>
              <span class="text-content-primary">{{ u.name }}</span><span class="text-xs text-content-muted ml-auto">{{ u.username }}</span>
              <UIcon v-if="transferToUserId === u.id" name="i-lucide-check" class="w-4 h-4 text-brand-500 ml-1" />
            </button>
          </div>
          <div v-else-if="userSearchLoading" class="mt-2 p-2 text-xs text-content-muted">加载中...</div>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">转交原因</label><textarea v-model="transferReason" rows="2" placeholder="可选，记录转交原因..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 resize-none" /></div>
      </div>
      <template #footer><UButton color="primary" :loading="transferLoading" :disabled="!transferToUserId" @click="handleTransfer">确认转交</UButton><UButton variant="ghost" color="neutral" @click="showTransferModal = false">算了</UButton></template>
    </FormModal>
  </div>
</template>
