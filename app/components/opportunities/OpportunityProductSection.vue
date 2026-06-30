<script setup lang="ts">
const props = defineProps<{
  products: any[]
  oppId: string
}>()

const emit = defineEmits<{
  refresh: []
}>()

const showSelectModal = ref(false)
const editingRowIndex = ref(0)
const selectedProductInfo = ref<any>(null)

function onProductSelected(product: any) {
  const sp = selectedProducts.value[editingRowIndex.value]
  if (sp) {
    sp.productId = product.id
    sp._name = product.name
    sp.unitPrice = product.price || 0
  }
  showSelectModal.value = false
}

const toast = useToast()
const { $api } = useNuxtApp()

const showProductModal = ref(false)
const productLoading = ref(false)
const selectedProducts = ref<any[]>([])
const allProducts = ref<any[]>([])

async function open() {
  try { const res = await $api('/api/products', { params: { pageSize: 200 } }) as any; if (res?.code === 0) allProducts.value = res.data.items || [] } catch {}
  selectedProducts.value = (props.products || []).map((p: any) => ({ productId: p.productId || p.id, quantity: p.quantity || 1, unitPrice: p.unitPrice || 0, discount: p.discount || 1 }))
  showProductModal.value = true
}

function addRow() { selectedProducts.value.push({ productId: '', quantity: 1, unitPrice: 0, discount: 1 }) }
function removeRow(i: number) { selectedProducts.value.splice(i, 1) }

async function handleSave() {
  productLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${props.oppId}`, { method: 'PUT', body: { products: selectedProducts.value } }) as any
    if (res?.code === 0) { toast.add({ title: '关联产品已更新', color: 'success' }); showProductModal.value = false; emit('refresh') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '更新失败', color: 'error' }) }
  finally { productLoading.value = false }
}

defineExpose({ open })
</script>

<template>
  <div class="em-card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-primary">关联产品</h3>
      <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="open">添加</UButton>
    </div>
    <div v-if="!products || products.length === 0" class="text-xs text-content-muted text-center py-4">
      还没有关联产品
    </div>
    <div v-else class="space-y-2">
      <div v-for="p in products" :key="p.id" class="flex items-center justify-between text-sm py-2 border-b border-line-light last:border-0">
        <span class="text-content-primary">{{ p.productName || '未知产品' }}</span>
        <div class="flex items-center gap-3 text-xs text-content-muted">
          <span>× {{ p.quantity }}</span>
          <span>¥{{ Number(p.unitPrice).toLocaleString() }}</span>
          <span v-if="p.discount < 1" class="text-brand-600">{{ (p.discount * 100).toFixed(0) }}折</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 关联产品弹窗 -->
  <FormModal
    v-if="showProductModal"
    v-model:open="showProductModal"
    title="关联产品"
    size="standard"
    :loading="productLoading"
    @confirm="handleSave"
  >
    <template #default>
      <div class="space-y-3">
        <div class="flex items-center justify-between mb-2"><span class="text-xs text-content-muted">产品明细</span><UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addRow">添加</UButton></div>
        <div v-if="!selectedProducts.length" class="text-xs text-content-muted py-2">还没有关联产品</div>
        <div v-else class="space-y-2">
          <div v-for="(sp, i) in selectedProducts" :key="i" class="flex items-center gap-2 text-xs">
            <div class="flex-[2] relative">
              <UIcon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-content-muted pointer-events-none z-10" />
              <input
                :value="sp._name || ''"
                type="text"
                readonly
                class="w-full pl-6 pr-5 py-1 text-xs rounded border border-line bg-surface-card cursor-pointer"
                @click="showSelectModal = true; editingRowIndex = i"
              />
            </div>
            <input v-model.number="sp.quantity" type="number" min="1" class="w-14 px-1 py-1 text-center rounded border border-line text-xs" />
            <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="removeRow(i)" />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton color="primary" :loading="productLoading" @click="handleSave">保存</UButton>
      <UButton variant="ghost" color="neutral" @click="showProductModal = false">算了</UButton>
    </template>
  </FormModal>

  <ProductSelectModal
    v-model="selectedProductInfo"
    nested
    :open="showSelectModal"
    @update:open="showSelectModal = $event"
    @select="onProductSelected"
  />
</template>
