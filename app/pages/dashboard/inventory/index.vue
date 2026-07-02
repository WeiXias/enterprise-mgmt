<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '库存管理', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const items = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const typeFilter = ref('')
const productIdFilter = ref('')
const showProductSelectModal = ref(false)
const selectedProductInfo = ref<any>(null)
const selectedProductName = computed(() => selectedProductInfo.value?.name || '')
const productOptions = ref<any[]>([])

// 排序
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const sortOptions = [
  { label: '最新记录', value: 'createdAt:desc' },
  { label: '最早记录', value: 'createdAt:asc' },
]
const currentSortKey = computed(() => `${sortBy.value}:${sortOrder.value}`)
function onSortChange(val: string) {
  const [by = 'createdAt', order = 'desc'] = val.split(':')
  sortBy.value = by
  sortOrder.value = order as 'asc' | 'desc'
  page.value = 1
  fetchItems()
}

// 库存概览
const overview = ref({ totalProducts: 0, totalStock: 0, lowStockCount: 0, lowStockProducts: [] as any[] })
const LOW_STOCK_THRESHOLD = 10

const showModal = ref(false)
const saving = ref(false)
const form = ref({ productId: '', type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' })

import { jsonToCsv, downloadCsv } from '~/utils/export-csv'

const typeLabels: Record<string, string> = { inbound: '入库', outbound: '出库', adjustment: '盘点' }
const typeColors: Record<string, string> = {
  inbound: 'bg-teal-50 text-teal-700',
  outbound: 'bg-danger-50 text-danger-600',
  adjustment: 'bg-surface-hover text-content-secondary',
}

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value, sortBy: sortBy.value, sortOrder: sortOrder.value }
    if (typeFilter.value) params.type = typeFilter.value
    if (productIdFilter.value) params.productId = productIdFilter.value
    const res = await $api('/api/inventory/transactions', { params }) as any
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
  } catch {}
  finally { loading.value = false }
}

async function fetchProducts() {
  try {
    const res = await $api('/api/products', { params: { pageSize: 200 } }) as any
    if (res?.code === 0) {
      productOptions.value = res.data.items || []
      const products = (res.data.items as any[])
      overview.value.totalProducts = products.length
      overview.value.totalStock = products.reduce((sum: number, p: any) => sum + (Number(p.stockQuantity) || 0), 0)
      overview.value.lowStockProducts = products.filter((p: any) => {
        const q = Number(p.stockQuantity) || 0
        return q > 0 && q < LOW_STOCK_THRESHOLD
      })
      overview.value.lowStockCount = overview.value.lowStockProducts.length
    }
  } catch {}
}

function handleExport() {
  $api('/api/inventory/transactions', { params: { pageSize: 9999 } }).then((res: any) => {
    const rows = res?.data?.items || []
    const columns = [
      { key: 'productName', label: '产品' },
      { key: 'type', label: '类型' },
      { key: 'quantity', label: '数量' },
      { key: 'unitPrice', label: '单价', format: (v: unknown) => v ? '¥' + v : '-' },
      { key: 'batchNo', label: '批次' },
      { key: 'remark', label: '备注' },
      { key: 'createdAt', label: '时间', format: (v: unknown) => (v || '').toString().slice(0, 10) },
    ]
    const csv = jsonToCsv(rows, columns)
    downloadCsv(csv, `库存流水_${new Date().toISOString().slice(0, 10)}.csv`)
  }).catch(() => {})
}

async function handleSave() {
  if (!form.value.productId || !form.value.quantity) { toast.add({ title: '产品和数量还没填', color: 'warning' }); return }
  saving.value = true
  try {
    await $api('/api/inventory/transactions', { method: 'POST', body: form.value })
    toast.add({ title: '搞定了！', color: 'success' })
    showModal.value = false
    form.value = { productId: '', type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' }
    fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作出了点问题', color: 'error' }) }
  finally { saving.value = false }
}

// 删除确认
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)

function promptDelete(t: any) {
  deleteTarget.value = t
  showDeleteDialog.value = true
}

async function handleDeleteConfirmed() {
  if (!deleteTarget.value) return
  try {
    await $api(`/api/inventory/transactions/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    showDeleteDialog.value = false
    fetchItems()
    fetchProducts()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { showDeleteDialog.value = false }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => { fetchItems(); fetchProducts() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">库存管理</h1>
        <p class="text-sm text-content-secondary mt-0.5">出入库记录和库存流水</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport">导出</UButton>
        <UButton icon="i-lucide-plus" color="primary" @click="showModal = true">登记流水</UButton>
      </div>
    </div>

    <!-- 库存概览 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="em-card flex items-center gap-3 !py-3">
        <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-package" class="w-5 h-5 text-brand-500" /></div>
        <div><p class="text-lg font-medium text-content-primary">{{ overview.totalProducts }}</p><p class="text-xs text-content-secondary">产品种类</p></div>
      </div>
      <div class="em-card flex items-center gap-3 !py-3">
        <div class="w-10 h-10 rounded-md bg-teal-50 flex items-center justify-center"><UIcon name="i-lucide-layers" class="w-5 h-5 text-teal-500" /></div>
        <div><p class="text-lg font-medium text-teal-600">{{ overview.totalStock }}</p><p class="text-xs text-content-secondary">总库存量</p></div>
      </div>
      <div class="em-card flex items-center gap-3 !py-3" :class="overview.lowStockCount > 0 ? 'border-brand-300' : ''">
        <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-brand-500" /></div>
        <div><p class="text-lg font-medium" :class="overview.lowStockCount > 0 ? 'text-brand-600' : 'text-content-primary'">{{ overview.lowStockCount }}</p><p class="text-xs text-content-secondary">低库存预警</p></div>
      </div>
      <div v-if="overview.lowStockProducts.length > 0" class="em-card col-span-full">
        <h3 class="text-sm font-medium text-content-primary mb-2">低库存产品（库存 &lt; {{ LOW_STOCK_THRESHOLD }}）</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="p in overview.lowStockProducts" :key="p.id" class="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700">
            {{ p.name }}（{{ p.stockQuantity }}）
          </span>
        </div>
      </div>
    </div>

    <!-- 筛选 + 排序 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <EnumSelect
        v-model="typeFilter"
        :options="[
          { value: '', label: '全部类型' },
          { value: 'inbound', label: '入库' },
          { value: 'outbound', label: '出库' },
          { value: 'adjustment', label: '盘点调整' },
        ]"
        placeholder="全部类型"
        @update:model-value="page = 1; fetchItems()"
      />
      <div class="relative min-w-[180px]">
          <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
          <input
            :value="selectedProductName"
            type="text"
            readonly
            placeholder="筛选产品..."
            class="w-full pl-8 input-base bg-surface-card cursor-pointer text-sm"
            @click="showProductSelectModal = true"
          />
          <button
            v-if="productIdFilter"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-content-muted hover:text-content-secondary"
            @click="productIdFilter = ''; selectedProductInfo = null; page = 1; fetchItems()"
          ><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
        </div>
      <select :value="currentSortKey" class="input-base text-xs" @change="onSortChange(($event.target as HTMLSelectElement).value)">
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <span class="text-xs text-content-secondary">共 {{ total }} 条</span>
    </div>

    <!-- 紧凑卡片列表 -->
    <div v-if="loading" class="text-center py-12 text-content-secondary">加载中...</div>
    <div v-else-if="!items.length" class="text-center py-12 text-content-secondary">暂无库存流水</div>
    <div v-else class="space-y-1">
      <div v-for="t in items" :key="t.id" class="em-card !p-2.5 flex items-center gap-3 group">
        <div class="w-1 h-10 rounded-full flex-shrink-0" :class="t.type === 'inbound' ? 'bg-teal-400' : t.type === 'outbound' ? 'bg-danger-400' : 'bg-line'" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary">{{ t.productName || t.productId }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', typeColors[t.type] || '']">
              {{ typeLabels[t.type] || t.type }}
            </span>
            <span v-if="t.batchNo" class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-content-secondary">{{ t.batchNo }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-secondary">
            <span>{{ (t.createdAt || '').slice(0, 10) }}</span>
            <span v-if="t.remark" class="truncate max-w-[200px]">{{ t.remark }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <span class="text-sm font-medium" :class="t.quantity > 0 ? 'text-teal-600' : 'text-danger-500'">{{ t.quantity > 0 ? '+' + t.quantity : t.quantity }}</span>
            <span v-if="t.unitPrice" class="text-xs text-content-secondary ml-2">{{ '¥' + t.unitPrice }}</span>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="promptDelete(t)" />
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-content-secondary">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1"><UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上页</UButton><UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下页</UButton></div>
    </div>

    <FormModal v-if="showModal" v-model:open="showModal" title="登记库存流水" size="standard" :loading="saving" @confirm="handleSave">
      <div>
        <label class="block text-sm text-content-secondary mb-1">产品 <span class="text-danger-600">*</span></label>
        <div class="relative">
          <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
          <input
            :value="selectedProductName"
            type="text"
            readonly
            placeholder="点击选择产品"
            class="w-full pl-8 input-base bg-surface-card cursor-pointer"
            @click="showProductSelectModal = true"
          />
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">类型</label>
        <EnumSelect
          v-model="form.type"
          :options="[
            { value: 'inbound', label: '入库' },
            { value: 'outbound', label: '出库' },
            { value: 'adjustment', label: '盘点调整' },
          ]"
        />
      </div>
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">数量 <span class="text-danger-600">*</span></label>
          <input v-model.number="form.quantity" type="number" step="1" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">单价</label>
          <input v-model.number="form.unitPrice" type="number" step="0.01" class="w-full input-base focus-ring" />
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">批次号</label>
        <input v-model="form.batchNo" type="text" class="w-full input-base focus-ring" />
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">备注</label>
        <input v-model="form.remark" type="text" class="w-full input-base focus-ring" />
      </div>
    </FormModal>

    <ConfirmDialog
      v-model:open="showDeleteDialog"
      :danger="true"
      title="删除库存记录"
      message="删除后库存将回退，确定要删吗？"
      @confirm="handleDeleteConfirmed"
    />

    <ProductSelectModal
      v-model="selectedProductInfo"
      nested
      :open="showProductSelectModal"
      @update:open="showProductSelectModal = $event"
      @select="(p: any) => { selectedProductInfo = p; productIdFilter = p.id; form.productId = p.id; showProductSelectModal = false; page = 1; fetchItems() }"
    />
  </div>
</template>
