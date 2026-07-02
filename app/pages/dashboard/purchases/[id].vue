<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '采购订单详情', middleware: ['auth'] })

const route = useRoute()
const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const order = ref<any>(null)
const loading = ref(true)
const actionLoading = ref(false)

const showDeleteModal = ref(false)
const deleteLoading = ref(false)

const showReceiveModal = ref(false)
const warehouseOptions = ref<any[]>([])
const receiveForm = ref({ warehouseId: '', locationId: '' })

async function fetchOrder() {
  loading.value = true
  try {
    const res = await $api(`/api/purchase-orders/${route.params.id}`) as any
    if (res?.code === 0) order.value = res.data
    else { toast.add({ title: '找不到这个采购订单', color: 'error' }); router.push('/dashboard/purchases') }
  } catch { toast.add({ title: '加载出了点问题', color: 'error' }) }
  finally { loading.value = false }
}

async function fetchWarehouses() {
  try {
    const res = await $api('/api/warehouses') as any
    if (res?.code === 0) warehouseOptions.value = res.data?.items || res.data || []
  } catch { /* 静默 */ }
}

// 应付/发票/付款状态
const payable = ref<any>(null)
const invoices = ref<any[]>([])
const payments = ref<any[]>([])
const activeTab = ref('detail')

async function fetchPayable() {
  try {
    const res = await $api(`/api/purchase-orders/${route.params.id}/payables`) as any
    if (res?.code === 0) payable.value = res.data
  } catch { }
}
async function fetchInvoices() {
  try {
    const res = await $api(`/api/purchase-orders/${route.params.id}/invoices`) as any
    if (res?.code === 0) invoices.value = res.data || []
  } catch { }
}
async function fetchPayments() {
  try {
    const res = await $api(`/api/purchase-orders/${route.params.id}/payments`) as any
    if (res?.code === 0) payments.value = res.data || []
  } catch { }
}

// 登记/编辑发票弹窗
const showInvoiceModal = ref(false)
const editingInvoiceId = ref<string | null>(null)
const invoiceForm = ref({ invoiceNo: '', amount: 0, taxRate: 0, taxAmount: 0, totalAmount: 0, remark: '', filePath: '' })
const invoiceSaving = ref(false)

function openInvoiceCreate() {
  editingInvoiceId.value = null
  invoiceForm.value = { invoiceNo: '', amount: 0, taxRate: 0, taxAmount: 0, totalAmount: 0, remark: '', filePath: '' }
  showInvoiceModal.value = true
}

function openInvoiceEdit(inv: any) {
  editingInvoiceId.value = inv.id
  invoiceForm.value = {
    invoiceNo: inv.invoiceNo,
    amount: inv.amount,
    taxRate: inv.taxRate,
    taxAmount: inv.taxAmount,
    totalAmount: inv.totalAmount,
    remark: inv.remark || '',
    filePath: inv.filePath || '',
  }
  showInvoiceModal.value = true
}

async function handleInvoiceSave() {
  if (!invoiceForm.value.invoiceNo || !invoiceForm.value.amount) {
    toast.add({ title: '发票号和金额都得填', color: 'warning' }); return
  }
  invoiceSaving.value = true
  try {
    const body = { ...invoiceForm.value, totalAmount: invoiceForm.value.totalAmount || invoiceForm.value.amount }
    const url = editingInvoiceId.value
      ? `/api/purchase-orders/${route.params.id}/invoices/${editingInvoiceId.value}`
      : `/api/purchase-orders/${route.params.id}/invoices`
    const method = editingInvoiceId.value ? 'PUT' : 'POST'
    const res = await $api(url, { method, body }) as any
    if (res?.code === 0) {
      toast.add({ title: editingInvoiceId.value ? '发票已更新' : '发票已登记', color: 'success' })
      showInvoiceModal.value = false
      fetchPayable(); fetchInvoices()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '登记失败', color: 'error' }) }
  finally { invoiceSaving.value = false }
}

// 登记/编辑付款弹窗
const showPaymentModal = ref(false)
const editingPaymentId = ref<string | null>(null)
const paymentForm = ref({ amount: 0, paymentDate: '', paymentMethod: 'bank_transfer', remark: '', attachmentPath: '' })
const paymentSaving = ref(false)

function openPaymentCreate() {
  editingPaymentId.value = null
  paymentForm.value = { amount: 0, paymentDate: '', paymentMethod: 'bank_transfer', remark: '', attachmentPath: '' }
  showPaymentModal.value = true
}

function openPaymentEdit(pm: any) {
  editingPaymentId.value = pm.id
  paymentForm.value = {
    amount: pm.amount,
    paymentDate: pm.paymentDate?.slice(0, 10) || '',
    paymentMethod: pm.paymentMethod || 'bank_transfer',
    remark: pm.remark || '',
    attachmentPath: pm.attachmentPath || '',
  }
  showPaymentModal.value = true
}

async function handlePaymentSave() {
  if (!paymentForm.value.amount || !paymentForm.value.paymentDate) {
    toast.add({ title: '金额和付款日期都得填', color: 'warning' }); return
  }
  paymentSaving.value = true
  try {
    const url = editingPaymentId.value
      ? `/api/purchase-orders/${route.params.id}/payments/${editingPaymentId.value}`
      : `/api/purchase-orders/${route.params.id}/payments`
    const method = editingPaymentId.value ? 'PUT' : 'POST'
    const res = await $api(url, { method, body: paymentForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: editingPaymentId.value ? '付款已更新' : '付款已登记', color: 'success' })
      showPaymentModal.value = false
      fetchPayable(); fetchPayments()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '登记失败', color: 'error' }) }
  finally { paymentSaving.value = false }
}

onMounted(() => { fetchOrder(); fetchWarehouses(); fetchPayable(); fetchInvoices(); fetchPayments() })

async function doAction(action: string, body?: any) {
  actionLoading.value = true
  try {
    const res = await $api(`/api/purchase-orders/${route.params.id}/${action}`, { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '搞定！', color: 'success' })
      showReceiveModal.value = false
      fetchOrder()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/purchase-orders/${route.params.id}/delete`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); router.push('/dashboard/purchases') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

// 采购合同上传
async function onContractUploaded(f: any) {
  const filePath = f.filePath || f.path || ''
  try {
    const res = await $api(`/api/purchase-orders/${route.params.id}`, {
      method: 'PUT',
      body: { contractFilePath: filePath },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '采购合同已上传', color: 'success' })
      fetchOrder()
    }
  } catch { /* 静默 */ }
}

function formatAmount(v: number) { return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function formatDate(d: string) { return (d || '').slice(0, 10) }

function calcTaxAmount(amount: number, taxRate: number): number {
  if (!taxRate || taxRate <= 0) return 0
  return Math.round(amount - amount / (1 + taxRate))
}

// 文件预览
const authStore = useAuthStore()
const previewUrl = ref('')
const showFilePreview = ref(false)
const previewFileName = ref('')

function openFilePreview(filePath: string, fileName?: string) {
  if (!filePath) return
  const token = authStore.accessToken
  previewUrl.value = `/api/files/preview?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token || '')}`
  previewFileName.value = fileName || filePath.split('/').pop() || '文件预览'
  showFilePreview.value = true
}

function getFileTypeGroup(fileName: string): 'image' | 'pdf' | 'office' | 'spreadsheet' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet'
  if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return 'office'
  return 'other'
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="采购订单详情">
      <template #actions>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/purchases')">返回列表</UButton>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>

    <div v-else-if="order" class="space-y-4">
      <!-- 订单信息 -->
      <div class="em-card p-6">
        <div class="flex items-center gap-3 mb-4">
          <h2 class="text-lg font-medium text-content-primary">{{ order.code }}</h2>
          <StatusBadge :value="order.status" enum-type="purchaseOrderStatus" />
        </div>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div><span class="text-content-muted">供应商</span><p class="text-content-secondary mt-0.5">{{ order.supplierName || '-' }}</p></div>
          <div><span class="text-content-muted">预计到货</span><p class="text-content-secondary mt-0.5">{{ order.expectedDate || '-' }}</p></div>
          <div><span class="text-content-muted">订单总额</span><p class="text-content-secondary mt-0.5 font-medium">{{ formatAmount(order.totalAmount) }}</p></div>
          <div><span class="text-content-muted">创建时间</span><p class="text-content-secondary mt-0.5">{{ order.createdAt || '-' }}</p></div>
        </div>
        <div v-if="order.remark" class="mt-4 pt-4 border-t border-line-light">
          <span class="text-sm text-content-muted">备注</span>
          <p class="text-sm text-content-secondary mt-1">{{ order.remark }}</p>
        </div>
        <!-- 采购合同上传 -->
        <div class="mt-4 pt-4 border-t border-line-light">
          <span class="text-sm text-content-muted">采购合同</span>
          <div class="mt-2">
            <div v-if="order.contractFilePath" class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-4 h-4 text-brand-600" />
              <button class="text-sm text-brand-600 hover:text-brand-700 hover:underline text-left" @click="openFilePreview(order.contractFilePath)">{{ order.contractFilePath.split('/').pop() }}</button>
              <UButton icon="i-lucide-x" variant="ghost" color="error" size="2xs" @click="order.contractFilePath = null" />
            </div>
            <div v-else class="max-w-xs">
              <FileUpload
                :upload-url="`/api/purchase-orders/${route.params.id}/contract-upload`"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                @uploaded="onContractUploaded"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 产品明细 -->
      <div class="em-card p-6">
        <h3 class="text-sm font-medium text-content-secondary mb-3">采购产品</h3>
        <div v-if="!order.items || order.items.length === 0" class="text-sm text-content-muted">没有产品明细</div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-line-light text-content-muted">
              <th class="text-left py-2 font-normal">产品</th>
              <th class="text-right py-2 font-normal">数量</th>
              <th class="text-right py-2 font-normal">单价</th>
              <th class="text-right py-2 font-normal">税率</th>
              <th class="text-right py-2 font-normal">税额</th>
              <th class="text-right py-2 font-normal">金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in order.items" :key="item.id" class="border-b border-line-light">
              <td class="py-2">
                <span class="text-content-secondary">{{ item.productName }}</span>
                <span class="text-xs text-content-muted ml-1">{{ item.productCode }}</span>
              </td>
              <td class="text-right py-2 text-content-secondary">{{ item.quantity }}</td>
              <td class="text-right py-2 text-content-secondary">{{ formatAmount(item.unitPrice) }}</td>
              <td class="text-right py-2 text-content-muted">{{ item.taxRate ? (item.taxRate * 100).toFixed(0) + '%' : '-' }}</td>
              <td class="text-right py-2 text-content-muted">{{ item.taxRate ? formatAmount(calcTaxAmount(item.amount, item.taxRate)) : '-' }}</td>
              <td class="text-right py-2 text-content-secondary">{{ formatAmount(item.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-end gap-2">
        <UButton v-if="order.status === 'draft'" color="primary" icon="i-lucide-send" :loading="actionLoading" @click="doAction('submit')">提交</UButton>
        <UButton v-if="order.status === 'submitted'" color="primary" icon="i-lucide-package-check" :loading="actionLoading" @click="showReceiveModal = true">确认收货</UButton>
        <UButton v-if="order.status !== 'received' && order.status !== 'cancelled'" variant="ghost" color="neutral" icon="i-lucide-x-circle" :loading="actionLoading" @click="doAction('cancel')">取消</UButton>
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" @click="showDeleteModal = true">删除</UButton>
      </div>

      <!-- 应收发票付款标签 -->
      <div v-if="order.status === 'received'" class="space-y-3">
        <div class="flex items-center gap-1 border-b border-line-light pb-2">
          <button :class="['px-3 py-1.5 text-sm rounded-md transition-colors', activeTab === 'detail' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-content-muted hover:bg-surface-hover']" @click="activeTab = 'detail'">详情</button>
          <button :class="['px-3 py-1.5 text-sm rounded-md transition-colors', activeTab === 'invoices' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-content-muted hover:bg-surface-hover']" @click="activeTab = 'invoices'">发票 ({{ invoices.length }})</button>
          <button :class="['px-3 py-1.5 text-sm rounded-md transition-colors', activeTab === 'payments' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-content-muted hover:bg-surface-hover']" @click="activeTab = 'payments'">付款 ({{ payments.length }})</button>
        </div>

        <!-- 应付概览 -->
        <div v-if="payable" class="em-card !py-2 flex items-center gap-6 text-sm">
          <div><span class="text-content-muted text-xs">应付总额</span><p class="font-medium text-content-primary">{{ formatAmount(payable.totalAmount) }}</p></div>
          <div><span class="text-content-muted text-xs">已付</span><p class="font-medium text-teal-600">{{ formatAmount(payable.paidAmount) }}</p></div>
          <div><span class="text-content-muted text-xs">已开票</span><p class="font-medium text-brand-600">{{ formatAmount(payable.invoiceAmount) }}</p></div>
          <div><span class="text-content-muted text-xs">税额</span><p class="font-medium text-amber-600">{{ formatAmount(payable.taxAmount || 0) }}</p></div>
          <div><span class="text-content-muted text-xs">状态</span><p :class="payable.status === 'paid' ? 'text-teal-600' : payable.status === 'invoiced' ? 'text-brand-600' : 'text-content-secondary'">{{ ({ pending: '待开票', invoiced: '已开票', partially_paid: '部分付款', paid: '已付清' } as Record<string, string>)[payable.status] || payable.status }}</p></div>
        </div>

        <!-- 发票标签 -->
        <div v-show="activeTab === 'invoices'" class="em-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-content-secondary">供应商发票</h3>
            <UButton size="xs" variant="ghost" color="primary" icon="i-lucide-plus" @click="openInvoiceCreate">登记发票</UButton>
          </div>
          <div v-if="invoices.length === 0" class="text-xs text-content-muted py-4 text-center">还没有发票</div>
          <table v-else class="w-full text-sm">
            <thead><tr class="border-b border-line-light text-left text-xs text-content-muted"><th class="py-2">发票号</th><th class="py-2 text-right">金额</th><th class="py-2 text-right">税率</th><th class="py-2 text-right">税额</th><th class="py-2">状态</th><th class="py-2">文件</th><th class="py-2">备注</th><th class="py-2 w-10"></th></tr></thead>
            <tbody>
              <tr v-for="inv in invoices" :key="inv.id" class="border-b border-line-light">
                <td class="py-2 text-content-secondary">{{ inv.invoiceNo }}</td>
                <td class="py-2 text-right text-content-secondary">{{ formatAmount(inv.amount) }}</td>
                <td class="py-2 text-right text-content-muted">{{ (inv.taxRate * 100).toFixed(0) }}%</td>
                <td class="py-2 text-right text-content-muted">{{ formatAmount(inv.taxAmount) }}</td>
                <td class="py-2"><span :class="['text-[10px] px-1.5 py-0.5 rounded-full', inv.status === 'confirmed' ? 'bg-teal-50 text-teal-700' : 'bg-brand-50 text-brand-700']">{{ ({ submitted: '已提交', confirmed: '已确认', rejected: '已退回' })[inv.status] }}</span></td>
                <td class="py-2">
                  <button v-if="inv.filePath" class="text-xs text-brand-600 hover:underline" @click="openFilePreview(inv.filePath, inv.filePath.split('/').pop())">查看</button>
                  <span v-else class="text-xs text-content-muted">-</span>
                </td>
                <td class="py-2 text-xs text-content-muted max-w-[100px] truncate">{{ inv.remark || '-' }}</td>
                <td class="py-2">
                  <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="2xs" @click="openInvoiceEdit(inv)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 付款标签 -->
        <div v-show="activeTab === 'payments'" class="em-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-content-secondary">付款记录</h3>
            <UButton size="xs" variant="ghost" color="primary" icon="i-lucide-plus" @click="openPaymentCreate">登记付款</UButton>
          </div>
          <div v-if="payments.length === 0" class="text-xs text-content-muted py-4 text-center">还没有付款记录</div>
          <table v-else class="w-full text-sm">
            <thead><tr class="border-b border-line-light text-left text-xs text-content-muted"><th class="py-2 text-right pr-4">金额</th><th class="py-2">付款日期</th><th class="py-2">方式</th><th class="py-2">凭证</th><th class="py-2">备注</th><th class="py-2 w-10"></th></tr></thead>
            <tbody>
              <tr v-for="pm in payments" :key="pm.id" class="border-b border-line-light">
                <td class="py-2 text-right pr-4 text-content-secondary">{{ formatAmount(pm.amount) }}</td>
                <td class="py-2 text-content-secondary">{{ formatDate(pm.paymentDate) }}</td>
                <td class="py-2 text-xs text-content-muted">{{ ({ bank_transfer: '银行转账', check: '支票', cash: '现金', alipay: '支付宝', wechat_pay: '微信', other: '其他' })[pm.paymentMethod] || pm.paymentMethod }}</td>
                <td class="py-2">
                  <button v-if="pm.attachmentPath" class="text-xs text-brand-600 hover:underline" @click="openFilePreview(pm.attachmentPath, pm.attachmentPath.split('/').pop())">查看</button>
                  <span v-else class="text-xs text-content-muted">-</span>
                </td>
                <td class="py-2 text-xs text-content-muted max-w-[120px] truncate">{{ pm.remark || '-' }}</td>
                <td class="py-2">
                  <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="2xs" @click="openPaymentEdit(pm)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 收货弹窗（选择仓库） -->
    <FormModal
      v-if="showReceiveModal"
      v-model:open="showReceiveModal"
      title="确认收货"
      size="compact"
      :loading="actionLoading"
      @confirm="doAction('receive', receiveForm)"
      @cancel="showReceiveModal = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-content-secondary">收货后库存会自动增加，确认要收货吗？</p>
        <div>
          <label class="block text-sm text-content-secondary mb-1">入库仓库（可选）</label>
          <select v-model="receiveForm.warehouseId" class="w-full input-base focus-ring">
            <option value="">不指定</option>
            <option v-for="w in warehouseOptions" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="primary" :loading="actionLoading" @click="doAction('receive', receiveForm)">确认收货</UButton>
          <UButton variant="ghost" color="neutral" @click="showReceiveModal = false">算了</UButton>
        </div>
      </template>
    </FormModal>

    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除采购订单「${order?.code}」吗？`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
    />

    <!-- 文件预览弹窗 -->
    <UModal v-model:open="showFilePreview" :ui="{ content: 'w-screen h-screen !max-w-none !max-h-none rounded-none' }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <span class="text-sm font-medium truncate text-content-secondary">{{ previewFileName }}</span>
          <UButton icon="i-lucide-x" variant="solid" color="neutral" size="sm" class="rounded-full" @click="showFilePreview = false">关闭</UButton>
        </div>
      </template>
      <template #body>
        <div v-if="getFileTypeGroup(previewFileName) === 'image'" class="flex items-center justify-center p-4">
          <img :src="previewUrl" :alt="previewFileName" class="max-w-full max-h-[calc(100vh-180px)] object-contain rounded-md" />
        </div>
        <iframe v-else-if="getFileTypeGroup(previewFileName) !== 'other'" :src="previewUrl" class="w-full h-full border-0" style="height: calc(100vh - 180px)" />
        <div v-else class="flex flex-col items-center justify-center" style="height: calc(100vh - 180px)">
          <UIcon name="i-lucide-file" class="w-16 h-16 mx-auto mb-4 text-content-muted" />
          <p class="text-sm text-content-muted">暂不支持预览此文件类型</p>
          <UButton color="primary" size="sm" class="mt-4" @click="window.open(previewUrl, '_blank')">下载文件</UButton>
        </div>
      </template>
    </UModal>

    <!-- 登记/编辑发票弹窗 -->
    <FormModal v-if="showInvoiceModal" v-model:open="showInvoiceModal" :title="editingInvoiceId ? '修改供应商发票' : '登记供应商发票'" size="compact" :loading="invoiceSaving" @confirm="handleInvoiceSave">
      <div class="space-y-3">
        <div><label class="block text-sm text-content-secondary mb-1">发票号 <span class="text-danger-500">*</span></label><input v-model="invoiceForm.invoiceNo" type="text" placeholder="供应商发票号" class="w-full input-base focus-ring" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">金额 <span class="text-danger-500">*</span></label><input v-model.number="invoiceForm.amount" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">税率</label>
            <select v-model.number="invoiceForm.taxRate" class="w-full input-base text-sm">
              <option :value="0">0%</option>
              <option :value="0.06">6%</option>
              <option :value="0.13">13%</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">税额</label><input v-model.number="invoiceForm.taxAmount" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">价税合计（留空自动算）</label><input v-model.number="invoiceForm.totalAmount" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><input v-model="invoiceForm.remark" type="text" class="w-full input-base focus-ring" /></div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">发票文件（PDF / 图片）</label>
          <FileUpload
            :upload-url="`/api/purchase-orders/${route.params.id}/invoices/upload`"
            accept=".pdf,.png,.jpg,.jpeg"
            @uploaded="(f: any) => { invoiceForm.filePath = f.filePath || f.path || '' }"
          />
        </div>
        <div v-if="invoiceForm.filePath" class="flex items-center gap-2 text-xs text-content-muted">
          <UIcon name="i-lucide-paperclip" class="w-3.5 h-3.5" />
          <span>已上传：{{ invoiceForm.filePath.split('/').pop() }}</span>
        </div>
      </div>
    </FormModal>

    <!-- 登记/编辑付款弹窗 -->
    <FormModal v-if="showPaymentModal" v-model:open="showPaymentModal" :title="editingPaymentId ? '修改付款记录' : '登记付款'" size="compact" :loading="paymentSaving" @confirm="handlePaymentSave">
      <div class="space-y-3">
        <div><label class="block text-sm text-content-secondary mb-1">金额 <span class="text-danger-500">*</span></label><input v-model.number="paymentForm.amount" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">付款日期 <span class="text-danger-500">*</span></label><input v-model="paymentForm.paymentDate" type="date" class="w-full input-base focus-ring" /></div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">付款方式</label>
          <select v-model="paymentForm.paymentMethod" class="w-full input-base text-sm">
            <option value="bank_transfer">银行转账</option>
            <option value="check">支票</option>
            <option value="cash">现金</option>
            <option value="alipay">支付宝</option>
            <option value="wechat_pay">微信</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><input v-model="paymentForm.remark" type="text" placeholder="转账凭证号等" class="w-full input-base focus-ring" /></div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">付款凭证（截图 / PDF）</label>
          <FileUpload
            :upload-url="`/api/purchase-orders/${route.params.id}/payments/upload`"
            accept=".pdf,.png,.jpg,.jpeg"
            @uploaded="(f: any) => { paymentForm.attachmentPath = f.filePath || f.path || '' }"
          />
        </div>
        <div v-if="paymentForm.attachmentPath" class="flex items-center gap-2 text-xs text-content-muted">
          <UIcon name="i-lucide-paperclip" class="w-3.5 h-3.5" />
          <span>已上传：{{ paymentForm.attachmentPath.split('/').pop() }}</span>
        </div>
      </div>
    </FormModal>
  </div>
</template>
