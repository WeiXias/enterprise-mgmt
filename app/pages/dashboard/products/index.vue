<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '产品', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

// 列表数据（useTable 管理 loading/list/total/page/pageSize/keyword/totalPages/搜索防抖/筛选）
const {
  loading,
  list: products,
  total,
  page,
  pageSize,
  keyword,
  totalPages,
  onSearchInput,
  onFilterChange,
  setFilter,
  fetchList: fetchProducts,
} = useTable<any>({ apiUrl: '/api/products' })

// 状态筛选（watch 同步到 useTable filters）
const statusFilter = ref('')
watch(statusFilter, (v) => {
  setFilter('status', v)
  onFilterChange()
})

// 分类筛选（同样同步到 useTable filters）
const categoryFilter = ref('')
watch(categoryFilter, () => {
  setFilter('categoryId', categoryFilter.value)
  onFilterChange()
})

// 分类列表
const categories = ref<any[]>([])

// 新增产品弹窗
const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({
  name: '',
  code: '',
  categoryId: '',
  standardPrice: 0,
  costPrice: 0,
  description: '',
})

// 编辑产品弹窗
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 删除确认
const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

// 分类管理弹窗
const showCategoryModal = ref(false)
const categoryLoading = ref(false)
const categoryForm = ref({ name: '', sort: '0' })
const editingCategoryId = ref<string | null>(null)

async function fetchCategories() {
  try {
    const res = await $api('/api/product-categories') as any
    if (res?.code === 0) {
      categories.value = res.data
    }
  } catch (e) {
    // 忽略错误
  }
}

async function handleCreate() {
  if (!createForm.value.name) {
    toast.add({ title: '产品名称得填一下', color: 'warning' })
    return
  }
  createLoading.value = true
  try {
    const res = await $api('/api/products', {
      method: 'POST',
      body: createForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！产品已添加', color: 'success' })
      showCreateModal.value = false
      resetCreateForm()
      fetchProducts()
    }
  } catch (err: any) {
    const msg = err?.data?.message || '添加出了点问题'
    toast.add({ title: msg, color: 'error' })
  } finally {
    createLoading.value = false
  }
}

function openEditModal(product: any) {
  editForm.value = {
    id: product.id,
    name: product.name,
    code: product.code,
    categoryId: product.category?.id || product.categoryId || '',
    standardPrice: product.standardPrice || 0,
    costPrice: product.costPrice || 0,
    description: product.description || '',
    status: product.status,
  }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) {
    toast.add({ title: '产品名称不能为空', color: 'warning' })
    return
  }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/products/${id}`, {
      method: 'PUT',
      body: data,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchProducts()
    }
  } catch (err: any) {
    const msg = err?.data?.message || '保存出了点问题'
    toast.add({ title: msg, color: 'error' })
  } finally {
    editLoading.value = false
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/products/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      fetchProducts()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

async function toggleStatus(product: any) {
  try {
    const res = await $api(`/api/products/${product.id}/toggle-status`, { method: 'POST' }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '状态已切换', color: 'success' })
      fetchProducts()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
}

// 分类管理
function openAddCategory() {
  editingCategoryId.value = null
  categoryForm.value = { name: '', sort: '0' }
  showCategoryModal.value = true
}

function openEditCategory(cat: any) {
  editingCategoryId.value = cat.id
  categoryForm.value = { name: cat.name, sort: cat.sort || '0' }
  showCategoryModal.value = true
}

async function handleSaveCategory() {
  if (!categoryForm.value.name) {
    toast.add({ title: '分类名称得填一下', color: 'warning' })
    return
  }
  categoryLoading.value = true
  try {
    let res: any
    if (editingCategoryId.value) {
      res = await $api(`/api/product-categories/${editingCategoryId.value}`, {
        method: 'PUT',
        body: categoryForm.value,
      }) as any
    } else {
      res = await $api('/api/product-categories', {
        method: 'POST',
        body: categoryForm.value,
      }) as any
    }
    if (res?.code === 0) {
      toast.add({ title: editingCategoryId.value ? '已保存' : '分类已添加', color: 'success' })
      showCategoryModal.value = false
      fetchCategories()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  } finally {
    categoryLoading.value = false
  }
}

async function handleDeleteCategory(cat: any) {
  try {
    const res = await $api(`/api/product-categories/${cat.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '分类已删除', color: 'success' })
      fetchCategories()
      if (categoryFilter.value === cat.id) {
        categoryFilter.value = ''
        fetchProducts()
      }
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
}

function resetCreateForm() {
  createForm.value = {
    name: '', code: '', categoryId: '',
    standardPrice: 0, costPrice: 0, description: '',
  }
}

function formatPrice(price: number | null) {
  if (!price && price !== 0) return '-'
  return '¥' + Number(price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<template>
  <div>
    <!-- 页面标题 + 操作按钮 -->
    <PageHeader title="产品" description="产品和价格都在这里管">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm(); fetchCategories()">
            添加产品
          </UButton>
        </div>
      </template>
    </PageHeader>

    <!-- 搜索筛选栏 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜产品名、编码..."
          class="w-full pl-9 input-base focus-ring transition-colors"
          @input="onSearchInput"
        />
      </div>
      <EnumSelect
        v-model="categoryFilter"
        :options="categories.map(c => ({ value: c.id, label: c.name }))"
        placeholder="全部分类"
      />
      <EnumSelect
        v-model="statusFilter"
        dict="productStatus"
        placeholder="全部状态"
      />
      <span class="text-xs text-content-secondary">共 {{ total }} 个产品</span>
    </div>

    <!-- 产品列表 -->
    <div v-if="loading" class="text-center py-12 text-content-secondary">加载中...</div>
    <div v-else-if="products.length === 0" class="text-center py-12 text-content-secondary">
      <UIcon name="i-lucide-package" class="w-10 h-10 mx-auto mb-2 text-line" />
      <p class="text-sm">还没有产品，加一个？</p>
      <UButton class="mt-3" size="sm" color="primary" @click="showCreateModal = true; resetCreateForm(); fetchCategories()">添加产品</UButton>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="product in products"
        :key="product.id"
        class="em-card flex items-center gap-4 hover:shadow-sm transition-shadow group"
      >
        <!-- 状态色条 -->
        <div
          :class="['w-1 h-10 rounded-full flex-shrink-0', product.status === 'on_sale' ? 'bg-teal-400' : 'bg-line']"
        />

        <!-- 主体信息（点击跳详情） -->
        <div class="flex-1 min-w-0 cursor-pointer" @click="$router.push(`/dashboard/products/${product.id}`)">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary truncate">{{ product.name }}</span>
            <span class="text-xs text-content-secondary">{{ product.code }}</span>
            <StatusBadge :value="product.status" enum-type="productStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-secondary">
            <span v-if="product.category?.name">
              <UIcon name="i-lucide-tag" class="w-3 h-3 inline-block mr-0.5" />
              {{ product.category.name }}
            </span>
            <span>
              <UIcon name="i-lucide-coins" class="w-3 h-3 inline-block mr-0.5" />
              标价 {{ formatPrice(product.standardPrice) }}
            </span>
            <span v-if="product.costPrice">
              成本 {{ formatPrice(product.costPrice) }}
            </span>
            <span class="font-medium text-teal-600">
              库存 {{ product.stockQuantity ?? 0 }}
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-1" @click.stop>
          <UButton
            :icon="product.status === 'on_sale' ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            variant="ghost"
            :color="product.status === 'on_sale' ? 'neutral' : 'success'"
            size="xs"
            @click="toggleStatus(product)"
          >
            {{ product.status === 'on_sale' ? '下架' : '上架' }}
          </UButton>
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditModal(product)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = product; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchProducts" @next="fetchProducts" />

    <!-- 新增产品弹窗 -->
    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="添加产品" subtitle="新增一个产品到目录里" size="standard" :loading="createLoading" @confirm="handleCreate">
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">基本信息</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">产品名称 <span class="text-danger-600">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="产品名称" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">产品编码 <span class="text-xs text-content-secondary">(留空时帮你填好)</span></label>
            <input v-model="createForm.code" type="text" placeholder="留空时帮你填好" class="w-full input-base focus-ring" />
          </div>
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">产品分类</label>
        <div class="flex gap-2">
          <div class="flex-1"><EnumSelect v-model="createForm.categoryId" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="选择分类" /></div>
        </div>
      </div>
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4 mt-3">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">价格信息</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">标准价格</label>
            <input v-model.number="createForm.standardPrice" type="number" min="0" step="0.01" placeholder="0.00" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">成本价格</label>
            <input v-model.number="createForm.costPrice" type="number" min="0" step="0.01" placeholder="0.00" class="w-full input-base focus-ring" />
          </div>
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">描述</label>
        <textarea v-model="createForm.description" rows="3" placeholder="简单描述一下这个产品..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" />
      </div>
    </FormModal>

    <!-- 编辑产品弹窗 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑产品" subtitle="修改产品信息和价格" size="standard" :loading="editLoading" @confirm="handleEdit">
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">基本信息</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">产品名称 <span class="text-danger-600">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">产品编码</label>
            <input v-model="editForm.code" type="text" class="w-full input-base focus-ring" />
          </div>
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">产品分类</label>
        <EnumSelect v-model="editForm.categoryId" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="选择分类" />
      </div>
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4 mt-3">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">价格与状态</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">标准价格</label>
            <input v-model.number="editForm.standardPrice" type="number" min="0" step="0.01" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">成本价格</label>
            <input v-model.number="editForm.costPrice" type="number" min="0" step="0.01" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div class="mt-3">
          <label class="block text-sm text-content-secondary mb-1">状态</label>
          <EnumSelect v-model="editForm.status" dict="productStatus" placeholder="选择状态" />
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">描述</label>
        <textarea v-model="editForm.description" rows="3" class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" />
      </div>
    </FormModal>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除产品「${deleteTarget?.name}」吗？删了就找不回来了。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 分类管理弹窗 -->
    <FormModal v-if="showCategoryModal" v-model:open="showCategoryModal" :title="editingCategoryId ? '编辑分类' : '管理分类'" size="compact" :loading="categoryLoading" @confirm="handleSaveCategory">
      <div class="space-y-3">
        <div class="flex gap-2">
          <input
            v-model="categoryForm.name"
            type="text"
            placeholder="分类名称"
            class="flex-1 input-base focus-ring"
            @keydown.enter="handleSaveCategory"
          />
        </div>

        <div v-if="categories.length === 0" class="text-xs text-content-secondary text-center py-4">
          还没有分类，先加一个？
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-line-light/40 group"
          >
            <span class="text-sm text-content-primary">{{ cat.name }}</span>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditCategory(cat)">编辑</UButton>
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDeleteCategory(cat)">删除</UButton>
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  </div>
</template>