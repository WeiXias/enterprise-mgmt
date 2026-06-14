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
const productOptions = ref<any[]>([])

// 库存概览
const overview = ref({ totalProducts: 0, totalStock: 0, lowStockCount: 0, lowStockProducts: [] as any[] })
const LOW_STOCK_THRESHOLD = 10

const showModal = ref(false)
const saving = ref(false)
const form = ref({ productId: '', type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' })

import { jsonToCsv, downloadCsv } from '~/utils/export-csv'

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
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
      // 计算库存概览
      const products = res.data.items as any[]
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
    toast.add({ title: '操作成功', color: 'success' })
    showModal.value = false
    form.value = { productId: '', type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' }
    fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleDelete(t: any) {
  if (!confirm('确定删除？库存将回退')) return
  try {
    await $api(`/api/inventory/transactions/${t.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

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
      <ProductSelect v-model="productIdFilter" placeholder="筛选产品..." @update:model-value="page = 1; fetchItems()" />
      <span class="text-xs text-content-secondary">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-secondary">加载中...</div>
    <div v-else-if="!items.length" class="text-center py-12 text-content-secondary">暂无库存流水</div>
    <div v-else class="em-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line-light text-left text-xs text-content-secondary">
            <th class="py-2 px-3">产品</th>
            <th class="py-2 px-3">类型</th>
            <th class="py-2 px-3 text-right">数量</th>
            <th class="py-2 px-3 text-right">单价</th>
            <th class="py-2 px-3">批次</th>
            <th class="py-2 px-3">备注</th>
            <th class="py-2 px-3">时间</th>
            <th class="py-2 px-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in items" :key="t.id" class="border-b border-line-light">
            <td class="py-2 px-3 font-medium text-content-primary">{{ t.productName || t.productId }}</td>
            <td class="py-2 px-3">
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', t.type === 'inbound' ? 'bg-teal-50 text-teal-700' : t.type === 'outbound' ? 'bg-red-50 text-red-600' : 'bg-line-light text-content-secondary']">
                {{ ({ inbound: '入库', outbound: '出库', adjustment: '盘点' } as Record<string, string>)[t.type] || t.type }}
              </span>
            </td>
            <td class="py-2 px-3 text-right" :class="t.quantity > 0 ? 'text-teal-600' : 'text-red-500'">{{ t.quantity > 0 ? '+' + t.quantity : t.quantity }}</td>
            <td class="py-2 px-3 text-right text-content-secondary">{{ t.unitPrice ? '¥' + t.unitPrice : '-' }}</td>
            <td class="py-2 px-3 text-xs text-content-secondary">{{ t.batchNo || '-' }}</td>
            <td class="py-2 px-3 text-xs text-content-secondary max-w-[150px] truncate">{{ t.remark || '-' }}</td>
            <td class="py-2 px-3 text-xs text-content-secondary">{{ (t.createdAt || '').slice(0, 10) }}</td>
            <td class="py-2 px-3">
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDelete(t)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormModal v-if="showModal" v-model:open="showModal" title="登记库存流水" size="standard" :loading="saving" @confirm="handleSave">
      <div>
        <label class="block text-sm text-content-secondary mb-1">产品 <span class="text-danger-600">*</span></label>
        <ProductSelect v-model="form.productId" placeholder="选择产品" />
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
  </div>
</template>
