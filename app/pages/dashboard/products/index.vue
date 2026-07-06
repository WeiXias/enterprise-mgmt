<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '产品', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const { loading, list: products, total, page, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchProducts } = useTable<any>({ apiUrl: '/api/products' })

const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })
const categoryFilter = ref('')
watch(categoryFilter, (v) => { setFilter('categoryId', v); onFilterChange() })

// 排序
const sortValue = ref('')
watch(sortValue, (v) => {
  if (!v) {
    setFilter('sortBy', '')
    setFilter('sortOrder', '')
  } else {
    const idx = v.lastIndexOf('_')
    setFilter('sortBy', v.slice(0, idx))
    setFilter('sortOrder', v.slice(idx + 1))
  }
  onFilterChange()
})

const categories = ref<any[]>([])

const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({ name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' })

const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

const viewMode = ref<'grid' | 'list'>('grid')

async function fetchCategories() {
  try {
    const res = await $api('/api/dict/product_category') as any
    if (res?.code === 0) {
      categories.value = (res.data || []).map((d: any) => ({
        id: d.id,
        name: d.label,
      }))
    }
  } catch { /* ignore */ }
}

async function handleCreate() {
  if (!createForm.value.name) { toast.add({ title: '产品名称得填一下', color: 'warning' }); return }
  createLoading.value = true
  try {
    const res = await $api('/api/products', { method: 'POST', body: createForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '搞定了！产品已添加', color: 'success' }); showCreateModal.value = false; createForm.value = { name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' }; fetchProducts() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加出了点问题', color: 'error' }) }
  finally { createLoading.value = false }
}

function openEditModal(product: any) {
  editForm.value = { id: product.id, name: product.name, code: product.code, categoryId: product.category?.id || product.categoryId || '', model: product.model || '', manufacturer: product.manufacturer || '', unit: product.unit || '', type: product.type || '', standardPrice: product.standardPrice || 0, costPrice: product.costPrice || 0, taxRate: product.taxRate ?? 0, description: product.description || '', status: product.status }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) { toast.add({ title: '产品名称不能为空', color: 'warning' }); return }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/products/${id}`, { method: 'PUT', body: data }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); showEditModal.value = false; fetchProducts() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' }) }
  finally { editLoading.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/products/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; deleteTarget.value = null; fetchProducts() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

async function toggleStatus(product: any) {
  try {
    const res = await $api(`/api/products/${product.id}/toggle-status`, { method: 'POST' }) as any
    if (res?.code === 0) { toast.add({ title: res.message || '切换好了', color: 'success' }); fetchProducts() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作出了点问题', color: 'error' }) }
}

onMounted(() => { fetchProducts(); fetchCategories() })
</script>

<template>
  <div>
    <PageHeader title="产品" description="产品和价格都在这里管">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; createForm = { name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' }; fetchCategories()">添加产品</UButton>
        </div>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜产品名、编码..." class="w-full pl-9 input-base focus-ring" @input="onSearchInput" />
      </div>
      <EnumSelect v-model="categoryFilter" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="全部分类" />
      <EnumSelect v-model="statusFilter" dict="productStatus" placeholder="全部状态" />
      <select v-model="sortValue" class="input-base focus-ring min-w-[130px]">
        <option value="">默认排序</option>
        <option value="standardPrice_desc">价格从高到低</option>
        <option value="standardPrice_asc">价格从低到高</option>
        <option value="stockQuantity_desc">库存从多到少</option>
        <option value="stockQuantity_asc">库存从少到多</option>
        <option value="name_asc">名称 A-Z</option>
      </select>
      <span class="text-xs text-content-muted">共 {{ total }} 个产品</span>
      <div class="ml-auto flex items-center rounded-lg border border-line overflow-hidden">
        <button :class="['px-2.5 py-1.5 text-xs transition-colors', viewMode === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-content-muted hover:bg-surface-hover']" @click="viewMode = 'grid'"><UIcon name="i-lucide-layout-grid" class="w-3.5 h-3.5" /></button>
        <button :class="['px-2.5 py-1.5 text-xs transition-colors', viewMode === 'list' ? 'bg-brand-50 text-brand-700' : 'text-content-muted hover:bg-surface-hover']" @click="viewMode = 'list'"><UIcon name="i-lucide-list" class="w-3.5 h-3.5" /></button>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="em-card animate-pulse">
        <div class="h-4 bg-surface-hover rounded w-3/4 mb-3" />
        <div class="h-3 bg-surface-hover rounded w-1/2 mb-2" />
        <div class="h-3 bg-surface-hover rounded w-1/3" />
      </div>
    </div>
    <div v-else-if="products.length === 0" class="text-center py-20">
      <div class="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-lucide-package-open" class="w-8 h-8 text-brand-400" />
      </div>
      <h3 class="text-base font-medium text-content-primary mb-1">还没有产品</h3>
      <p class="text-sm text-content-muted mb-5">加第一个产品，开始管起来</p>
      <UButton color="primary" @click="showCreateModal = true; createForm = { name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' }; fetchCategories()">添加产品</UButton>
    </div>

    <!-- 网格视图 -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="product in products"
        :key="product.id"
        class="em-card !p-3 group cursor-pointer hover:shadow-card-hover transition-shadow relative"
        @click="$router.push(`/dashboard/products/${product.id}`)"
      >
        <!-- 状态色条 + 缩略图区域 -->
        <div class="flex items-start gap-3 mb-3">
          <div :class="['w-1.5 h-12 rounded-full shrink-0 mt-0.5', product.status === 'on_sale' ? 'bg-teal-400' : 'bg-line']" />
          <div class="w-14 h-14 rounded-xl bg-surface-hover flex items-center justify-center shrink-0 overflow-hidden">
            <img v-if="product.images?.[0]?.url" :src="product.images[0].url" class="w-full h-full object-cover" />
            <UIcon v-else name="i-lucide-package" class="w-6 h-6 text-content-muted" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-medium text-content-primary truncate leading-snug">{{ product.name }}</h3>
            <p class="text-[11px] text-content-muted mt-0.5 truncate">{{ product.code }}</p>
            <p v-if="product.type" class="text-[10px] inline-block mt-0.5 px-1.5 py-px rounded-full" :class="product.type === 'hardware' ? 'bg-brand-50 text-brand-600' : product.type === 'software' ? 'bg-teal-50 text-teal-700' : 'bg-surface-hover text-content-secondary'">{{ product.type === 'hardware' ? '硬件' : product.type === 'software' ? '软件' : '服务' }}</p>
            <p v-if="product.category?.name" class="text-[11px] text-content-muted truncate">{{ product.category.name }}</p>
          </div>
        </div>

        <!-- 价格 / 库存 行 -->
        <div class="flex items-baseline justify-between mb-2.5">
          <div>
            <span class="text-base font-medium text-brand-500">{{ formatMoney(product.standardPrice) }}</span>
            <span v-if="product.costPrice" class="text-xs text-content-muted ml-1.5">/ 成本 {{ formatMoney(product.costPrice) }}</span>
          </div>
          <div class="text-xs font-medium" :class="(product.stockQuantity ?? 0) > 0 ? 'text-teal-600' : 'text-danger-500'">
            <span v-if="(product.stockQuantity ?? 0) > 0">库存 {{ product.stockQuantity }}</span>
            <span v-else>缺货</span>
          </div>
        </div>

        <!-- 库存进度条 -->
        <div v-if="(product.stockQuantity ?? 0) > 0" class="h-1 rounded-full bg-surface-hover mb-3">
          <div
            class="h-full rounded-full transition-all"
            :class="(product.stockQuantity ?? 0) >= 100 ? 'bg-teal-400' : (product.stockQuantity ?? 0) >= 10 ? 'bg-brand-400' : 'bg-danger-400'"
            :style="{ width: Math.min(100, ((product.stockQuantity ?? 0) / 100) * 100) + '%' }"
          />
        </div>
        <div v-else class="mb-3" />

        <!-- 底部操作 -->
        <div class="flex items-center justify-between">
          <StatusBadge :value="product.status" enum-type="productStatus" />
          <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
            <UButton :icon="product.status === 'on_sale' ? 'i-lucide-eye-off' : 'i-lucide-eye'" variant="ghost" :color="product.status === 'on_sale' ? 'neutral' : 'success'" size="xs" @click="toggleStatus(product)" />
            <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditModal(product)" />
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = product; showDeleteModal = true" />
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图（精简） -->
    <div v-else class="space-y-1">
      <div v-for="product in products" :key="product.id" class="em-card !p-2.5 flex items-center gap-3 hover:shadow-sm transition-shadow group cursor-pointer" @click="$router.push(`/dashboard/products/${product.id}`)">
        <div :class="['w-1 h-10 rounded-full shrink-0', product.status === 'on_sale' ? 'bg-teal-400' : 'bg-line']" />
        <div class="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center shrink-0 overflow-hidden">
          <img v-if="product.images?.[0]?.url" :src="product.images[0].url" class="w-full h-full object-cover rounded-lg" />
          <UIcon v-else name="i-lucide-package" class="w-5 h-5 text-content-muted" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary truncate">{{ product.name }}</span>
            <span class="text-xs text-content-muted">{{ product.code }}</span>
            <span v-if="product.type" class="text-[10px] px-1.5 py-px rounded-full" :class="product.type === 'hardware' ? 'bg-brand-50 text-brand-600' : product.type === 'software' ? 'bg-teal-50 text-teal-700' : 'bg-surface-hover text-content-secondary'">{{ product.type === 'hardware' ? '硬件' : product.type === 'software' ? '软件' : '服务' }}</span>
            <StatusBadge :value="product.status" enum-type="productStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span v-if="product.category?.name"><UIcon name="i-lucide-tag" class="w-3 h-3 inline-block mr-0.5" />{{ product.category.name }}</span>
            <span v-if="product.costPrice">成本 {{ formatMoney(product.costPrice) }}</span>
            <span class="font-medium" :class="(product.stockQuantity ?? 0) > 0 ? 'text-teal-600' : 'text-danger-500'">库存 {{ product.stockQuantity ?? 0 }}</span>
          </div>
        </div>
        <span class="text-brand-500 text-sm font-medium whitespace-nowrap">{{ formatMoney(product.standardPrice) }}</span>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <UButton :icon="product.status === 'on_sale' ? 'i-lucide-eye-off' : 'i-lucide-eye'" variant="ghost" :color="product.status === 'on_sale' ? 'neutral' : 'success'" size="xs" @click="toggleStatus(product)" />
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditModal(product)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = product; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchProducts" @next="fetchProducts" />

    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="添加产品" subtitle="新增一个产品到目录里" size="standard" :loading="createLoading" @confirm="handleCreate">
      <ProductForm v-model="createForm" mode="create" @submit="handleCreate">
        <template #category-select>
          <EnumSelect :model-value="createForm.categoryId" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="选择分类" @update:model-value="createForm.categoryId = $event" />
        </template>
      </ProductForm>
    </FormModal>

    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑产品" size="standard" :loading="editLoading" @confirm="handleEdit">
      <ProductForm v-model="editForm" mode="edit" @submit="handleEdit">
        <template #category-select>
          <EnumSelect :model-value="editForm.categoryId" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="选择分类" @update:model-value="editForm.categoryId = $event" />
        </template>
        <template #status-select>
          <EnumSelect :model-value="editForm.status" dict="productStatus" placeholder="选择状态" @update:model-value="editForm.status = $event" />
        </template>
      </ProductForm>
    </FormModal>

    <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除" :message="`确定要删除产品「${deleteTarget?.name}」吗？删了就找不回来了。`" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" />
  </div>
</template>
