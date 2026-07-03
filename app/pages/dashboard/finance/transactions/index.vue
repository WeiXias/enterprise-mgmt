<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '收支明细', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() { if (searchTimer) clearTimeout(searchTimer); searchTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300) }

const items = ref<any[]>([]); const loading = ref(true); const total = ref(0); const page = ref(1); const pageSize = ref(20)
const keyword = ref(''); const typeFilter = ref(''); const startDate = ref(''); const endDate = ref('')
const minAmount = ref(''); const maxAmount = ref(''); const sortBy = ref(''); const sortOrder = ref('desc')
const showModal = ref(false); const saving = ref(false); const editTarget = ref<any>(null)
const form = ref({ type: 'income', amount: 0, category: '', transactionDate: new Date().toISOString().slice(0, 10), description: '', paymentMethod: '' })
const showDeleteModal = ref(false); const deleteTarget = ref<any>(null); const deleteLoading = ref(false)
const incomeCategories = ref<any[]>([]); const expenseCategories = ref<any[]>([])
const { getLabel } = useEnum()

interface StatsData { totalIncome: number; totalExpense: number; netBalance: number }
const stats = ref<StatsData>({ totalIncome: 0, totalExpense: 0, netBalance: 0 })
async function fetchStats() { try { const res = await $fetch('/api/finance/overview', { headers: useAuthHeaders() }) as any; if (res?.code === 0) { const s = res.data; stats.value = { totalIncome: Number(s?.totalIncome || 0), totalExpense: Number(s?.totalExpense || 0), netBalance: Number(s?.netBalance || 0) } } } catch {} }

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; if (Math.abs(n) >= 10000) return '¥' + (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '万'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value; if (typeFilter.value) params.type = typeFilter.value
    if (startDate.value) params.startDate = startDate.value; if (endDate.value) params.endDate = endDate.value
    if (minAmount.value) params.minAmount = minAmount.value; if (maxAmount.value) params.maxAmount = maxAmount.value
    if (sortBy.value) { params.sortBy = sortBy.value; params.sortOrder = sortOrder.value }
    const res = await $api('/api/finance/transactions', { params }) as any
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
  } catch { toast.add({ title: '加载收支数据出了点问题', color: 'error' }) }
  finally { loading.value = false }
}

function getCategories() { const list = form.value.type === 'income' ? incomeCategories.value : expenseCategories.value; return list.map((c: any) => c.name) }
function openCreate(type = 'income') { editTarget.value = null; form.value = { type, amount: 0, category: '', transactionDate: new Date().toISOString().slice(0, 10), description: '', paymentMethod: '' }; showModal.value = true }
function openEdit(t: any) { if (t.sourceType !== 'manual') { toast.add({ title: '这条记录是自动记上的，不能手动改', color: 'warning' }); return }; editTarget.value = t; form.value = { type: t.type, amount: t.amount, category: t.category, transactionDate: t.transactionDate, description: t.description || '', paymentMethod: t.paymentMethod || '' }; showModal.value = true }

async function handleSave() {
  if (!form.value.amount) { toast.add({ title: '金额还没填呢', color: 'warning' }); return }
  saving.value = true
  try { if (editTarget.value) { const res = await $api(`/api/finance/transactions/${editTarget.value.id}`, { method: 'PUT', body: form.value }) as any; if (res?.code === 0) toast.add({ title: '已保存', color: 'success' }) } else { const res = await $api('/api/finance/transactions', { method: 'POST', body: form.value }) as any; if (res?.code === 0) toast.add({ title: '已登记', color: 'success' }) }; showModal.value = false; fetchItems(); fetchStats() }
  catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) } finally { saving.value = false }
}

async function handleDelete() { if (!deleteTarget.value) return; deleteLoading.value = true; try { const res = await $api(`/api/finance/transactions/${deleteTarget.value.id}`, { method: 'DELETE' }) as any; if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; deleteTarget.value = null; fetchItems(); fetchStats() } } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) } finally { deleteLoading.value = false } }

async function handleExport() { const params = new URLSearchParams(); if (typeFilter.value) params.set('type', typeFilter.value); if (startDate.value) params.set('startDate', startDate.value); if (endDate.value) params.set('endDate', endDate.value); window.open(`/api/finance/transactions/export?${params.toString()}`) }

async function fetchCategories() { try { const res = await $api('/api/finance/categories') as any; if (res?.code === 0) { incomeCategories.value = res.data.income; expenseCategories.value = res.data.expense } } catch {} }

function clearFilters() { typeFilter.value = ''; startDate.value = ''; endDate.value = ''; minAmount.value = ''; maxAmount.value = ''; keyword.value = ''; sortBy.value = ''; sortOrder.value = 'desc'; page.value = 1; fetchItems() }
const hasActiveFilters = computed(() => typeFilter.value || startDate.value || endDate.value || minAmount.value || maxAmount.value)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => { fetchItems(); fetchCategories(); fetchStats() })
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div><h1 class="text-lg font-medium text-content-primary">收支明细</h1><p class="text-sm text-content-muted mt-0.5">所有收入和支出都在这里</p></div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-download" variant="outline" color="neutral" size="sm" @click="handleExport">导出</UButton>
        <UButton icon="i-lucide-plus-circle" color="primary" size="sm" @click="openCreate('income')">记收入</UButton>
        <UButton icon="i-lucide-minus-circle" color="error" size="sm" @click="openCreate('expense')">记支出</UButton>
      </div>
    </div>

    <!-- 统计快筛 -->
    <div class="grid grid-cols-4 gap-2.5 mb-4">
      <div class="em-card !p-3 text-left"><div class="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-trending-up" class="w-3.5 h-3.5 text-teal-500" /></div><div class="text-lg font-medium text-teal-600 leading-none">{{ formatMoney(stats.totalIncome) }}</div><div class="text-xs text-content-muted mt-1">总收入</div></div>
      <div class="em-card !p-3 text-left"><div class="w-6 h-6 rounded-md bg-danger-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-trending-down" class="w-3.5 h-3.5 text-danger-500" /></div><div class="text-lg font-medium text-danger-500 leading-none">{{ formatMoney(stats.totalExpense) }}</div><div class="text-xs text-content-muted mt-1">总支出</div></div>
      <div class="em-card !p-3 text-left"><div class="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-minus" class="w-3.5 h-3.5 text-brand-500" /></div><div class="text-lg font-medium leading-none" :class="stats.netBalance >= 0 ? 'text-teal-600' : 'text-danger-500'">{{ stats.netBalance >= 0 ? '+' : '' }}{{ formatMoney(stats.netBalance) }}</div><div class="text-xs text-content-muted mt-1">净收支</div></div>
      <div class="em-card !p-3 text-left"><div class="w-6 h-6 rounded-md bg-surface-hover flex items-center justify-center mb-1"><UIcon name="i-lucide-list" class="w-3.5 h-3.5 text-content-muted" /></div><div class="text-xl font-medium text-content-primary leading-none">{{ total }}</div><div class="text-xs text-content-muted mt-1">总笔数</div></div>
    </div>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <div class="relative flex-1 min-w-[160px] max-w-[240px]">
        <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜描述 / 分类..." class="w-full pl-8 input-base focus-ring" @input="onSearchInput" />
      </div>
      <EnumSelect v-model="typeFilter" dict="transactionType" placeholder="全部类型" @update:model-value="page=1; fetchItems()" />
      <DateRangePicker v-model:start-date="startDate" v-model:end-date="endDate" compact @update:start-date="page=1; fetchItems()" @update:end-date="page=1; fetchItems()" />
      <div class="w-px h-5 bg-line mx-0.5" />
      <span class="text-xs text-content-muted">金额</span><input v-model="minAmount" type="number" placeholder="最低" class="input-base text-sm h-9 w-[80px] px-2 focus-ring" @change="page=1; fetchItems()" /><span class="text-xs text-content-muted">~</span><input v-model="maxAmount" type="number" placeholder="最高" class="input-base text-sm h-9 w-[80px] px-2 focus-ring" @change="page=1; fetchItems()" />
      <div class="w-px h-5 bg-line mx-0.5" />
      <select :value="`${sortBy}_${sortOrder}`" class="select-base text-sm h-9 px-2.5 rounded-md border border-line bg-white" @change="(e: any) => { const [by, order] = (e.target as HTMLSelectElement).value.split('_'); sortBy = by || ''; sortOrder = order || 'desc'; page = 1; fetchItems() }">
        <option value="_">交易日期</option><option value="amount_desc">金额: 高→低</option><option value="amount_asc">金额: 低→高</option><option value="transactionDate_desc">日期: 新→旧</option><option value="transactionDate_asc">日期: 旧→新</option>
      </select>
      <UButton v-if="hasActiveFilters" icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="clearFilters">清筛选</UButton>
      <span class="text-xs text-content-muted ml-auto">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-coins" class="w-10 h-10 mx-auto mb-2 text-content-muted" /><p class="text-sm">还没有收支记录</p>
      <UButton class="mt-3" size="sm" color="primary" @click="openCreate('income')">记一笔</UButton>
    </div>
    <div v-else class="space-y-1">
      <div v-for="t in items" :key="t.id" class="em-card !p-2.5 flex items-center gap-3 group">
        <div :class="['w-1 h-9 rounded-full flex-shrink-0', t.type === 'income' ? 'bg-teal-400' : 'bg-danger-400']" />
        <div class="flex-1 min-w-0 flex items-center gap-16">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm text-content-secondary truncate">{{ t.description || t.category }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-content-muted shrink-0">{{ getLabel('TransactionSourceType', t.sourceType) || t.sourceType }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted ml-auto">
            <span>{{ t.category }}</span><span>{{ t.transactionDate }}</span>
            <span v-if="t.paymentMethod">{{ getLabel('paymentMethod', t.paymentMethod) }}</span>
            <NuxtLink v-if="t.contractId" :to="`/dashboard/contracts/${t.contractId}`" class="text-brand-600 hover:underline">← {{ t.contractName || t.contractCode }}</NuxtLink>
          </div>
        </div>
        <span :class="['text-sm font-medium whitespace-nowrap min-w-[80px] text-right', t.type === 'income' ? 'text-teal-600' : 'text-danger-500']">{{ t.type === 'income' ? '+' : '-' }}{{ formatMoney(t.amount) }}</span>
        <div v-if="t.sourceType === 'manual'" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(t)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = t; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-content-muted">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1"><UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上一页</UButton><UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下一页</UButton></div>
    </div>

    <FormModal v-if="showModal" v-model:open="showModal" :title="`${editTarget ? '编辑' : '登记'}${form.type === 'income' ? '收入' : '支出'}`" size="standard" :loading="saving" @confirm="handleSave" @cancel="showModal = false">
      <form class="space-y-3" @submit.prevent="handleSave">
        <div class="flex gap-2"><UButton :color="form.type === 'income' ? 'primary' : 'neutral'" :variant="form.type === 'income' ? 'solid' : 'outline'" size="sm" @click="form.type = 'income'; form.category = ''">收入</UButton><UButton :color="form.type === 'expense' ? 'error' : 'neutral'" :variant="form.type === 'expense' ? 'solid' : 'outline'" size="sm" @click="form.type = 'expense'; form.category = ''">支出</UButton></div>
        <div><label class="block text-sm text-content-secondary mb-1">分类</label><EnumSelect v-model="form.category" :options="getCategories()" placeholder="选择" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">金额 <span class="text-danger-500">*</span></label><input v-model.number="form.amount" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">日期</label><input v-model="form.transactionDate" type="date" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">说明</label><input v-model="form.description" type="text" placeholder="简单描述..." class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">支付方式</label><EnumSelect v-model="form.paymentMethod" dict="paymentMethod" placeholder="选择" /></div>
      </form>
    </FormModal>

    <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除" :message="`确定要删除这条记录吗？删了就找不回来。`" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" @cancel="deleteTarget = null" />
  </div>
</template>
