<script setup lang="ts">
import type { PdfSignaturePlacement, SealInfo } from '~/types/pdf'
import { useSealStore } from '~/stores/seal'
import { sanitizeHtml } from '~/utils/sanitize'

definePageMeta({ layout: 'dashboard', title: '合同详情', middleware: ['auth'], watermark: true })

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

// 签章
const signSealStore = useSealStore()
const showSignModal = ref(false)
const signPdfUrl = ref('')
const signPdfLoading = ref(false)
const signPlacements = ref<PdfSignaturePlacement[]>([])
const signSaving = ref(false)
const showHandSignaturePad = ref(false)

async function openSignModal() {
  // 先获取印章库和导出 PDF
  signPdfLoading.value = true
  showSignModal.value = true
  try {
    const [sealRes, pdfRes] = await Promise.all([
      signSealStore.fetchSeals(),
      $api(`/api/contracts/${contractId}/export-pdf`, { method: 'POST' }) as any,
    ])
    if (pdfRes?.code === 0 && pdfRes.data?.pdfUrl) {
      signPdfUrl.value = pdfRes.data.pdfUrl
    }
  } catch {
    // ignore
  } finally {
    signPdfLoading.value = false
  }
}

function onSignAddSeal(seal: SealInfo) {
  // addSeal 在 usePdfSign 中，这里直接在 placements 末尾加一个默认位置
  signPlacements.value.push({
    sealId: seal.id,
    page: 1,
    x: 0.35,
    y: 0.35,
    width: 0.2,
    height: 0.2,
    type: seal.type === 'signature' ? 'hand_sign' : 'seal',
  })
}

function onSignRemovePlacement(index: number) {
  signPlacements.value.splice(index, 1)
}

async function onConfirmSign() {
  if (signPlacements.value.length === 0) return
  signSaving.value = true
  try {
    const res = await $api('/api/pdf/sign', {
      method: 'POST',
      body: {
        targetType: 'contract',
        targetId: contractId,
        pdfUrl: signPdfUrl.value,
        signatures: signPlacements.value,
      },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '章盖好了，PDF 已更新', color: 'success' })
      showSignModal.value = false
      signPlacements.value = []
      if (res.data?.pdfUrl) {
        window.open(res.data.pdfUrl, '_blank')
      }
    } else {
      toast.add({ title: res?.message || '签章出了点问题', color: 'error' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '签章出了点问题', color: 'error' })
  } finally {
    signSaving.value = false
  }
}

async function onHandSignatureConfirm(dataUrl: string, blob: Blob) {
  // 手写签名 → 上传为印章 → 加入 placements
  const file = new File([blob], `手写签名_${Date.now()}.png`, { type: 'image/png' })
  const seal = await signSealStore.uploadSeal(file)
  if (seal) {
    signPlacements.value.push({
      sealId: seal.id,
      page: 1,
      x: 0.35,
      y: 0.35,
      width: 0.2,
      height: 0.2,
      type: 'hand_sign',
    })
    toast.add({ title: '签名已添加到签章列表', color: 'success' })
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
  draft: { label: '草稿', color: 'bg-surface-hover text-content-secondary' },
  approved: { label: '已审批', color: 'bg-brand-50 text-brand-600' },
  in_progress: { label: '执行中', color: 'bg-brand-50 text-brand-700' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  terminated: { label: '已终止', color: 'bg-danger-50 text-danger-600' },
}

const { getLabel } = useEnum()

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
const showProductModal = ref(false); const productLoading = ref(false); const editProducts = ref<any[]>([])
async function openProductModal() {
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

async function fetchSubcontracts() {
  try {
    const res = await $api(`/api/contracts/${contractId}/subcontracts`) as any
    if (res?.code === 0) subcontracts.value = res.data || []
  } catch { /* ignore */ }
}

async function openSubcontractModal() {
  try {
    const partiesRes = await $api('/api/subcontract-parties') as any
    if (partiesRes?.code === 0) subParties.value = partiesRes.data || []
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

const showDeleteSubDialog = ref(false)
const deleteSubTarget = ref<any>(null)

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
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
  <div v-else-if="!contract" class="text-center py-12 text-content-muted">合同不存在</div>
  <div v-else>
    <!-- 顶部面包屑 + 操作 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/dashboard/contracts" class="text-content-muted hover:text-brand-600 transition-colors">合同</NuxtLink>
        <span class="text-content-muted">/</span>
        <span class="text-content-primary">{{ contract.name }}</span>
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
    <div class="em-card mb-6">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-file-text" class="w-6 h-6 text-teal-600" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-base font-medium text-content-inverse">{{ contract.name }}</h2>
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
            <span class="font-medium">{{ formatMoney(contract.totalAmount) }}</span>
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
          <div class="mt-3 pt-3 border-t border-line-light">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-content-muted">已收款 {{ formatMoney(contract.receivedAmount || 0) }} / {{ formatMoney(contract.totalAmount) }}</span>
              <span class="text-content-muted">{{ contract.totalAmount > 0 ? Math.round((contract.receivedAmount || 0) / contract.totalAmount * 100) : 0 }}%</span>
            </div>
            <div class="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                class="h-full bg-teal-400 rounded-full transition-all"
                :style="{ width: (contract.totalAmount > 0 ? Math.round((contract.receivedAmount || 0) / contract.totalAmount * 100) : 0) + '%' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 审批信息 -->
      <div v-if="contract.approvedBy" class="mt-3 pt-3 border-t border-line-light flex gap-4 text-xs text-content-muted">
        <span>审批人：{{ contract.approvedBy?.name }}</span>
        <span v-if="contract.approvedAt">审批时间：{{ formatDate(contract.approvedAt) }}</span>
      </div>
      <div v-if="contract.rejectReason" class="mt-2 text-xs text-danger-600">
        驳回原因：{{ contract.rejectReason }}
      </div>
      <p v-if="contract.remark" class="text-sm text-content-muted mt-3 pt-3 border-t border-line-light">{{ contract.remark }}</p>
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
            <span class="text-sm text-content-muted">合同正文</span>
            <div class="flex items-center gap-2">
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" :to="`/dashboard/contracts/${contract.id}/edit`">编辑正文</UButton>
              <UButton icon="i-lucide-file-down" variant="ghost" color="primary" size="xs" :loading="pdfLoading" @click="handleExportPdf">导出 PDF</UButton>
              <UButton icon="i-lucide-stamp" variant="ghost" color="warning" size="xs" @click="openSignModal">签章</UButton>
            </div>
          </div>
          <div v-if="!contract.content" class="text-center py-12 text-content-muted">
            <p>还没起草正文</p>
            <UButton icon="i-lucide-pen-line" variant="ghost" color="primary" size="sm" class="mt-2" :to="`/dashboard/contracts/${contract.id}/edit`">点击编辑开始撰写</UButton>
          </div>
          <div v-else class="em-card prose prose-sm max-w-none prose-headings:text-content-inverse prose-p:text-content-secondary" v-html="sanitizeHtml(contract.content)" />
        </div>
      </template>
      <template #products>
        <div class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-content-muted">产品明细 {{ contract.products?.length ? '(' + contract.products.length + ')' : '' }}</span>
            <UButton icon="i-lucide-pen-line" variant="ghost" color="primary" size="xs" @click="openProductModal">编辑</UButton>
          </div>
          <div v-if="!contract.products?.length" class="text-center py-8 text-content-muted text-sm">暂无关联产品</div>
          <div v-else class="em-card overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-line-light text-left text-xs text-content-muted">
                  <th class="py-2 px-4 font-normal">产品</th>
                  <th class="py-2 px-4 font-normal text-right">数量</th>
                  <th class="py-2 px-4 font-normal text-right">单价</th>
                  <th class="py-2 px-4 font-normal text-right">折扣</th>
                  <th class="py-2 px-4 font-normal text-right">小计</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in contract.products" :key="p.id" class="border-b border-line-light">
                  <td class="py-2 px-4">
                    <div class="font-medium text-content-primary">{{ p.productName || '-' }}</div>
                    <div v-if="p.productCode" class="text-xs text-content-muted">{{ p.productCode }}</div>
                  </td>
                  <td class="py-2 px-4 text-right text-content-secondary">{{ p.quantity }}</td>
                  <td class="py-2 px-4 text-right text-content-secondary">{{ formatMoney(p.unitPrice) }}</td>
                  <td class="py-2 px-4 text-right text-content-secondary">{{ (Number(p.discount || 1) * 100).toFixed(0) }}%</td>
                  <td class="py-2 px-4 text-right text-content-primary font-medium">{{ formatMoney(p.quantity * p.unitPrice * (p.discount || 1)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <template #plans>
        <div class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-content-muted">收款计划列表</span>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="editPlanId = null; planForm = { amount: 0, planDate: '', remark: '' }; showPlanModal = true">添加计划</UButton>
          </div>
          <div v-if="!contract.paymentPlans?.length" class="text-center py-8 text-content-muted text-sm">暂无收款计划</div>
          <div v-else class="space-y-2">
            <div
              v-for="plan in contract.paymentPlans"
              :key="plan.id"
              class="em-card flex items-center gap-4"
            >
              <div
                :class="['w-2 h-2 rounded-full flex-shrink-0', {
                  'bg-surface-hover': plan.status === 'pending',
                  'bg-teal-400': plan.status === 'paid',
                  'bg-danger-400': plan.status === 'overdue',
                }]"
              />
              <div class="flex-1 flex items-center gap-4">
                <span class="text-sm text-content-primary font-medium">{{ formatMoney(plan.amount) }}</span>
                <span class="text-xs text-content-muted">{{ plan.planDate }}</span>
                <span
                  :class="['text-[10px] px-1.5 py-0.5 rounded-full', {
                    'bg-surface-hover text-content-muted': plan.status === 'pending',
                    'bg-teal-50 text-teal-700': plan.status === 'paid',
                    'bg-danger-50 text-danger-600': plan.status === 'overdue',
                  }]"
                >{{ ({ pending: '待收款', paid: '已收款', overdue: '已逾期' } as Record<string, string>)[plan.status] || plan.status }}</span>
                <span v-if="plan.remark" class="text-xs text-content-muted">{{ plan.remark }}</span>
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
            <span class="text-sm text-content-muted">收款记录列表</span>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="paymentForm = { amount: 0, paymentDate: '', paymentMethod: '', paymentPlanId: '', remark: '' }; showPaymentModal = true">登记收款</UButton>
          </div>
          <div v-if="!contract.payments?.length" class="text-center py-8 text-content-muted text-sm">暂无收款记录</div>
          <div v-else class="space-y-2">
            <div
              v-for="pay in contract.payments"
              :key="pay.id"
              class="em-card flex items-center gap-4"
            >
              <div class="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
              <div class="flex-1 flex items-center gap-4">
                <span class="text-sm text-content-primary font-medium">{{ formatMoney(pay.amount) }}</span>
                <span class="text-xs text-content-muted">{{ formatDate(pay.paymentDate) }}</span>
                <span v-if="pay.paymentMethod" class="text-xs text-content-muted">{{ getLabel('PaymentMethod', pay.paymentMethod) || pay.paymentMethod }}</span>
                <span v-if="pay.remark" class="text-xs text-content-muted">{{ pay.remark }}</span>
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
          <FileUpload
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
            <span class="text-sm text-content-muted">分包合同列表</span>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openSubcontractModal">创建分包</UButton>
          </div>
          <div v-if="!subcontracts?.length" class="text-center py-8 text-content-muted text-sm">暂无分包合同</div>
          <div v-else class="space-y-2">
            <div v-for="sc in subcontracts" :key="sc.id" class="em-card flex items-center gap-4">
              <div class="flex-1"><span class="text-sm text-content-primary font-medium">{{ sc.name }}</span><span :class="['ml-2 text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[sc.status]?.color || '']">{{ statusConfig[sc.status]?.label || sc.status }}</span><p class="text-xs text-content-muted mt-0.5">{{ sc.subcontractPartyName || '-' }} · {{ formatMoney(sc.totalAmount) }} · 税费 {{ (sc.taxRate * 100).toFixed(0) }}%</p></div>
              <div class="flex gap-1">
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditSubcontract(sc)" />
                <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="promptDeleteSubcontract(sc)" />
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
    <div v-if="contract.projects?.length" class="mt-6 em-card">
      <h3 class="text-sm font-medium text-content-primary mb-3">关联项目</h3>
      <div class="space-y-2">
        <NuxtLink
          v-for="p in contract.projects"
          :key="p.id"
          :to="`/dashboard/projects/${p.id}`"
          class="flex items-center justify-between p-2 rounded-md hover:bg-line-light/40 transition-colors"
        >
          <span class="text-sm text-content-primary">{{ p.name }}</span>
          <span class="text-xs text-content-muted">{{ p.status }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 产品明细编辑弹窗 -->
    <FormModal
      v-if="showProductModal"
      v-model:open="showProductModal"
      title="编辑产品明细"
      :loading="productLoading"
      :secondary-action="{ label: '添加产品行', onClick: addProductRow }"
    >
      <div class="space-y-3 max-h-[50vh] overflow-y-auto">
        <div v-for="(p, i) in editProducts" :key="i" class="flex items-center gap-2 text-sm">
          <ProductSelect v-model="p.productId" class="flex-[2]" @select="(prod: any) => { if (prod) p.unitPrice = p.unitPrice || (prod.price || 0) }" />
          <input v-model.number="p.quantity" type="number" min="1" class="w-16 px-1 py-1.5 text-center rounded border border-line text-sm" />
          <input v-model.number="p.unitPrice" type="number" step="0.01" placeholder="单价" class="w-20 px-1 py-1.5 rounded border border-line text-sm" />
          <input v-model.number="p.discount" type="number" min="0" max="100" class="w-16 px-1 py-1.5 text-center rounded border border-line text-sm" title="折扣%" />
          <span class="text-xs text-content-muted w-20 text-right">{{ formatMoney(p.quantity * p.unitPrice * (p.discount / 100)) }}</span>
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="removeProductRow(i)" />
        </div>
      </div>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showProductModal = false">取消</UButton>
        <UButton color="primary" :loading="productLoading" @click="handleSaveProducts">保存</UButton>
      </template>
    </FormModal>

    <!-- 编辑弹窗 -->
    <FormModal
      v-if="showEditModal"
      v-model:open="showEditModal"
      title="编辑合同"
      :loading="editLoading"
      @confirm="handleEdit"
    >
      <form class="space-y-5" @submit.prevent="handleEdit">
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">基本信息</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">合同名称 <span class="text-danger-500">*</span></label>
              <input v-model="editForm.name" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">合同金额</label>
              <input v-model.number="editForm.totalAmount" type="number" step="0.01" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">签约方</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">甲方</label><input v-model="editForm.partyA" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">乙方</label><input v-model="editForm.partyB" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
          </div>
        </div>

        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">合同周期</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">开始日期</label><input v-model="editForm.startDate" type="date" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">结束日期</label><input v-model="editForm.endDate" type="date" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" /></div>
          </div>
        </div>

        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">其他</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">付款方式</label>
              <EnumSelect v-model="editForm.paymentMethod" dict="PaymentMethod" placeholder="选择方式" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">备注</label>
              <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 resize-none" />
            </div>
          </div>
        </div>
      </form>
    </FormModal>

    <!-- 添加收款计划弹窗 -->
    <FormModal
      v-if="showPlanModal"
      v-model:open="showPlanModal"
      :title="editPlanId ? '编辑收款计划' : '添加收款计划'"
      :loading="planLoading"
      size="compact"
    >
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">收款金额 <span class="text-danger-500">*</span></label>
          <input v-model.number="planForm.amount" type="number" step="0.01" placeholder="0.00" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">计划收款日期 <span class="text-danger-500">*</span></label>
          <input v-model="planForm.planDate" type="date" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">备注</label>
          <input v-model="planForm.remark" type="text" placeholder="备注信息..." class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
        </div>
      </div>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showPlanModal = false">取消</UButton>
        <UButton color="primary" :loading="planLoading" @click="handleSavePlan">{{ editPlanId ? '保存' : '添加' }}</UButton>
      </template>
    </FormModal>

    <!-- 登记收款弹窗 -->
    <FormModal
      v-if="showPaymentModal"
      v-model:open="showPaymentModal"
      title="登记收款"
      size="compact"
      :loading="paymentLoading"
    >
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">收款金额 <span class="text-danger-500">*</span></label>
          <input v-model.number="paymentForm.amount" type="number" step="0.01" placeholder="0.00" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">收款日期 <span class="text-danger-500">*</span></label>
          <input v-model="paymentForm.paymentDate" type="date" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" />
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
      </div>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showPaymentModal = false">取消</UButton>
        <UButton color="primary" :loading="paymentLoading" @click="handleAddPayment">登记</UButton>
      </template>
    </FormModal>

    <!-- 审批弹窗 -->
    <ConfirmDialog
      v-if="showApproveModal"
      v-model:open="showApproveModal"
      title="确认审批"
      :message="`确定要审批通过合同「${contract.name}」吗？`"
      confirm-text="确认审批"
      :loading="approveLoading"
      @confirm="handleApprove"
    />

    <!-- 驳回弹窗 -->
    <FormModal
      v-if="showRejectModal"
      v-model:open="showRejectModal"
      title="驳回合同"
      :loading="rejectLoading"
      size="compact"
      @confirm="handleReject"
    >
      <div class="space-y-3">
        <p class="text-sm text-content-secondary">请填写驳回原因：</p>
        <textarea v-model="rejectReason" rows="3" placeholder="写明驳回原因..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 resize-none" />
      </div>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showRejectModal = false">取消</UButton>
        <UButton color="warning" :loading="rejectLoading" @click="handleReject">确认驳回</UButton>
      </template>
    </FormModal>

    <!-- 删除弹窗 -->
    <ConfirmDialog
      v-if="showDeleteModal"
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
    <FormModal
      v-if="showSubcontractModal"
      v-model:open="showSubcontractModal"
      :title="editSubId ? '编辑分包合同' : '创建分包合同'"
      :loading="subLoading"
      @confirm="handleSaveSubcontract"
    >
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

        <!-- 外采产品 -->
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-1.5">
              <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
              <span class="text-sm font-medium text-brand-700">外采产品</span>
            </div>
            <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="subForm.items.push({ productId: '', quantity: 1, unitPrice: 0, discount: 100 })">添加</UButton>
          </div>
          <div v-if="subForm.items.length" class="space-y-1 max-h-48 overflow-y-auto">
            <div v-for="(it, i) in subForm.items" :key="i" class="flex items-center gap-1.5 text-xs">
              <ProductSelect v-model="it.productId" class="flex-1" @select="(prod: any) => { if (prod) { it.productName = prod.name; it.unitPrice = it.unitPrice || (prod.price || 0) } }" />
              <input v-model.number="it.quantity" type="number" min="1" class="w-10 px-1 py-1 text-center rounded border border-line" />
              <input v-model.number="it.unitPrice" type="number" step="0.01" class="w-16 px-1 py-1 rounded border border-line" />
              <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="subForm.items.splice(i, 1)" />
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-brand-50 border border-brand-200 p-4 text-sm space-y-1">
          <p>含税总额：<span class="font-medium text-brand-700">{{ formatMoney(subForm.totalAmount * (1 + (subForm.taxRate || 0))) }}</span></p>
          <p v-if="subForm.items.length" class="text-xs text-content-muted">外采产品小计：{{ formatMoney(subForm.items.reduce((s: number, it: any) => s + (it.quantity || 0) * (it.unitPrice || 0), 0)) }}</p>
          <p v-if="subForm.serviceFee" class="text-xs text-content-muted">技术服务费：{{ formatMoney(subForm.serviceFee) }} (可提现基数)</p>
        </div>
      </div>
    </FormModal>

    <!-- 转交弹窗 -->
    <FormModal
      v-if="showTransferModal"
      v-model:open="showTransferModal"
      title="转交合同"
      size="compact"
      :loading="transferLoading"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-content-secondary mb-2">新归属人 <span class="text-danger-500">*</span></label>
          <div class="relative">
            <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
            <input v-model="userSearchKeyword" type="text" placeholder="搜索同事姓名..." class="w-full pl-8 input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" @input="onUserSearch" @focus="loadUsers" />
          </div>
          <div v-if="userOptions.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-line rounded-md divide-y divide-line-light">
            <button v-for="u in userOptions" :key="u.id" :class="['w-full text-left px-3 py-2.5 text-sm hover:bg-brand-50 transition-colors flex items-center gap-2', transferToUserId === u.id ? 'bg-brand-50' : '']" @click="transferToUserId = u.id">
              <span class="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0"><span class="text-brand-700 text-[10px]">{{ u.name?.charAt(0) }}</span></span>
              <span class="text-content-primary">{{ u.name }}</span>
              <span class="text-xs text-content-muted ml-auto">{{ u.username }}</span>
              <UIcon v-if="transferToUserId === u.id" name="i-lucide-check" class="w-4 h-4 text-brand-500 ml-1" />
            </button>
          </div>
          <div v-else-if="userSearchLoading" class="mt-2 p-2 text-xs text-content-muted">加载中...</div>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">转交原因</label>
          <textarea v-model="transferReason" rows="2" placeholder="可选，记录转交原因..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 resize-none" />
        </div>
      </div>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showTransferModal = false">取消</UButton>
        <UButton color="warning" :loading="transferLoading" :disabled="!transferToUserId" @click="handleTransfer">确认转交</UButton>
      </template>
    </FormModal>

    <!-- 签章弹窗 -->
    <UModal v-if="showSignModal" v-model:open="showSignModal" :ui="{ content: 'w-screen h-screen !max-w-none !max-h-none rounded-none' }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <span class="text-sm font-medium text-content-primary">合同签章 — {{ contract?.name }}</span>
          <UButton icon="i-lucide-x" variant="solid" color="neutral" size="sm" class="rounded-full" @click="showSignModal = false">关闭</UButton>
        </div>
      </template>
      <template #body>
        <div v-if="signPdfLoading" class="h-full flex items-center justify-center">
          <div class="text-center">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
              <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
              <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
            </div>
            <p class="mt-2 text-xs text-content-muted">正在生成 PDF...</p>
          </div>
        </div>
        <div v-else-if="!signPdfUrl" class="h-full flex items-center justify-center">
          <p class="text-sm text-content-muted">PDF 生成出了点问题，请重试</p>
        </div>
        <div v-else class="flex h-full">
          <!-- PDF 查看器 + 签章叠加层 -->
          <div class="flex-1 relative">
            <PdfViewer :source="signPdfUrl" :show-search="true" :show-toolbar="true" :sign-mode="true">
              <template #sign-overlay>
                  <PdfSignOverlay
                    :placements="signPlacements"
                    :seals="signSealStore.seals.map(s => ({ id: s.id, imageUrl: s.imageUrl || '', name: s.name }))"
                    :canvas-width="600"
                    :canvas-height="800"
                    @update:placements="signPlacements = $event"
                    @remove="onSignRemovePlacement"
                  />
                </template>
              </PdfViewer>
          </div>
          <!-- 签章面板 -->
          <PdfSignaturePanel
            :placements="signPlacements"
            :seals="signSealStore.seals"
            :current-page="1"
            :total-pages="1"
            :loading="signSaving"
            @add-seal="onSignAddSeal"
            @remove-placement="onSignRemovePlacement"
            @update:placements="signPlacements = $event"
            @confirm-sign="onConfirmSign"
            @hand-signature="showHandSignaturePad = true"
          />
        </div>
      </template>
    </UModal>

    <!-- 手写签名弹窗 -->
    <HandSignaturePad
      :open="showHandSignaturePad"
      @update:open="showHandSignaturePad = $event"
      @confirm="onHandSignatureConfirm"
    />

    <ConfirmDialog
      v-model:open="showDeleteSubDialog"
      :danger="true"
      title="删除分包合同"
      message="确定要删除这个分包合同吗？"
      @confirm="handleDeleteSubcontractConfirmed"
    />
  </div>
</template>
