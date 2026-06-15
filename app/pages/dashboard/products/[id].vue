<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '产品详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const productId = route.params.id as string

const product = ref<any>(null)
const loading = ref(true)

// 编辑弹窗
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})
const categoryOptions = ref<any[]>([])

// 删除
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

// 图片
const productImages = ref<any[]>([])
const imageUploading = ref(false)
const imagesLoading = ref(false)

// 规格
const productSpecs = ref<any[]>([])
const specsLoading = ref(false)
const specEditing = ref(false)
const specTemplateOptions = [
  { value: 'spec_template_hardware', label: '硬件规格' },
  { value: 'spec_template_software', label: '软件规格' },
  { value: 'spec_template_service', label: '服务规格' },
]
const editSpecTemplate = ref('')
const editSpecItems = ref<{ key: string; label: string }[]>([])
const editSpecValues = ref<Record<string, string>>({})
const specSaving = ref(false)

// 库存流水
const transactions = ref<any[]>([])
const showInventoryModal = ref(false)
const inventorySaving = ref(false)
const inventoryForm = ref({ type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' })

const statusConfig: Record<string, { label: string; color: string }> = {
  on_sale: { label: '在售', color: 'bg-teal-50 text-teal-700' },
  off_shelf: { label: '已下架', color: 'bg-surface-hover text-content-muted' },
}

function formatPrice(price: number | null) {
  if (!price && price !== 0) return '-'
  return '¥' + Number(price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return date.slice(0, 10)
}

function getStatusLabel(status: string) { return statusConfig[status]?.label || status }
function getStatusColor(status: string) { return statusConfig[status]?.color || 'bg-surface-hover text-content-muted' }

const profitMargin = computed(() => {
  if (!product.value) return null
  const sp = Number(product.value.standardPrice || 0)
  const cp = Number(product.value.costPrice || 0)
  if (sp === 0) return null
  return ((sp - cp) / sp * 100).toFixed(1)
})

async function fetchDetail() {
  loading.value = true
  try {
    const res = await $api(`/api/products/${productId}`) as any
    if (res?.code === 0) product.value = res.data
    else { toast.add({ title: '产品不存在', color: 'error' }); router.push('/dashboard/products') }
  } catch { toast.add({ title: '加载失败', color: 'error' }) }
  finally { loading.value = false }
}

async function fetchCategories() {
  try { const res = await $api('/api/product-categories') as any; if (res?.code === 0) categoryOptions.value = res.data || [] } catch {}
}

async function fetchTransactions() {
  try { const res = await $api(`/api/products/${productId}/transactions`, { params: { pageSize: 200 } }) as any; if (res?.code === 0) transactions.value = res.data.items || [] } catch {}
}

function openEditModal() {
  editForm.value = {
    name: product.value.name, code: product.value.code,
    categoryId: product.value.category?.id || product.value.categoryId || '',
    standardPrice: product.value.standardPrice || 0,
    costPrice: product.value.costPrice || 0,
    description: product.value.description || '',
    status: product.value.status,
  }
  fetchCategories()
  showEditModal.value = true
}

async function handleEdit() {
  editLoading.value = true
  try {
    const res = await $api(`/api/products/${productId}`, { method: 'PUT', body: editForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); showEditModal.value = false; fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
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
    toast.add({ title: '状态已切换', color: 'success' })
    fetchDetail()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
}

async function handleSaveInventory() {
  if (!inventoryForm.value.quantity) { toast.add({ title: '数量还没填', color: 'warning' }); return }
  inventorySaving.value = true
  try {
    await $api('/api/inventory/transactions', { method: 'POST', body: { ...inventoryForm.value, productId } })
    toast.add({ title: '已登记', color: 'success' })
    showInventoryModal.value = false
    inventoryForm.value = { type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' }
    fetchTransactions()
    fetchDetail()
  } catch (err: any) { toast.add({ title: err?.data?.message || '登记失败', color: 'error' }) }
  finally { inventorySaving.value = false }
}

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
    fetchTransactions()
    fetchDetail()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { showDeleteDialog.value = false }
}

// ---- 图片 ----
async function fetchImages() {
  imagesLoading.value = true
  try { const res = await $api(`/api/products/${productId}/images`) as any; if (res?.code === 0) productImages.value = res.data } catch {}
  finally { imagesLoading.value = false }
}

function onImageSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  uploadImage(files[0]!)
  input.value = ''
}

async function uploadImage(file: File) {
  if (file.size > 10 * 1024 * 1024) { toast.add({ title: '图片不能超过 10MB', color: 'warning' }); return }
  imageUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch(`/api/products/${productId}/images`, { method: 'POST', body: fd }) as any
    if (res?.code === 0) { toast.add({ title: '图片已上传', color: 'success' }); fetchImages() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '上传失败', color: 'error' }) }
  finally { imageUploading.value = false }
}

async function deleteImage(imageId: string) {
  try {
    const res = await $api(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '图片已删除', color: 'success' }); fetchImages() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

function getImageUrl(img: any) {
  return img.filePath?.startsWith('/uploads') ? img.filePath : `/api/files/${img.fileName}`
}

// ---- 规格 ----
async function fetchSpecs() {
  specsLoading.value = true
  try { const res = await $api(`/api/products/${productId}/specs`) as any; if (res?.code === 0) productSpecs.value = res.data } catch {}
  finally { specsLoading.value = false }
}

async function loadSpecTemplate(type: string) {
  editSpecItems.value = []
  editSpecValues.value = {}
  if (!type) return
  try {
    const res = await $api(`/api/dict/${type}`) as any
    if (res?.code === 0 && res.data?.length) {
      editSpecItems.value = res.data.map((item: any) => ({ key: item.value, label: item.label }))
      for (const item of res.data) editSpecValues.value[item.value] = ''
    }
  } catch {}
}

watch(editSpecTemplate, loadSpecTemplate)

function startEditSpecs() {
  specEditing.value = true
  const existing = productSpecs.value[0]
  editSpecTemplate.value = existing?.specTemplate || ''
  setTimeout(() => loadSpecTemplate(editSpecTemplate.value), 200)
}

async function saveSpecs() {
  const specs = editSpecItems.value
    .filter(item => editSpecValues.value[item.key]?.trim())
    .map(item => ({ specTemplate: editSpecTemplate.value, specKey: item.key, specValue: editSpecValues.value[item.key].trim() }))
  if (!specs.length) { toast.add({ title: '还没填规格值呢', color: 'warning' }); return }
  specSaving.value = true
  try {
    await $api(`/api/products/${productId}/specs`, { method: 'PUT', body: { specs } })
    toast.add({ title: '规格已保存', color: 'success' })
    specEditing.value = false
    fetchSpecs()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { specSaving.value = false }
}

onMounted(() => { fetchDetail(); fetchTransactions(); fetchImages(); fetchSpecs() })
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="!product" class="text-center py-12 text-content-muted">产品不存在</div>
    <template v-else>
      <!-- 返回 -->
      <div class="mb-6">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/products')" />
      </div>

      <!-- 顶部：图片 + 基本信息 -->
      <div class="em-card mb-5">
        <div class="flex gap-6">
          <!-- 左侧图片 -->
          <div class="w-72 shrink-0">
            <div v-if="productImages.length" class="rounded-xl overflow-hidden bg-black/[0.02] aspect-square">
              <img :src="getImageUrl(productImages[0])" class="w-full h-full object-cover" />
            </div>
            <div v-else class="rounded-xl bg-surface-hover aspect-square flex items-center justify-center">
              <UIcon name="i-lucide-package" class="w-12 h-12 text-content-muted" />
            </div>
            <div v-if="productImages.length > 1" class="flex gap-2 mt-2">
              <div v-for="(img, idx) in productImages.slice(1, 5)" :key="img.id" class="w-14 h-14 rounded-lg overflow-hidden border border-line">
                <img :src="getImageUrl(img)" class="w-full h-full object-cover" />
              </div>
              <div v-if="productImages.length > 5" class="w-14 h-14 rounded-lg bg-surface-hover flex items-center justify-center text-xs text-content-muted">
                +{{ productImages.length - 5 }}
              </div>
            </div>
          </div>

          <!-- 右侧信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-3">
              <h1 class="text-xl font-medium text-content-primary">{{ product.name }}</h1>
              <span :class="['text-[11px] px-2 py-0.5 rounded-full', getStatusColor(product.status)]">{{ getStatusLabel(product.status) }}</span>
            </div>
            <p class="text-xs text-content-muted mb-4">编码 {{ product.code }} {{ product.category ? ' · ' + product.category.name : '' }}</p>

            <!-- 价格库存 -->
            <div class="grid grid-cols-4 gap-4 mb-5">
              <div><span class="text-xs text-content-muted">标准价格</span><p class="text-base font-medium text-content-primary">{{ formatPrice(product.standardPrice) }}</p></div>
              <div><span class="text-xs text-content-muted">成本价格</span><p class="text-base text-content-secondary">{{ formatPrice(product.costPrice) }}</p></div>
              <div><span class="text-xs text-content-muted">利润率</span><p class="text-base" :class="profitMargin && Number(profitMargin) > 0 ? 'text-teal-600' : 'text-content-muted'">{{ profitMargin !== null ? profitMargin + '%' : '-' }}</p></div>
              <div><span class="text-xs text-content-muted">当前库存</span><p class="text-base font-medium" :class="(product.stockQuantity ?? 0) > 0 ? 'text-teal-600' : 'text-red-400'">{{ product.stockQuantity ?? 0 }}</p></div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-2">
              <UButton size="xs" color="primary" icon="i-lucide-pen-line" @click="openEditModal">编辑</UButton>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-upload" :loading="imageUploading" @click="document.getElementById('product-image-input')?.click()">上传图片</UButton>
              <input id="product-image-input" type="file" accept="image/*" class="hidden" @change="onImageSelect" />
              <UButton size="xs" :icon="product.status === 'on_sale' ? 'i-lucide-eye-off' : 'i-lucide-eye'" :color="product.status === 'on_sale' ? 'neutral' : 'success'" variant="ghost" @click="toggleStatus">{{ product.status === 'on_sale' ? '下架' : '上架' }}</UButton>
              <div class="flex-1" />
              <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="showDeleteModal = true">删除</UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- 全部图片 -->
      <div v-if="productImages.length > 1" class="mb-5">
        <h3 class="text-sm font-medium text-content-secondary mb-3">全部图片 ({{ productImages.length }})</h3>
        <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          <div v-for="img in productImages" :key="img.id" class="relative group rounded-lg border border-line overflow-hidden aspect-square">
            <img :src="getImageUrl(img)" class="w-full h-full object-cover" />
            <button class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" @click="deleteImage(img.id)"><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
          </div>
        </div>
      </div>

      <!-- 描述 + 规格（双栏）-->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <!-- 产品描述 -->
        <div class="em-card">
          <h3 class="text-sm font-medium text-content-secondary mb-3">产品描述</h3>
          <p v-if="product.description" class="text-sm text-content-secondary whitespace-pre-wrap leading-relaxed">{{ product.description }}</p>
          <p v-else class="text-xs text-content-muted">暂无描述</p>
        </div>

        <!-- 规格参数 -->
        <div class="em-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-content-secondary">规格参数</h3>
            <UButton v-if="!specEditing" size="xs" variant="ghost" color="primary" icon="i-lucide-pen-line" @click="startEditSpecs">编辑</UButton>
          </div>

          <div v-if="specEditing" class="space-y-3">
            <EnumSelect v-model="editSpecTemplate" :options="specTemplateOptions" placeholder="选择规格模板" />
            <div v-if="editSpecItems.length" class="space-y-2">
              <div v-for="item in editSpecItems" :key="item.key" class="flex items-center gap-2">
                <span class="text-sm text-content-secondary w-20 shrink-0">{{ item.label }}</span>
                <input v-model="editSpecValues[item.key]" type="text" :placeholder="`填写${item.label}`" class="flex-1 input-base focus-ring text-sm" />
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <UButton size="xs" color="primary" :loading="specSaving" @click="saveSpecs">保存</UButton>
              <UButton size="xs" variant="ghost" color="neutral" @click="specEditing = false">算了</UButton>
            </div>
          </div>

          <div v-else>
            <div v-if="specsLoading" class="text-center py-4 text-content-muted text-xs">加载中...</div>
            <div v-else-if="!productSpecs.length" class="text-xs text-content-muted py-4">暂无规格，点击编辑添加</div>
            <div v-else>
              <div v-for="group in [...new Set(productSpecs.map(s => s.specTemplate))]" :key="group" class="mb-3 last:mb-0">
                <h4 class="text-[10px] font-medium text-content-muted uppercase tracking-wide mb-1.5">{{ specTemplateOptions.find(o => o.value === group)?.label || group }}</h4>
                <div class="space-y-1">
                  <div v-for="s in productSpecs.filter(s => s.specTemplate === group)" :key="s.id" class="flex items-center gap-3 text-sm">
                    <span class="text-content-muted w-20 shrink-0">{{ s.specKey }}</span>
                    <span class="text-content-primary">{{ s.specValue }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 库存流水 -->
      <div class="em-card mb-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-secondary">库存流水</h3>
          <UButton size="xs" variant="ghost" color="primary" icon="i-lucide-plus" @click="showInventoryModal = true; inventoryForm = { type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' }">登记流水</UButton>
        </div>
        <div v-if="!transactions?.length" class="text-center py-8 text-content-muted text-sm">暂无库存流水</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-line-light text-left text-xs text-content-muted">
                <th class="py-2 px-3">类型</th><th class="py-2 px-3 text-right">数量</th><th class="py-2 px-3 text-right">单价</th><th class="py-2 px-3">批次</th><th class="py-2 px-3">备注</th><th class="py-2 px-3">时间</th><th class="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in transactions" :key="t.id" class="border-b border-line-light">
                <td class="py-2 px-3"><span :class="['text-[10px] px-1.5 py-0.5 rounded-full', t.type === 'inbound' ? 'bg-teal-50 text-teal-700' : t.type === 'outbound' ? 'bg-red-50 text-red-600' : 'bg-surface-hover text-content-muted']">{{ ({ inbound: '入库', outbound: '出库', adjustment: '盘点' } as Record<string, string>)[t.type] || t.type }}</span></td>
                <td class="py-2 px-3 text-right" :class="t.quantity > 0 ? 'text-teal-600' : 'text-red-500'">{{ t.quantity > 0 ? '+' + t.quantity : t.quantity }}</td>
                <td class="py-2 px-3 text-right text-content-secondary">{{ t.unitPrice ? '¥' + t.unitPrice : '-' }}</td>
                <td class="py-2 px-3 text-xs text-content-muted">{{ t.batchNo || '-' }}</td>
                <td class="py-2 px-3 text-xs text-content-muted max-w-[120px] truncate">{{ t.remark || '-' }}</td>
                <td class="py-2 px-3 text-xs text-content-muted">{{ formatDate(t.createdAt) }}</td>
                <td class="py-2 px-3"><UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="promptDelete(t)" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 时间线 -->
      <div class="flex items-center gap-4 text-xs text-content-muted">
        <span>创建于 {{ formatDate(product.createdAt) }}</span>
        <span>最近更新 {{ formatDate(product.updatedAt) }}</span>
      </div>

      <!-- 弹窗 -->
      <FormModal v-if="showInventoryModal" v-model:open="showInventoryModal" title="登记库存流水" size="compact" :loading="inventorySaving" @confirm="handleSaveInventory">
        <form class="space-y-3" @submit.prevent="handleSaveInventory">
          <div><label class="block text-sm text-content-secondary mb-1">类型</label><EnumSelect v-model="inventoryForm.type" dict="inventoryTransactionType" placeholder="选择类型" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">数量 <span class="text-danger-500">*</span></label><input v-model.number="inventoryForm.quantity" type="number" step="1" class="w-full input-base focus-ring" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">单价</label><input v-model.number="inventoryForm.unitPrice" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
          </div>
          <div><label class="block text-sm text-content-secondary mb-1">批次号</label><input v-model="inventoryForm.batchNo" type="text" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">备注</label><input v-model="inventoryForm.remark" type="text" class="w-full input-base focus-ring" /></div>
        </form>
      </FormModal>

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

      <ConfirmDialog
        v-if="showDeleteModal"
        v-model:open="showDeleteModal"
        title="确认删除"
        :message="`确定要删除产品「${product.name}」吗？删了就找不回来了。`"
        confirm-text="确认删除"
        cancel-text="再想想"
        :loading="deleteLoading"
        danger
        @confirm="handleDelete"
      />

      <ConfirmDialog
        v-model:open="showDeleteDialog"
        :danger="true"
        title="删除库存记录"
        message="删除后库存将回退，确定要删吗？"
        @confirm="handleDeletedConfirmed"
      />
    </template>
  </div>
</template>
