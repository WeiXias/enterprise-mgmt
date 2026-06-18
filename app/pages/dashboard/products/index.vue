<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '产品', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const { loading, list: products, total, page, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchProducts } = useTable<any>({ apiUrl: '/api/products' })

const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })
const categoryFilter = ref('')
watch(categoryFilter, (v) => { setFilter('categoryId', v); onFilterChange() })

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

const showCategoryModal = ref(false)

async function fetchCategories() {
  try { const res = await $api('/api/product-categories') as any; if (res?.code === 0) categories.value = res.data } catch { /* ignore */ }
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
  editForm.value = { id: product.id, name: product.name, code: product.code, categoryId: product.category?.id || product.categoryId || '', standardPrice: product.standardPrice || 0, costPrice: product.costPrice || 0, description: product.description || '', status: product.status }
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
          <UButton icon="i-lucide-tag" variant="ghost" color="neutral" size="sm" @click="showCategoryModal = true">分类</UButton>
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; createForm = { name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' }; fetchCategories()">添加产品</UButton>
        </div>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
        <input v-model="keyword" type="text" placeholder="搜产品名、编码..." class="w-full pl-9 input-base focus-ring transition-colors" @input="onSearchInput" />
      </div>
      <EnumSelect v-model="categoryFilter" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="全部分类" />
      <EnumSelect v-model="statusFilter" dict="productStatus" placeholder="全部状态" />
      <span class="text-xs text-content-secondary">共 {{ total }} 个产品</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-secondary">加载中...</div>
    <div v-else-if="products.length === 0" class="text-center py-12 text-content-secondary">
      <UIcon name="i-lucide-package" class="w-10 h-10 mx-auto mb-2 text-line" />
      <p class="text-sm">还没有产品，加一个？</p>
      <UButton class="mt-3" size="sm" color="primary" @click="showCreateModal = true; createForm = { name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' }; fetchCategories()">添加产品</UButton>
    </div>
    <div v-else class="space-y-2">
      <ProductListItem v-for="product in products" :key="product.id" :product="product" @toggle-status="toggleStatus" @edit="openEditModal" @delete="deleteTarget = $event; showDeleteModal = true" />
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

    <CategoryManager v-if="showCategoryModal" v-model:open="showCategoryModal" @saved="fetchCategories(); fetchProducts()" />
  </div>
</template>
