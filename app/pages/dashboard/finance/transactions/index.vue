<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '收支明细', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300)
}

const items = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const typeFilter = ref('')
const startDate = ref('')
const endDate = ref('')

// 新建/编辑
const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ type: 'income', amount: 0, category: '', transactionDate: new Date().toISOString().slice(0, 10), description: '', paymentMethod: '' })

// 删除
const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

const incomeCategories = ref<any[]>([])
const expenseCategories = ref<any[]>([])
const paymentMethods: Record<string, string> = { bank_transfer: '银行转账', cash: '现金', alipay: '支付宝', wechat_pay: '微信', other: '其他' }
const sourceLabels: Record<string, string> = { contract_payment: '合同收款', commission_payout: '提成发放', reimbursement: '报销', manual: '手动' }

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (typeFilter.value) params.type = typeFilter.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res = await $api('/api/finance/transactions', { params }) as any
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function getCategories() {
  const list = form.value.type === 'income' ? incomeCategories.value : expenseCategories.value
  return list.map((c: any) => c.name)
}

function openCreate(type = 'income') {
  editTarget.value = null
  form.value = { type, amount: 0, category: '', transactionDate: new Date().toISOString().slice(0, 10), description: '', paymentMethod: '' }
  showModal.value = true
}

function openEdit(t: any) {
  if (t.sourceType !== 'manual') { toast.add({ title: '自动生成的记录不能编辑', color: 'warning' }); return }
  editTarget.value = t
  form.value = { type: t.type, amount: t.amount, category: t.category, transactionDate: t.transactionDate, description: t.description || '', paymentMethod: t.paymentMethod || '' }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.amount) { toast.add({ title: '金额还没填呢', color: 'warning' }); return }
  saving.value = true
  try {
    if (editTarget.value) {
      const res = await $api(`/api/finance/transactions/${editTarget.value.id}`, { method: 'PUT', body: form.value }) as any
      if (res?.code === 0) toast.add({ title: '已保存', color: 'success' })
    } else {
      const res = await $api('/api/finance/transactions', { method: 'POST', body: form.value }) as any
      if (res?.code === 0) toast.add({ title: '已登记', color: 'success' })
    }
    showModal.value = false; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/finance/transactions/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; deleteTarget.value = null; fetchItems() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

async function handleExport() {
  const params = new URLSearchParams()
  if (typeFilter.value) params.set('type', typeFilter.value)
  if (startDate.value) params.set('startDate', startDate.value)
  if (endDate.value) params.set('endDate', endDate.value)
  window.open(`/api/finance/transactions/export?${params.toString()}`)
}

async function fetchCategories() {
  try {
    const res = await $api('/api/finance/categories') as any
    if (res?.code === 0) {
      incomeCategories.value = res.data.income
      expenseCategories.value = res.data.expense
    }
  } catch { /* ignore */ }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => { fetchItems(); fetchCategories() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">收支明细</h1>
        <p class="text-sm text-stone-400 mt-0.5">所有收入和支出都在这里</p>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-download" variant="outline" color="neutral" size="sm" @click="handleExport">导出</UButton>
        <UButton icon="i-lucide-plus-circle" color="primary" size="sm" @click="openCreate('income')">记收入</UButton>
        <UButton icon="i-lucide-minus-circle" color="error" size="sm" @click="openCreate('expense')">记支出</UButton>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input v-model="keyword" type="text" placeholder="搜索..." class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" @input="onSearchInput" />
      </div>
      <select v-model="typeFilter" class="px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white" @change="page=1; fetchItems()">
        <option value="">全部类型</option><option value="income">收入</option><option value="expense">支出</option>
      </select>
      <input v-model="startDate" type="date" class="px-3 py-2 text-sm rounded-lg border border-stone-200" @change="page=1; fetchItems()" />
      <span class="text-stone-300">~</span>
      <input v-model="endDate" type="date" class="px-3 py-2 text-sm rounded-lg border border-stone-200" @change="page=1; fetchItems()" />
      <span class="text-xs text-stone-400">共 {{ total }} 条</span>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-stone-400">还没有收支记录，记一笔？</div>
    <div v-else class="space-y-2">
      <div v-for="t in items" :key="t.id" class="warm-card flex items-center gap-3 group">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0', t.type === 'income' ? 'bg-teal-400' : 'bg-red-400']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm text-stone-700">{{ t.description || t.category }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">{{ sourceLabels[t.sourceType] || t.sourceType }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-stone-400">
            <span>{{ t.category }}</span>
            <span>{{ t.transactionDate }}</span>
            <span v-if="t.paymentMethod">{{ paymentMethods[t.paymentMethod] || t.paymentMethod }}</span>
            <NuxtLink v-if="t.contractId" :to="`/dashboard/contracts/${t.contractId}`" class="text-amber-600 hover:underline">← {{ t.contractName || t.contractCode }}</NuxtLink>
          </div>
        </div>
        <span :class="['text-sm font-semibold', t.type === 'income' ? 'text-teal-600' : 'text-red-500']">{{ t.type === 'income' ? '+' : '-' }}{{ formatMoney(t.amount) }}</span>
        <div v-if="t.sourceType === 'manual'" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(t)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = t; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-stone-400">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1"><UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上一页</UButton><UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下一页</UButton></div>
    </div>

    <!-- 弹窗 -->
    <UModal v-model:open="showModal">
      <template #header>{{ editTarget ? '编辑' : '登记' }}{{ form.type === 'income' ? '收入' : '支出' }}</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleSave">
          <div class="flex gap-2">
            <UButton :color="form.type === 'income' ? 'primary' : 'neutral'" :variant="form.type === 'income' ? 'solid' : 'outline'" size="sm" @click="form.type = 'income'; form.category = ''">收入</UButton>
            <UButton :color="form.type === 'expense' ? 'error' : 'neutral'" :variant="form.type === 'expense' ? 'solid' : 'outline'" size="sm" @click="form.type = 'expense'; form.category = ''">支出</UButton>
          </div>
          <div><label class="block text-sm text-stone-600 mb-1">分类</label><select v-model="form.category" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"><option value="">选择</option><option v-for="c in getCategories()" :key="c" :value="c">{{ c }}</option></select></div>
          <div><label class="block text-sm text-stone-600 mb-1">金额 <span class="text-red-400">*</span></label><input v-model.number="form.amount" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          <div><label class="block text-sm text-stone-600 mb-1">日期</label><input v-model="form.transactionDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          <div><label class="block text-sm text-stone-600 mb-1">说明</label><input v-model="form.description" type="text" placeholder="简单描述..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          <div><label class="block text-sm text-stone-600 mb-1">支付方式</label><select v-model="form.paymentMethod" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"><option value="">选择</option><option v-for="(label, key) in paymentMethods" :key="key" :value="key">{{ label }}</option></select></div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showModal = false">取消</UButton><UButton color="primary" :loading="saving" @click="handleSave">保存</UButton></div></template>
    </UModal>

    <!-- 删除弹窗 -->
    <CommonConfirmDialog
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除这条记录吗？删了就找不回来。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
