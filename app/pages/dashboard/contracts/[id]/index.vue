<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '合同详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const authStore = useAuthStore()
const contractId = route.params.id as string

function isAdminOrManager() {
  const role = authStore.user?.role
  return role === 'admin' || role === 'sales_manager'
}

// 合同数据
const contract = ref<any>(null)
const loading = ref(true)

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

// Tab
const activeTab = ref('0')

// PDF 导出
const pdfLoading = ref(false)
async function handleExportPdf() {
  pdfLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/export-pdf`, { method: 'POST' }) as any
    if (res?.code === 0 && res.data?.pdfUrl) {
      window.open(res.data.pdfUrl, '_blank')
    } else {
      toast.add({ title: '导出出了点问题', color: 'error' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '导出失败', color: 'error' })
  } finally {
    pdfLoading.value = false
  }
}

// 编辑合同
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 添加收款计划
const showPlanModal = ref(false)
const planLoading = ref(false)
const planForm = ref({ amount: 0, planDate: '', remark: '' })

// 登记收款
const showPaymentModal = ref(false)
const paymentLoading = ref(false)
const paymentForm = ref({ amount: 0, paymentDate: '', paymentMethod: '', paymentPlanId: '', remark: '' })

// 审批/驳回
const showApproveModal = ref(false)
const approveLoading = ref(false)
const showRejectModal = ref(false)
const rejectLoading = ref(false)
const rejectReason = ref('')

// 删除
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

// 状态配置
const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-stone-100 text-stone-600' },
  approved: { label: '已审批', color: 'bg-blue-50 text-blue-600' },
  in_progress: { label: '执行中', color: 'bg-amber-50 text-amber-700' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  terminated: { label: '已终止', color: 'bg-red-50 text-red-600' },
}

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: '银行转账', check: '支票', cash: '现金',
  alipay: '支付宝', wechat_pay: '微信支付', other: '其他',
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
    if (res?.code === 0) {
      contract.value = res.data
      if (!contract.value.parentContractId) fetchSubcontracts()
    }
  } catch (err: any) {
    if (err?.statusCode === 404) {
      toast.add({ title: '合同不存在', color: 'error' })
      router.push('/dashboard/contracts')
    } else {
      toast.add({ title: '加载出了点问题', color: 'error' })
    }
  } finally {
    loading.value = false
  }
}

// 产品明细编辑
const showProductModal = ref(false); const productLoading = ref(false); const editProducts = ref<any[]>([]); const allProducts = ref<any[]>([])
async function openProductModal() {
  try { const res = await $api('/api/products', { params: { pageSize: 200 } }) as any; if (res?.code === 0) allProducts.value = res.data.items || [] } catch {}
  editProducts.value = (contract.value.products || []).map((p: any) => ({ productId: p.productId, quantity: p.quantity || 1, unitPrice: p.unitPrice || 0, discount: (p.discount ?? 1) * 100 }))
  showProductModal.value = true
}
function addProductRow() { editProducts.value.push({ productId: '', quantity: 1, unitPrice: 0, discount: 100 }) }
function removeProductRow(i: number) { editProducts.value.splice(i, 1) }
async function handleSaveProducts() {
  productLoading.value = true
  try {
    const items = editProducts.value.map(p => ({ productId: p.productId, quantity: p.quantity, unitPrice: p.unitPrice, discount: (p.discount || 100) / 100 }))
    const totalAmount = items.reduce((s: number, p: any) => s + p.quantity * p.unitPrice * p.discount, 0)
    await $api(`/api/contracts/${contractId}`, { method: 'PUT', body: { products: items, totalAmount } })
    toast.add({ title: '产品明细已更新', color: 'success' }); showProductModal.value = false; fetchContract()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { productLoading.value = false }
}

// 收款计划编辑
const editPlanId = ref<string | null>(null)
function openEditPlan(plan: any) { editPlanId.value = plan.id; planForm.value = { amount: plan.amount, planDate: plan.planDate?.slice(0, 10) || '', remark: plan.remark || '' }; showPlanModal.value = true }

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
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchContract()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    editLoading.value = false
  }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '合同已删除', color: 'success' })
      showDeleteModal.value = false
      router.push('/dashboard/contracts')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

async function handleApprove() {
  approveLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/approve`, { method: 'POST' }) as any
    if (res?.code === 0) {
      toast.add({ title: '审批通过了！', color: 'success' })
      showApproveModal.value = false
      fetchContract()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '审批失败', color: 'error' })
  } finally {
    approveLoading.value = false
  }
}

async function handleReject() {
  if (!rejectReason.value) {
    toast.add({ title: '驳回原因还没填呢', color: 'warning' })
    return
  }
  rejectLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/reject`, {
      method: 'POST',
      body: { reason: rejectReason.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已驳回', color: 'success' })
      showRejectModal.value = false
      rejectReason.value = ''
      fetchContract()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '驳回失败', color: 'error' })
  } finally {
    rejectLoading.value = false
  }
}

async function handleAddPlan() {
  if (!planForm.value.amount || !planForm.value.planDate) {
    toast.add({ title: '金额和日期都得填', color: 'warning' })
    return
  }
  planLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/payment-plans`, {
      method: 'POST',
      body: planForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '收款计划已添加', color: 'success' })
      showPlanModal.value = false
      planForm.value = { amount: 0, planDate: '', remark: '' }
      fetchContract()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '添加失败', color: 'error' })
  } finally {
    planLoading.value = false
  }
}

async function handleSavePlan() {
  if (!planForm.value.amount || !planForm.value.planDate) { toast.add({ title: '金额和日期都得填', color: 'warning' }); return }
  planLoading.value = true
  try {
    if (editPlanId.value) { await $api(`/api/payment-plans/${editPlanId.value}`, { method: 'PUT', body: planForm.value }) }
    else { await $api(`/api/contracts/${contractId}/payment-plans`, { method: 'POST', body: planForm.value }) }
    toast.add({ title: editPlanId.value ? '收款计划已更新' : '收款计划已添加', color: 'success' })
    showPlanModal.value = false; editPlanId.value = null; planForm.value = { amount: 0, planDate: '', remark: '' }; fetchContract()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { planLoading.value = false }
}

async function handleAddPayment() {
  if (!paymentForm.value.amount || !paymentForm.value.paymentDate) {
    toast.add({ title: '金额和日期都得填', color: 'warning' })
    return
  }
  paymentLoading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}/payments`, {
      method: 'POST',
      body: paymentForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '收款已登记', color: 'success' })
      showPaymentModal.value = false
      paymentForm.value = { amount: 0, paymentDate: '', paymentMethod: '', paymentPlanId: '', remark: '' }
      fetchContract()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '登记失败', color: 'error' })
  } finally {
    paymentLoading.value = false
  }
}

async function handleDeletePlan(planId: string) {
  try {
    const res = await $api(`/api/payment-plans/${planId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '收款计划已删除', color: 'success' })
      fetchContract()
    }
  } catch (err: any) {
    toast.add({ title: '删除失败', color: 'error' })
  }
}

async function handleDeletePayment(paymentId: string) {
  try {
    const res = await $api(`/api/payments/${paymentId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '收款记录已删除', color: 'success' })
      fetchContract()
    }
  } catch (err: any) {
    toast.add({ title: '删除失败', color: 'error' })
  }
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
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
}

onMounted(() => {
  fetchContract()
  fetchAttachments()
})

// 分包管理
const subcontracts = ref<any[]>([])
const showSubcontractModal = ref(false); const subLoading = ref(false)
const subForm = ref({ name: '', totalAmount: 0, subcontractPartyId: '', taxRate: 0.05, serviceFee: 0, items: [] as any[] })
const subParties = ref<any[]>([]); const editSubId = ref<string | null>(null)
const subProductOptions = ref<any[]>([])

async function fetchSubcontracts() {
  try {
    const res = await $api(`/api/contracts/${contractId}/subcontracts`) as any
    if (res?.code === 0) subcontracts.value = res.data || []
  } catch { /* ignore */ }
}

async function openSubcontractModal() {
  try {
    const [partiesRes, prodRes] = await Promise.all([$api('/api/subcontract-parties') as any, $api('/api/products', { params: { pageSize: 200 } }) as any])
    if (partiesRes?.code === 0) subParties.value = partiesRes.data || []
    if (prodRes?.code === 0) subProductOptions.value = prodRes.data.items || []
  } catch {}
  subForm.value = { name: '', totalAmount: 0, subcontractPartyId: '', taxRate: 0.05, serviceFee: 0, items: [] }; editSubId.value = null; showSubcontractModal.value = true
}
function openEditSubcontract(sc: any) {
  subForm.value = { name: sc.name, totalAmount: sc.totalAmount, subcontractPartyId: sc.subcontractPartyId || '', taxRate: sc.taxRate || 0.05, serviceFee: sc.serviceFee || 0, items: [] }
  editSubId.value = sc.id; showSubcontractModal.value = true
}

async function handleSaveSubcontract() {
  if (!subForm.value.name || !subForm.value.totalAmount) { toast.add({ title: '名称和金额还没填呢', color: 'warning' }); return }
  subLoading.value = true
  try {
    if (editSubId.value) {
      await $api(`/api/subcontracts/${editSubId.value}`, { method: 'PUT', body: subForm.value })
    } else {
      await $api(`/api/contracts/${contractId}/subcontracts`, { method: 'POST', body: subForm.value })
    }
    toast.add({ title: '已保存', color: 'success' }); showSubcontractModal.value = false; fetchSubcontracts()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { subLoading.value = false }
}

async function deleteSubcontract(sc: any) {
  if (!confirm('确定要删除分包合同吗？')) return
  try {
    await $api(`/api/subcontracts/${sc.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' }); fetchSubcontracts()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
  <div v-else-if="!contract" class="text-center py-12 text-stone-400">合同不存在</div>
  <div v-else>
    <!-- 顶部面包屑 + 操作 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/dashboard/contracts" class="text-stone-400 hover:text-amber-600 transition-colors">合同</NuxtLink>
        <span class="text-stone-300">/</span>
        <span class="text-stone-700">{{ contract.name }}</span>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="contract.status === 'draft'"
          icon="i-lucide-check-circle"
          color="primary"
          size="sm"
          @click="showApproveModal = true"
        >审批通过</UButton>
        <UButton
          v-if="contract.status === 'approved'"
          icon="i-lucide-x-circle"
          color="warning"
          size="sm"
          @click="rejectReason = ''; showRejectModal = true"
        >驳回</UButton>
        <UButton
          v-if="contract.status === 'draft'"
          icon="i-lucide-pen-line"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="openEditModal"
        >编辑</UButton>
        <UButton
          v-if="contract.status === 'draft'"
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="sm"
          @click="showDeleteModal = true"
        />
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/contracts')">返回</UButton>
        <UButton
          v-if="contract.status === 'draft'"
          icon="i-lucide-sparkles"
          variant="ghost"
          color="warning"
          size="sm"
          @click="activeTab = 'ai-review'"
        >AI 审核</UButton>
      </div>
    </div>

    <!-- 合同信息卡片 -->
    <div class="warm-card mb-6">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-file-text" class="w-6 h-6 text-teal-600" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-base font-medium text-stone-800">{{ contract.name }}</h2>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[contract.status]?.color || '']">
              {{ statusConfig[contract.status]?.label || contract.status }}
            </span>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
            <span v-if="contract.code" class="text-stone-500 font-mono text-[11px]">{{ contract.code }}</span>
            <span v-if="contract.customer?.name">
              <UIcon name="i-lucide-building-2" class="w-3 h-3 inline mr-0.5" />
              {{ contract.customer.name }}
            </span>
            <span class="font-medium">{{ formatMoney(contract.totalAmount) }}</span>
            <span>
              <UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />
              {{ contract.startDate || '-' }} 至 {{ contract.endDate || '-' }}
            </span>
          </div>
          <div v-if="contract.partyA || contract.partyB" class="flex gap-4 mt-1 text-xs text-stone-400">
            <span v-if="contract.partyA">甲方：{{ contract.partyA }}</span>
            <span v-if="contract.partyB">乙方：{{ contract.partyB }}</span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span v-if="contract.owner?.name" class="text-xs text-amber-600">
              <UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ contract.owner.name }}
            </span>
            <UButton
              v-if="isAdminOrManager()"
              icon="i-lucide-arrow-left-right"
              variant="ghost"
              color="warning"
              size="xs"
              class="text-xs"
              @click="showTransferModal = true; loadUsers()"
            >转交</UButton>
          </div>

          <!-- 回款进度 -->
          <div class="mt-3 pt-3 border-t border-stone-100">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-stone-500">已收款 {{ formatMoney(contract.receivedAmount || 0) }} / {{ formatMoney(contract.totalAmount) }}</span>
              <span class="text-stone-400">{{ contract.totalAmount > 0 ? Math.round((contract.receivedAmount || 0) / contract.totalAmount * 100) : 0 }}%</span>
            </div>
            <div class="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-teal-400 rounded-full transition-all"
                :style="{ width: (contract.totalAmount > 0 ? Math.round((contract.receivedAmount || 0) / contract.totalAmount * 100) : 0) + '%' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 审批信息 -->
      <div v-if="contract.approvedBy" class="mt-3 pt-3 border-t border-stone-100 flex gap-4 text-xs text-stone-400">
        <span>审批人：{{ contract.approvedBy?.name }}</span>
        <span v-if="contract.approvedAt">审批时间：{{ formatDate(contract.approvedAt) }}</span>
      </div>
      <div v-if="contract.rejectReason" class="mt-2 text-xs text-red-500">
        驳回原因：{{ contract.rejectReason }}
      </div>
      <p v-if="contract.remark" class="text-sm text-stone-500 mt-3 pt-3 border-t border-stone-100">{{ contract.remark }}</p>
    </div>

    <!-- Tab 区域 -->
    <UTabs :items="[
      { label: '合同正文', slot: 'content' },
      { label: '产品明细', slot: 'products' },
      { label: '收款计划', slot: 'plans' },
      { label: '收款记录', slot: 'payments' },
      { label: '附件', slot: 'attachments' },
      { label: '分包管理', slot: 'subcontracts' },
      { label: 'AI 审核', slot: 'ai-review' },
    ]" v-model="activeTab" :unmount-on-hide="false">
      <template #content>
        <div class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-stone-500">合同正文</span>
            <div class="flex items-center gap-2">
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" :to="`/dashboard/contracts/${contract.id}/edit`">编辑正文</UButton>
              <UButton icon="i-lucide-file-down" variant="ghost" color="primary" size="xs" :loading="pdfLoading" @click="handleExportPdf">导出 PDF</UButton>
            </div>
          </div>
          <div v-if="!contract.content" class="text-center py-12 text-stone-400">
            <p>还没起草正文</p>
            <UButton icon="i-lucide-pen-line" variant="ghost" color="primary" size="sm" class="mt-2" :to="`/dashboard/contracts/${contract.id}/edit`">点击编辑开始撰写</UButton>
          </div>
          <div v-else class="warm-card prose prose-sm max-w-none prose-stone prose-headings:text-stone-800 prose-p:text-stone-600" v-html="contract.content" />
        </div>
      </template>
      <template #products>
        <div class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-stone-500">产品明细 {{ contract.products?.length ? '(' + contract.products.length + ')' : '' }}</span>
            <UButton icon="i-lucide-pen-line" variant="ghost" color="primary" size="xs" @click="openProductModal">编辑</UButton>
          </div>
          <div v-if="!contract.products?.length" class="text-center py-8 text-stone-400 text-sm">暂无关联产品</div>
          <div v-else class="warm-card overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-stone-100 text-left text-xs text-stone-400">
                  <th class="py-2 px-4 font-normal">产品</th>
                  <th class="py-2 px-4 font-normal text-right">数量</th>
                  <th class="py-2 px-4 font-normal text-right">单价</th>
                  <th class="py-2 px-4 font-normal text-right">折扣</th>
                  <th class="py-2 px-4 font-normal text-right">小计</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in contract.products" :key="p.id" class="border-b border-stone-50">
                  <td class="py-2 px-4">
                    <div class="font-medium text-stone-700">{{ p.productName || '-' }}</div>
                    <div v-if="p.productCode" class="text-xs text-stone-400">{{ p.productCode }}</div>
                  </td>
                  <td class="py-2 px-4 text-right text-stone-600">{{ p.quantity }}</td>
                  <td class="py-2 px-4 text-right text-stone-600">{{ formatMoney(p.unitPrice) }}</td>
                  <td class="py-2 px-4 text-right text-stone-600">{{ (Number(p.discount || 1) * 100).toFixed(0) }}%</td>
                  <td class="py-2 px-4 text-right text-stone-700 font-medium">{{ formatMoney(p.quantity * p.unitPrice * (p.discount || 1)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <template #plans>
        <div class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-stone-500">收款计划列表</span>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="editPlanId = null; planForm = { amount: 0, planDate: '', remark: '' }; showPlanModal = true">添加计划</UButton>
          </div>
          <div v-if="!contract.paymentPlans?.length" class="text-center py-8 text-stone-400 text-sm">暂无收款计划</div>
          <div v-else class="space-y-2">
            <div
              v-for="plan in contract.paymentPlans"
              :key="plan.id"
              class="warm-card flex items-center gap-4"
            >
              <div
                :class="['w-2 h-2 rounded-full flex-shrink-0', {
                  'bg-stone-300': plan.status === 'pending',
                  'bg-teal-400': plan.status === 'paid',
                  'bg-red-400': plan.status === 'overdue',
                }]"
              />
              <div class="flex-1 flex items-center gap-4">
                <span class="text-sm text-stone-700 font-medium">{{ formatMoney(plan.amount) }}</span>
                <span class="text-xs text-stone-400">{{ plan.planDate }}</span>
                <span
                  :class="['text-[10px] px-1.5 py-0.5 rounded-full', {
                    'bg-stone-100 text-stone-500': plan.status === 'pending',
                    'bg-teal-50 text-teal-700': plan.status === 'paid',
                    'bg-red-50 text-red-600': plan.status === 'overdue',
                  }]"
                >{{ ({ pending: '待收款', paid: '已收款', overdue: '已逾期' } as Record<string, string>)[plan.status] || plan.status }}</span>
                <span v-if="plan.remark" class="text-xs text-stone-400">{{ plan.remark }}</span>
              </div>
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditPlan(plan)" />
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                @click="handleDeletePlan(plan.id)"
              />
            </div>
          </div>
        </div>
      </template>

      <template #payments>
        <div class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-stone-500">收款记录列表</span>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="paymentForm = { amount: 0, paymentDate: '', paymentMethod: '', paymentPlanId: '', remark: '' }; showPaymentModal = true">登记收款</UButton>
          </div>
          <div v-if="!contract.payments?.length" class="text-center py-8 text-stone-400 text-sm">暂无收款记录</div>
          <div v-else class="space-y-2">
            <div
              v-for="pay in contract.payments"
              :key="pay.id"
              class="warm-card flex items-center gap-4"
            >
              <div class="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
              <div class="flex-1 flex items-center gap-4">
                <span class="text-sm text-stone-700 font-medium">{{ formatMoney(pay.amount) }}</span>
                <span class="text-xs text-stone-400">{{ formatDate(pay.paymentDate) }}</span>
                <span v-if="pay.paymentMethod" class="text-xs text-stone-400">{{ paymentMethodLabels[pay.paymentMethod] || pay.paymentMethod }}</span>
                <span v-if="pay.remark" class="text-xs text-stone-400">{{ pay.remark }}</span>
              </div>
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                @click="handleDeletePayment(pay.id)"
              />
            </div>
          </div>
        </div>
      </template>

      <template #attachments>
        <div class="mt-4">
          <CommonFileUpload
            source="attachment"
            :upload-url="`/api/contracts/${contractId}/attachments`"
            :files="attachmentFiles.map((f: any) => ({ id: f.id, fileName: f.fileName, fileSize: f.fileSize }))"
            :loading="attachmentLoading"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
            :max-size="20"
            @uploaded="fetchAttachments()"
            @delete="(f: any) => handleDeleteAttachment(f)"
          />
        </div>
      </template>

      <template #subcontracts>
        <div v-if="!contract.parentContractId" class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-stone-500">分包合同列表</span>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openSubcontractModal">创建分包</UButton>
          </div>
          <div v-if="!subcontracts?.length" class="text-center py-8 text-stone-400 text-sm">暂无分包合同</div>
          <div v-else class="space-y-2">
            <div v-for="sc in subcontracts" :key="sc.id" class="warm-card flex items-center gap-4">
              <div class="flex-1"><span class="text-sm text-stone-700 font-medium">{{ sc.name }}</span><span :class="['ml-2 text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[sc.status]?.color || '']">{{ statusConfig[sc.status]?.label || sc.status }}</span><p class="text-xs text-stone-400 mt-0.5">{{ sc.subcontractPartyName || '-' }} · {{ formatMoney(sc.totalAmount) }} · 税费 {{ (sc.taxRate * 100).toFixed(0) }}%</p></div>
              <div class="flex gap-1">
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditSubcontract(sc)" />
                <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteSubcontract(sc)" />
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #ai-review>
        <div class="mt-4">
          <ContractAIReview :contract-id="contractId" />
        </div>
      </template>
    </UTabs>

    <!-- 关联项目 -->
    <div v-if="contract.projects?.length" class="mt-6 warm-card">
      <h3 class="text-sm font-medium text-stone-700 mb-3">关联项目</h3>
      <div class="space-y-2">
        <NuxtLink
          v-for="p in contract.projects"
          :key="p.id"
          :to="`/dashboard/projects/${p.id}`"
          class="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors"
        >
          <span class="text-sm text-stone-700">{{ p.name }}</span>
          <span class="text-xs text-stone-400">{{ p.status }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 产品明细编辑弹窗 -->
    <UModal v-model:open="showProductModal">
      <template #header>编辑产品明细</template>
      <template #body>
        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          <div v-for="(p, i) in editProducts" :key="i" class="flex items-center gap-2 text-sm">
            <select v-model="p.productId" class="flex-[2] px-2 py-1.5 rounded border border-stone-200 bg-white text-sm" @change="const prod = allProducts.find((o: any) => o.id === p.productId); if (prod) { p.unitPrice = p.unitPrice || prod.standardPrice || 0 }">
              <option value="">选择产品</option>
              <option v-for="prod in allProducts" :key="prod.id" :value="prod.id">{{ prod.name }}</option>
            </select>
            <input v-model.number="p.quantity" type="number" min="1" class="w-16 px-1 py-1.5 text-center rounded border border-stone-200 text-sm" />
            <input v-model.number="p.unitPrice" type="number" step="0.01" placeholder="单价" class="w-20 px-1 py-1.5 rounded border border-stone-200 text-sm" />
            <input v-model.number="p.discount" type="number" min="0" max="100" class="w-16 px-1 py-1.5 text-center rounded border border-stone-200 text-sm" title="折扣%" />
            <span class="text-xs text-stone-500 w-20 text-right">{{ formatMoney(p.quantity * p.unitPrice * (p.discount / 100)) }}</span>
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="removeProductRow(i)" />
          </div>
        </div>
        <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" class="mt-2" @click="addProductRow">添加产品行</UButton>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showProductModal = false">取消</UButton>
          <UButton color="primary" :loading="productLoading" @click="handleSaveProducts">保存</UButton>
        </div>
      </template>
    </UModal>

    <!-- 编辑弹窗 -->
    <UModal v-model:open="showEditModal">
      <template #header>编辑合同</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div>
            <label class="block text-sm text-stone-600 mb-1">合同名称 <span class="text-red-400">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">合同金额</label>
            <input v-model.number="editForm.totalAmount" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">甲方</label>
              <input v-model="editForm.partyA" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">乙方</label>
              <input v-model="editForm.partyB" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">开始日期</label>
              <input v-model="editForm.startDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">结束日期</label>
              <input v-model="editForm.endDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">付款方式</label>
            <select v-model="editForm.paymentMethod" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
              <option value="">选择方式</option>
              <option v-for="(label, key) in paymentMethodLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">备注</label>
            <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showEditModal = false">取消</UButton>
          <UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton>
        </div>
      </template>
    </UModal>

    <!-- 添加收款计划弹窗 -->
    <UModal v-model:open="showPlanModal">
      <template #header>{{ editPlanId ? '编辑收款计划' : '添加收款计划' }}</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleSavePlan">
          <div>
            <label class="block text-sm text-stone-600 mb-1">收款金额 <span class="text-red-400">*</span></label>
            <input v-model.number="planForm.amount" type="number" step="0.01" placeholder="0.00" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">计划收款日期 <span class="text-red-400">*</span></label>
            <input v-model="planForm.planDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">备注</label>
            <input v-model="planForm.remark" type="text" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showPlanModal = false">取消</UButton>
          <UButton color="primary" :loading="planLoading" @click="handleSavePlan">{{ editPlanId ? '保存' : '添加' }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- 登记收款弹窗 -->
    <UModal v-model:open="showPaymentModal">
      <template #header>登记收款</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleAddPayment">
          <div>
            <label class="block text-sm text-stone-600 mb-1">收款金额 <span class="text-red-400">*</span></label>
            <input v-model.number="paymentForm.amount" type="number" step="0.01" placeholder="0.00" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">收款日期 <span class="text-red-400">*</span></label>
            <input v-model="paymentForm.paymentDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">付款方式</label>
            <select v-model="paymentForm.paymentMethod" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
              <option value="">选择方式</option>
              <option v-for="(label, key) in paymentMethodLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">关联收款计划</label>
            <select v-model="paymentForm.paymentPlanId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
              <option value="">不关联</option>
              <option v-for="plan in contract.paymentPlans" :key="plan.id" :value="plan.id">
                {{ formatMoney(plan.amount) }} - {{ plan.planDate }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">备注</label>
            <input v-model="paymentForm.remark" type="text" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showPaymentModal = false">取消</UButton>
          <UButton color="primary" :loading="paymentLoading" @click="handleAddPayment">登记</UButton>
        </div>
      </template>
    </UModal>

    <!-- 审批弹窗 -->
    <UModal v-model:open="showApproveModal">
      <template #header>确认审批</template>
      <template #body>
        <p class="text-sm text-stone-600">确定要审批通过合同「{{ contract.name }}」吗？</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showApproveModal = false">再想想</UButton>
          <UButton color="primary" :loading="approveLoading" @click="handleApprove">确认审批</UButton>
        </div>
      </template>
    </UModal>

    <!-- 驳回弹窗 -->
    <UModal v-model:open="showRejectModal">
      <template #header>驳回合同</template>
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-stone-600">请填写驳回原因：</p>
          <textarea v-model="rejectReason" rows="2" placeholder="写明驳回原因..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showRejectModal = false">取消</UButton>
          <UButton color="warning" :loading="rejectLoading" @click="handleReject">确认驳回</UButton>
        </div>
      </template>
    </UModal>

    <!-- 删除弹窗 -->
    <CommonConfirmDialog
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除合同「${contract.name}」吗？删了就找不回来。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
    />

    <!-- 分包合同弹窗 -->
    <UModal v-model:open="showSubcontractModal">
      <template #header>{{ editSubId ? '编辑' : '创建' }}分包合同</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleSaveSubcontract">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">名称 <span class="text-red-400">*</span></label><input v-model="subForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">分包对象</label><select v-model="subForm.subcontractPartyId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"><option value="">选择分包对象</option><option v-for="p in subParties" :key="p.id" :value="p.id">{{ p.name }}</option></select></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">基础分包金额 <span class="text-red-400">*</span></label><input v-model.number="subForm.totalAmount" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">税费率</label><input v-model.number="subForm.taxRate" type="number" step="0.01" min="0" max="1" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          </div>
          <div><label class="block text-sm text-stone-600 mb-1">技术服务费</label><input v-model.number="subForm.serviceFee" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          <!-- 外采产品 -->
          <div class="border-t border-stone-100 pt-3">
            <div class="flex items-center justify-between mb-1"><span class="text-xs text-stone-500">外采产品</span><UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="subForm.items.push({ productId: '', quantity: 1, unitPrice: 0, discount: 100 })">添加</UButton></div>
            <div v-if="subForm.items.length" class="space-y-1 max-h-48 overflow-y-auto">
              <div v-for="(it, i) in subForm.items" :key="i" class="flex items-center gap-1.5 text-xs">
                <select v-model="it.productId" class="flex-1 px-1.5 py-1 rounded border border-stone-200 bg-white" @change="const p = subProductOptions.find((o: any) => o.id === it.productId); if (p) { it.productName = p.name; it.unitPrice = it.unitPrice || p.standardPrice || 0 }"><option value="">选产品</option><option v-for="p in subProductOptions" :key="p.id" :value="p.id">{{ p.name }}</option></select>
                <input v-model.number="it.quantity" type="number" min="1" class="w-10 px-1 py-1 text-center rounded border border-stone-200" />
                <input v-model.number="it.unitPrice" type="number" step="0.01" class="w-16 px-1 py-1 rounded border border-stone-200" />
                <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="subForm.items.splice(i, 1)" />
              </div>
            </div>
          </div>
          <div class="warm-card bg-amber-50 text-sm space-y-1">
            <p>含税总额：<span class="font-semibold text-amber-700">{{ formatMoney(subForm.totalAmount * (1 + (subForm.taxRate || 0))) }}</span></p>
            <p v-if="subForm.items.length" class="text-xs text-stone-500">外采产品小计：{{ formatMoney(subForm.items.reduce((s: number, it: any) => s + (it.quantity || 0) * (it.unitPrice || 0), 0)) }}</p>
            <p v-if="subForm.serviceFee" class="text-xs text-stone-500">技术服务费：{{ formatMoney(subForm.serviceFee) }} (可提现基数)</p>
          </div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showSubcontractModal = false">取消</UButton><UButton color="primary" :loading="subLoading" @click="handleSaveSubcontract">保存</UButton></div></template>
    </UModal>

    <!-- 转交弹窗 -->
    <UModal v-model:open="showTransferModal">
      <template #header>转交合同</template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-stone-600 mb-2">新归属人 <span class="text-red-400">*</span></label>
            <div class="relative">
              <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <input v-model="userSearchKeyword" type="text" placeholder="搜索同事姓名..." class="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-white" @input="onUserSearch" @focus="loadUsers" />
            </div>
            <div v-if="userOptions.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100">
              <button v-for="u in userOptions" :key="u.id" :class="['w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50 transition-colors flex items-center gap-2', transferToUserId === u.id ? 'bg-amber-50' : '']" @click="transferToUserId = u.id">
                <span class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0"><span class="text-amber-700 text-[10px]">{{ u.name?.charAt(0) }}</span></span>
                <span class="text-stone-700">{{ u.name }}</span>
                <span class="text-xs text-stone-400 ml-auto">{{ u.username }}</span>
                <UIcon v-if="transferToUserId === u.id" name="i-lucide-check" class="w-4 h-4 text-amber-500 ml-1" />
              </button>
            </div>
            <div v-else-if="userSearchLoading" class="mt-2 p-2 text-xs text-stone-400">加载中...</div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">转交原因</label>
            <textarea v-model="transferReason" rows="2" placeholder="可选，记录转交原因..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showTransferModal = false">取消</UButton>
          <UButton color="warning" :loading="transferLoading" :disabled="!transferToUserId" @click="handleTransfer">确认转交</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
