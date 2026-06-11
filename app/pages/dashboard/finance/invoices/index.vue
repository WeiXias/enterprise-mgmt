<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '发票管理', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const items = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const statusFilter = ref('')
const invoiceNoFilter = ref('')

const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ invoiceNo: '', type: 'vat_normal', contractId: '', customerId: '', amount: 0, taxRate: 0, issuedAt: '', dueDate: '', remark: '' })

// 批量作废
const selectedForVoid = ref<Set<string>>(new Set())
const batchVoidLoading = ref(false)

const contractOptions = ref<any[]>([])
const customerOptions = ref<any[]>([])

const invoiceTypeLabels: Record<string, string> = { vat_special: '增值税专票', vat_normal: '增值税普票', electronic: '电子发票' }
const invoiceStatusLabels: Record<string, string> = { pending: '待开票', issued: '已开票', voided: '已作废' }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (statusFilter.value) params.status = statusFilter.value
    if (invoiceNoFilter.value) params.invoiceNo = invoiceNoFilter.value
    const res = await $api('/api/invoices', { params }) as any
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
  } catch {}
  finally { loading.value = false }
}

async function fetchOptions() {
  try {
    const [cRes, custRes] = await Promise.all([
      $api('/api/contracts', { params: { pageSize: 200 } }) as any,
      $api('/api/customers', { params: { pageSize: 200 } }) as any,
    ])
    if (cRes?.code === 0) contractOptions.value = cRes.data.items || []
    if (custRes?.code === 0) customerOptions.value = custRes.data.items || []
  } catch {}
}

function openCreate() {
  editTarget.value = null
  form.value = { invoiceNo: `FP-${Date.now()}`, type: 'vat_normal', contractId: '', customerId: '', amount: 0, taxRate: 0, issuedAt: '', dueDate: '', remark: '' }
  showModal.value = true
}

function openEdit(inv: any) {
  editTarget.value = inv
  form.value = {
    invoiceNo: inv.invoiceNo, type: inv.type, contractId: inv.contractId || '', customerId: inv.customerId || '',
    amount: inv.amount, taxRate: inv.taxRate, issuedAt: inv.issuedAt?.slice(0, 10) || '', dueDate: inv.dueDate?.slice(0, 10) || '', remark: inv.remark || '',
  }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.invoiceNo || !form.value.amount) { toast.add({ title: '发票号和金额得填', color: 'warning' }); return }
  saving.value = true
  try {
    if (editTarget.value) {
      await $api(`/api/invoices/${editTarget.value.id}`, { method: 'PUT', body: form.value })
    } else {
      await $api('/api/invoices', { method: 'POST', body: form.value })
    }
    toast.add({ title: '已保存', color: 'success' })
    showModal.value = false
    fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleVoid(inv: any) {
  if (!confirm('确定作废此发票吗？')) return
  try {
    await $api(`/api/invoices/${inv.id}/void`, { method: 'POST' })
    toast.add({ title: '已作废', color: 'success' })
    fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
}

function toggleVoidSelect(id: string) {
  const s = new Set(selectedForVoid.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedForVoid.value = s
}

async function handleBatchVoid() {
  if (selectedForVoid.value.size === 0) { toast.add({ title: '至少选一张', color: 'warning' }); return }
  if (!confirm(`确定作废这 ${selectedForVoid.value.size} 张发票吗？`)) return
  batchVoidLoading.value = true
  try {
    await Promise.all([...selectedForVoid.value].map(id => $api(`/api/invoices/${id}/void`, { method: 'POST' })))
    toast.add({ title: `已作废 ${selectedForVoid.value.size} 张`, color: 'success' })
    selectedForVoid.value = new Set()
    fetchItems()
  } catch { toast.add({ title: '部分作废失败', color: 'error' }) }
  finally { batchVoidLoading.value = false }
}

function formatMoney(v: any) {
  const n = Number(v)
  if (!n) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

onMounted(() => { fetchItems(); fetchOptions() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">发票管理</h1>
        <p class="text-sm text-stone-400 mt-0.5">管理开票记录</p>
      </div>
      <UButton icon="i-lucide-plus" color="primary" @click="openCreate">新增发票</UButton>
      <UButton v-if="selectedForVoid.size > 0" icon="i-lucide-x-circle" color="error" variant="outline" size="sm" :loading="batchVoidLoading" @click="handleBatchVoid">
        批量作废 ({{ selectedForVoid.size }})
      </UButton>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <input v-model="invoiceNoFilter" type="text" placeholder="搜发票号..." class="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 max-w-[200px]" @input="page = 1; fetchItems()" />
      <select v-model="statusFilter" class="px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white" @change="page = 1; fetchItems()">
        <option value="">全部状态</option>
        <option value="pending">待开票</option>
        <option value="issued">已开票</option>
        <option value="voided">已作废</option>
      </select>
      <span class="text-xs text-stone-400">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-stone-400">加载中...</div>
    <div v-else-if="!items.length" class="text-center py-12 text-stone-400">还没有发票</div>
    <div v-else class="space-y-2">
      <div v-for="inv in items" :key="inv.id" class="warm-card flex items-center gap-4">
        <input v-if="inv.status !== 'voided'" type="checkbox" :checked="selectedForVoid.has(inv.id)" class="w-3.5 h-3.5 rounded border-stone-300 text-amber-500" @change="toggleVoidSelect(inv.id)" />
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-stone-800">{{ inv.invoiceNo }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', inv.status === 'issued' ? 'bg-teal-50 text-teal-700' : inv.status === 'voided' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700']">
              {{ invoiceStatusLabels[inv.status] || inv.status }}
            </span>
          </div>
          <div class="text-xs text-stone-400 flex flex-wrap gap-x-4 gap-y-0.5">
            <span>{{ invoiceTypeLabels[inv.type] || inv.type }}</span>
            <span v-if="inv.contractName">{{ inv.contractName }}</span>
            <span v-if="inv.customerName">{{ inv.customerName }}</span>
            <span>金额 {{ formatMoney(inv.amount) }}</span>
            <span v-if="inv.taxAmount" class="text-amber-600">税额 {{ formatMoney(inv.taxAmount) }}</span>
            <span v-if="inv.issuedAt">{{ inv.issuedAt }}</span>
          </div>
        </div>
        <div class="flex gap-1">
          <UButton v-if="inv.status === 'pending'" icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(inv)" />
          <UButton v-if="inv.status !== 'voided'" icon="i-lucide-x-circle" variant="ghost" color="error" size="xs" @click="handleVoid(inv)" />
        </div>
      </div>
    </div>

    <UModal v-model:open="showModal">
      <template #header>{{ editTarget ? '编辑' : '新增' }}发票</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleSave">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">发票号 <span class="text-red-400">*</span></label>
              <input v-model="form.invoiceNo" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">发票类型</label>
              <select v-model="form.type" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white">
                <option v-for="(label, key) in invoiceTypeLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">关联合同</label>
              <select v-model="form.contractId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white">
                <option value="">不关联</option>
                <option v-for="c in contractOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">客户</label>
              <select v-model="form.customerId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white">
                <option value="">选择客户</option>
                <option v-for="c in customerOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">金额 <span class="text-red-400">*</span></label>
              <input v-model.number="form.amount" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">税率</label>
              <input v-model.number="form.taxRate" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">开票日期</label>
              <input v-model="form.issuedAt" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">到期日</label>
              <input v-model="form.dueDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">备注</label>
            <textarea v-model="form.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 resize-none" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showModal = false">取消</UButton>
          <UButton color="primary" :loading="saving" @click="handleSave">保存</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
