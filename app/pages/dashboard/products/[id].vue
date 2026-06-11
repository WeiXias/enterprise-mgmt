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

// 库存流水
const transactions = ref<any[]>([])
const showInventoryModal = ref(false)
const inventorySaving = ref(false)
const inventoryForm = ref({ type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' })

const statusConfig: Record<string, { label: string; color: string }> = {
  on_sale: { label: '在售', color: 'bg-teal-50 text-teal-700' },
  off_shelf: { label: '已下架', color: 'bg-stone-100 text-stone-500' },
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
function getStatusColor(status: string) { return statusConfig[status]?.color || 'bg-stone-100 text-stone-500' }

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

async function handleDeleteTransaction(t: any) {
  if (!confirm('确定删除此记录吗？库存将回退')) return
  try {
    await $api(`/api/inventory/transactions/${t.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    fetchTransactions()
    fetchDetail()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

onMounted(() => { fetchDetail(); fetchTransactions() })
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-12 text-stone-400">加载中...</div>
    <div v-else-if="!product" class="text-center py-12 text-stone-400">产品不存在</div>
    <template v-else>
      <UTabs :items="[{ label: '基本信息' }, { label: '库存流水' }]" :default-value="'0'" :unmount-on-hide="false">
        <template #content="{ index }">
          <!-- 基本信息 -->
          <div v-if="index === 0" class="mt-4">
            <!-- 头部 -->
            <div class="mb-6">
              <div class="flex items-center gap-2 mb-2">
                <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/products')" />
                <h1 class="text-lg font-medium text-stone-800">{{ product.name }}</h1>
                <span class="text-xs text-stone-400">{{ product.code }}</span>
                <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', getStatusColor(product.status)]">{{ getStatusLabel(product.status) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UButton size="xs" :icon="product.status === 'on_sale' ? 'i-lucide-eye-off' : 'i-lucide-eye'" :color="product.status === 'on_sale' ? 'neutral' : 'success'" variant="ghost" @click="toggleStatus">{{ product.status === 'on_sale' ? '下架' : '上架' }}</UButton>
                <div class="flex-1" />
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pen-line" @click="openEditModal">编辑</UButton>
                <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="showDeleteModal = true">删除</UButton>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div class="lg:col-span-2 space-y-4">
                <div class="warm-card">
                  <h3 class="text-sm font-medium text-stone-700 mb-3">价格与库存</h3>
                  <div class="grid grid-cols-4 gap-4">
                    <div><span class="text-xs text-stone-400">标准价格</span><p class="text-lg text-stone-800 font-medium">{{ formatPrice(product.standardPrice) }}</p></div>
                    <div><span class="text-xs text-stone-400">成本价格</span><p class="text-lg text-stone-800">{{ formatPrice(product.costPrice) }}</p></div>
                    <div><span class="text-xs text-stone-400">利润率</span><p class="text-lg" :class="profitMargin && Number(profitMargin) > 0 ? 'text-teal-600' : 'text-stone-400'">{{ profitMargin !== null ? profitMargin + '%' : '-' }}</p></div>
                    <div><span class="text-xs text-stone-400">当前库存</span><p class="text-lg font-medium" :class="(product.stockQuantity ?? 0) > 0 ? 'text-teal-600' : 'text-red-400'">{{ product.stockQuantity ?? 0 }}</p></div>
                  </div>
                </div>
                <div class="warm-card">
                  <h3 class="text-sm font-medium text-stone-700 mb-3">产品描述</h3>
                  <p v-if="product.description" class="text-sm text-stone-600 whitespace-pre-wrap">{{ product.description }}</p>
                  <p v-else class="text-xs text-stone-400">暂无描述</p>
                </div>
              </div>
              <div class="space-y-4">
                <div class="warm-card">
                  <h3 class="text-sm font-medium text-stone-700 mb-3">产品分类</h3>
                  <div v-if="product.category"><div class="flex items-center gap-2 text-sm"><UIcon name="i-lucide-tag" class="w-4 h-4 text-amber-500" /><span class="text-stone-800">{{ product.category.name }}</span></div></div>
                  <p v-else class="text-xs text-stone-400">未分类</p>
                </div>
                <div class="warm-card">
                  <h3 class="text-sm font-medium text-stone-700 mb-3">时间线</h3>
                  <div class="space-y-2 text-xs text-stone-400">
                    <div class="flex justify-between"><span>创建时间</span><span class="text-stone-600">{{ formatDate(product.createdAt) }}</span></div>
                    <div class="flex justify-between"><span>更新时间</span><span class="text-stone-600">{{ formatDate(product.updatedAt) }}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 库存流水 -->
          <div v-if="index === 1" class="mt-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-stone-500">出入库记录</span>
              <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="showInventoryModal = true; inventoryForm = { type: 'inbound', quantity: 1, unitPrice: 0, batchNo: '', remark: '' }">登记流水</UButton>
            </div>
            <div v-if="!transactions?.length" class="text-center py-8 text-stone-400 text-sm">暂无库存流水</div>
            <div v-else class="warm-card overflow-hidden">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-stone-100 text-left text-xs text-stone-400">
                    <th class="py-2 px-3">类型</th><th class="py-2 px-3 text-right">数量</th><th class="py-2 px-3 text-right">单价</th><th class="py-2 px-3">批次</th><th class="py-2 px-3">备注</th><th class="py-2 px-3">时间</th><th class="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in transactions" :key="t.id" class="border-b border-stone-50">
                    <td class="py-2 px-3"><span :class="['text-[10px] px-1.5 py-0.5 rounded-full', t.type === 'inbound' ? 'bg-teal-50 text-teal-700' : t.type === 'outbound' ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-500']">{{ ({ inbound: '入库', outbound: '出库', adjustment: '盘点' } as Record<string, string>)[t.type] || t.type }}</span></td>
                    <td class="py-2 px-3 text-right" :class="t.quantity > 0 ? 'text-teal-600' : 'text-red-500'">{{ t.quantity > 0 ? '+' + t.quantity : t.quantity }}</td>
                    <td class="py-2 px-3 text-right text-stone-600">{{ t.unitPrice ? '¥' + t.unitPrice : '-' }}</td>
                    <td class="py-2 px-3 text-xs text-stone-400">{{ t.batchNo || '-' }}</td>
                    <td class="py-2 px-3 text-xs text-stone-500 max-w-[120px] truncate">{{ t.remark || '-' }}</td>
                    <td class="py-2 px-3 text-xs text-stone-400">{{ formatDate(t.createdAt) }}</td>
                    <td class="py-2 px-3"><UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDeleteTransaction(t)" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </UTabs>
      <!-- 库存流水弹窗 -->
      <UModal v-model:open="showInventoryModal">
        <template #header>登记库存流水</template>
        <template #body>
          <form class="space-y-3" @submit.prevent="handleSaveInventory">
            <div><label class="block text-sm text-stone-600 mb-1">类型</label><select v-model="inventoryForm.type" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"><option value="inbound">入库</option><option value="outbound">出库</option><option value="adjustment">盘点调整</option></select></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm text-stone-600 mb-1">数量 <span class="text-red-400">*</span></label><input v-model.number="inventoryForm.quantity" type="number" step="1" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
              <div><label class="block text-sm text-stone-600 mb-1">单价</label><input v-model.number="inventoryForm.unitPrice" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
            </div>
            <div><label class="block text-sm text-stone-600 mb-1">批次号</label><input v-model="inventoryForm.batchNo" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">备注</label><input v-model="inventoryForm.remark" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          </form>
        </template>
        <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showInventoryModal = false">取消</UButton><UButton color="primary" :loading="inventorySaving" @click="handleSaveInventory">保存</UButton></div></template>
      </UModal>

      <!-- 编辑弹窗 -->
      <UModal v-model:open="showEditModal">
        <template #header>编辑产品</template>
        <template #body>
          <form class="space-y-4" @submit.prevent="handleEdit">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm text-stone-600 mb-1">产品名称 <span class="text-red-400">*</span></label><input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
              <div><label class="block text-sm text-stone-600 mb-1">产品编码</label><input v-model="editForm.code" type="text" disabled class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 text-stone-400" /></div>
            </div>
            <div><label class="block text-sm text-stone-600 mb-1">产品分类</label><select v-model="editForm.categoryId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"><option value="">未分类</option><option v-for="c in categoryOptions" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm text-stone-600 mb-1">标准价格</label><input v-model.number="editForm.standardPrice" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
              <div><label class="block text-sm text-stone-600 mb-1">成本价格</label><input v-model.number="editForm.costPrice" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
            </div>
            <div><label class="block text-sm text-stone-600 mb-1">描述</label><textarea v-model="editForm.description" rows="3" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 resize-none" /></div>
          </form>
        </template>
        <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showEditModal = false">取消</UButton><UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton></div></template>
      </UModal>

      <!-- 删除弹窗 -->
      <UModal v-model:open="showDeleteModal">
        <template #header>确认删除</template>
        <template #body><p class="text-sm text-stone-600">确定要删除产品「{{ product.name }}」吗？删了就找不回来了。</p></template>
        <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showDeleteModal = false">再想想</UButton><UButton color="error" :loading="deleteLoading" @click="handleDelete">确认删除</UButton></div></template>
      </UModal>
    </template>
  </div>
</template>
