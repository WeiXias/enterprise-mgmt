<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '产品', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

// 列表数据
const products = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 搜索筛选
const keyword = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')

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

// 状态配置
const statusConfig: Record<string, { label: string; color: string }> = {
  on_sale: { label: '在售', color: 'bg-teal-50 text-teal-700' },
  off_shelf: { label: '下架', color: 'bg-stone-100 text-stone-500' },
}

async function fetchProducts() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    if (categoryFilter.value) params.categoryId = categoryFilter.value

    const res = await $api('/api/products', { params }) as any
    if (res?.code === 0) {
      products.value = res.data.items
      total.value = res.data.total
    }
  } catch (err: any) {
    toast.add({ title: '加载产品列表出了点问题', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    const res = await $api('/api/product-categories') as any
    if (res?.code === 0) {
      categories.value = res.data
    }
  } catch (e) {
    // 静默处理
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

function getStatusLabel(status: string) {
  return statusConfig[status]?.label || status
}

function getStatusColor(status: string) {
  return statusConfig[status]?.color || 'bg-stone-100 text-stone-500'
}

function formatPrice(price: number | null) {
  if (!price && price !== 0) return '-'
  return '¥' + Number(price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 搜索防抖
let searchTimer: any = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchProducts()
  }, 300)
}

function onFilterChange() {
  page.value = 1
  fetchProducts()
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<template>
  <div>
    <!-- 页面标题 + 操作按钮 -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">产品</h1>
        <p class="text-sm text-stone-400 mt-0.5">产品和价格都在这里管</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-tag" variant="ghost" color="neutral" size="sm" @click="showCategoryModal ? null : (showCategoryModal = false); fetchCategories(); $nextTick(() => { editingCategoryId = null; categoryForm = { name: '', sort: '0' }; showCategoryModal = true })">
          管理分类
        </UButton>
        <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm(); fetchCategories()">
          添加产品
        </UButton>
      </div>
    </div>

    <!-- 搜索筛选栏 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜产品名、编码..."
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
          @input="onSearchInput"
        />
      </div>
      <select
        v-model="categoryFilter"
        class="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
        @change="onFilterChange"
      >
        <option value="">全部分类</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <select
        v-model="statusFilter"
        class="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
        @change="onFilterChange"
      >
        <option value="">全部状态</option>
        <option value="on_sale">在售</option>
        <option value="off_shelf">下架</option>
      </select>
      <span class="text-xs text-stone-400">共 {{ total }} 个产品</span>
    </div>

    <!-- 产品列表 -->
    <div v-if="loading" class="text-center py-12 text-stone-400">加载中...</div>
    <div v-else-if="products.length === 0" class="text-center py-12 text-stone-400">
      <UIcon name="i-lucide-package" class="w-10 h-10 mx-auto mb-2 text-stone-300" />
      <p class="text-sm">还没有产品，加一个？</p>
      <UButton class="mt-3" size="sm" color="primary" @click="showCreateModal = true; resetCreateForm(); fetchCategories()">添加产品</UButton>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="product in products"
        :key="product.id"
        class="warm-card flex items-center gap-4 hover:shadow-sm transition-shadow group"
      >
        <!-- 状态色条 -->
        <div
          :class="['w-1 h-10 rounded-full flex-shrink-0', product.status === 'on_sale' ? 'bg-teal-400' : 'bg-stone-300']"
        />

        <!-- 主体信息（点击跳详情） -->
        <div class="flex-1 min-w-0 cursor-pointer" @click="$router.push(`/dashboard/products/${product.id}`)">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-stone-800 truncate">{{ product.name }}</span>
            <span class="text-xs text-stone-400">{{ product.code }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', getStatusColor(product.status)]">
              {{ getStatusLabel(product.status) }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs text-stone-400">
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
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-stone-400">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1">
        <UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchProducts()">上一页</UButton>
        <UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchProducts()">下一页</UButton>
      </div>
    </div>

    <!-- 新增产品弹窗 -->
    <UModal v-model:open="showCreateModal">
      <template #header>添加产品</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreate">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">产品名称 <span class="text-red-400">*</span></label>
              <input v-model="createForm.name" type="text" placeholder="产品名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">产品编码 <span class="text-stone-400 text-xs">(自动生成)</span></label>
              <input v-model="createForm.code" type="text" placeholder="留空自动生成" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">产品分类</label>
            <div class="flex gap-2">
              <select v-model="createForm.categoryId" class="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="">选择分类</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="sm" @click="editingCategoryId = null; categoryForm = { name: '', sort: '0' }; showCategoryModal = true">添加分类</UButton>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">标准价格</label>
              <input v-model.number="createForm.standardPrice" type="number" min="0" step="0.01" placeholder="0.00" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">成本价格</label>
              <input v-model.number="createForm.costPrice" type="number" min="0" step="0.01" placeholder="0.00" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">描述</label>
            <textarea v-model="createForm.description" rows="3" placeholder="简单描述一下这个产品..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showCreateModal = false">取消</UButton>
          <UButton color="primary" :loading="createLoading" @click="handleCreate">添加</UButton>
        </div>
      </template>
    </UModal>

    <!-- 编辑产品弹窗 -->
    <UModal v-model:open="showEditModal">
      <template #header>编辑产品</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">产品名称 <span class="text-red-400">*</span></label>
              <input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">产品编码</label>
              <input v-model="editForm.code" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">产品分类</label>
            <select v-model="editForm.categoryId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
              <option value="">选择分类</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">标准价格</label>
              <input v-model.number="editForm.standardPrice" type="number" min="0" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">成本价格</label>
              <input v-model.number="editForm.costPrice" type="number" min="0" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">状态</label>
            <select v-model="editForm.status" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
              <option value="on_sale">在售</option>
              <option value="off_shelf">下架</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">描述</label>
            <textarea v-model="editForm.description" rows="3" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
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

    <!-- 删除确认弹窗 -->
    <UModal v-model:open="showDeleteModal">
      <template #header>确认删除</template>
      <template #body>
        <p class="text-sm text-stone-600">
          确定要删除产品「{{ deleteTarget?.name }}」吗？删除后数据将无法恢复。
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showDeleteModal = false; deleteTarget = null">再想想</UButton>
          <UButton color="error" :loading="deleteLoading" @click="handleDelete">确认删除</UButton>
        </div>
      </template>
    </UModal>

    <!-- 分类管理弹窗 -->
    <UModal v-model:open="showCategoryModal">
      <template #header>{{ editingCategoryId ? '编辑分类' : '管理分类' }}</template>
      <template #body>
        <div class="space-y-4">
          <!-- 添加/编辑分类表单 -->
          <div class="flex gap-2">
            <input
              v-model="categoryForm.name"
              type="text"
              placeholder="分类名称"
              class="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              @keydown.enter="handleSaveCategory"
            />
            <UButton color="primary" :loading="categoryLoading" @click="handleSaveCategory">
              {{ editingCategoryId ? '保存' : '添加' }}
            </UButton>
            <UButton v-if="editingCategoryId" variant="ghost" color="neutral" @click="editingCategoryId = null; categoryForm = { name: '', sort: '0' }">取消</UButton>
          </div>

          <!-- 分类列表 -->
          <div v-if="categories.length === 0" class="text-xs text-stone-400 text-center py-4">
            还没有分类，先加一个？
          </div>
          <div v-else class="space-y-1">
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-stone-50 group"
            >
              <span class="text-sm text-stone-700">{{ cat.name }}</span>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditCategory(cat)">编辑</UButton>
                <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDeleteCategory(cat)">删除</UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
