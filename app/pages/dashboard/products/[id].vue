<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '产品详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const productId = route.params.id as string

const product = ref<any>(null)
const loading = ref(true)

const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})
const categoryOptions = ref<any[]>([])

const showDeleteModal = ref(false)
const deleteLoading = ref(false)

const _imageMgr = ref()
const _specMgr = ref()
const _inventoryMgr = ref()

function triggerUpload() {
  const el = document.getElementById('product-image-input') as HTMLInputElement | null
  el?.click()
}

const profitMargin = computed(() => {
  if (!product.value) return null
  const sp = Number(product.value.standardPrice || 0)
  const cp = Number(product.value.costPrice || 0)
  if (sp === 0) return null
  return ((sp - cp) / sp * 100).toFixed(1)
})

function mainImageUrl(productImages: any[]) {
  if (!productImages.length) return ''
  const img = productImages[0]
  return img.filePath?.startsWith('/uploads') ? img.filePath : `/api/files/${img.fileName}`
}

async function fetchDetail() {
  loading.value = true
  try {
    const res = await $api(`/api/products/${productId}`) as any
    if (res?.code === 0) product.value = res.data
    else { toast.add({ title: '产品不存在', color: 'error' }); router.push('/dashboard/products') }
  } catch { toast.add({ title: '加载出了点问题', color: 'error' }) }
  finally { loading.value = false }
}

async function fetchCategories() {
  try { const res = await $api('/api/product-categories') as any; if (res?.code === 0) categoryOptions.value = res.data || [] } catch {}
}

function openEditModal() {
  editForm.value = { name: product.value.name, code: product.value.code, categoryId: product.value.category?.id || product.value.categoryId || '', standardPrice: product.value.standardPrice || 0, costPrice: product.value.costPrice || 0, description: product.value.description || '', status: product.value.status }
  fetchCategories()
  showEditModal.value = true
}

async function handleEdit() {
  editLoading.value = true
  try {
    const res = await $api(`/api/products/${productId}`, { method: 'PUT', body: editForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); showEditModal.value = false; fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' }) }
  finally { editLoading.value = false }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/products/${productId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); router.push('/dashboard/products') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false; showDeleteModal.value = false }
}

async function toggleStatus() {
  try {
    await $api(`/api/products/${productId}/toggle-status`, { method: 'POST' })
    toast.add({ title: '切换好了', color: 'success' }); fetchDetail()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作出了点问题', color: 'error' }) }
}

onMounted(() => { fetchDetail() })
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="!product" class="text-center py-12 text-content-muted">产品不存在</div>
    <template v-else>
      <div class="mb-6">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/products')" />
      </div>

      <ProductDetailCard
        :product="product"
        :profit-margin="profitMargin"
        :main-image-url="mainImageUrl(product.productImages || [])"
        @edit="openEditModal"
        @toggle-status="toggleStatus"
        @delete="showDeleteModal = true"
        @upload-image="triggerUpload"
      />
      <input id="product-image-input" type="file" accept="image/*" class="hidden" @change="_imageMgr?.onFileSelect($event)" />

      <ImageManager ref="_imageMgr" :product-id="productId" />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div class="em-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-content-secondary">产品描述</h3>
            <UButton size="xs" variant="ghost" color="primary" icon="i-lucide-pen-line" @click="openEditModal">编辑</UButton>
          </div>
          <p v-if="product.description" class="text-sm text-content-secondary whitespace-pre-wrap leading-relaxed">{{ product.description }}</p>
          <p v-else class="text-xs text-content-muted">暂无描述</p>
        </div>

        <SpecManager ref="_specMgr" :product-id="productId" />
      </div>

      <InventoryTransactionManager ref="_inventoryMgr" :product-id="productId" @inventory-changed="fetchDetail()" />

      <div class="flex items-center gap-4 text-xs text-content-muted">
        <span>创建于 {{ formatDate(product.createdAt) }}</span>
        <span>最近更新 {{ formatDate(product.updatedAt) }}</span>
      </div>

      <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑产品" size="standard" :loading="editLoading" @confirm="handleEdit">
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">产品名称 <span class="text-danger-500">*</span></label><input v-model="editForm.name" type="text" class="w-full input-base focus-ring" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">产品编码</label><input v-model="editForm.code" type="text" disabled class="w-full input-base bg-surface-page text-content-muted" /></div>
          </div>
          <div><label class="block text-sm text-content-secondary mb-1">产品分类</label><EnumSelect v-model="editForm.categoryId" :options="categoryOptions.map(c => ({ value: c.id, label: c.name }))" placeholder="未分类" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">标准价格</label><input v-model.number="editForm.standardPrice" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">成本价格</label><input v-model.number="editForm.costPrice" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
          </div>
          <div><label class="block text-sm text-content-secondary mb-1">描述</label><textarea v-model="editForm.description" rows="3" class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" /></div>
        </form>
      </FormModal>

      <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除" :message="`确定要删除产品「${product.name}」吗？删了就找不回来了。`" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" />
    </template>
  </div>
</template>
