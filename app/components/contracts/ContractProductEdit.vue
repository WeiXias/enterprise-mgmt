<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'

const props = defineProps<{ contractId: string }>()

const emit = defineEmits<{ save: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()
const showProductModal = ref(false)
const showSelectModal = ref(false)
const selectedProductInfo = ref<any>(null)
const productLoading = ref(false)
const editProducts = ref<any[]>([])
const contract = inject<any>('contract')

function formatMoney(v: any) {
  const n = Number(v)
  if (isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function openModal() {
  editProducts.value = (contract.value.products || []).map((p: any) => ({
    productId: p.productId,
    quantity: p.quantity || 1,
    unitPrice: p.unitPrice || 0,
    discount: (p.discount ?? 1) * 100
  }))
  showProductModal.value = true
}

function addProductRow() { editProducts.value.push({ productId: '', quantity: 1, unitPrice: 0, discount: 100 }) }
function removeProductRow(i: number) { editProducts.value.splice(i, 1) }

async function save() {
  productLoading.value = true
  try {
    const items = editProducts.value.map(p => ({
      productId: p.productId,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      discount: (p.discount || 100) / 100
    }))
    const totalAmount = items.reduce((s: number, p: any) => s + p.quantity * p.unitPrice * p.discount, 0)
    await $api(`/api/contracts/${props.contractId}`, { method: 'PUT', body: { products: items, totalAmount } })
    toast.add({ title: '产品明细已更新', color: 'success' })
    showProductModal.value = false
    emit('save')
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { productLoading.value = false }
}

defineExpose({ openModal })
</script>

<template>
  <div class="mt-4">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm text-content-muted">产品明细 {{ contract?.products?.length ? '(' + contract.products.length + ')' : '' }}</span>
      <UButton icon="i-lucide-pen-line" variant="ghost" color="primary" size="xs" @click="openModal">编辑</UButton>
    </div>
    <div v-if="!contract?.products?.length" class="text-center py-8 text-content-muted text-sm">暂无关联产品</div>
    <div v-else class="em-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line-light text-left text-xs text-content-muted">
            <th class="py-2 px-4 font-normal">产品</th>
            <th class="py-2 px-4 font-normal text-right">数量</th>
            <th class="py-2 px-4 font-normal text-right">单价</th>
            <th class="py-2 px-4 font-normal text-right">折扣</th>
            <th class="py-2 px-4 font-normal text-right">小计</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in contract.products" :key="p.id" class="border-b border-line-light">
            <td class="py-2 px-4">
              <div class="font-medium text-content-primary">{{ p.productName || '-' }}</div>
              <div v-if="p.productCode" class="text-xs text-content-muted">{{ p.productCode }}</div>
            </td>
            <td class="py-2 px-4 text-right text-content-secondary">{{ p.quantity }}</td>
            <td class="py-2 px-4 text-right text-content-secondary">{{ formatMoney(p.unitPrice) }}</td>
            <td class="py-2 px-4 text-right text-content-secondary">{{ (Number(p.discount || 1) * 100).toFixed(0) }}%</td>
            <td class="py-2 px-4 text-right text-content-primary font-medium">{{ formatMoney(p.quantity * p.unitPrice * (p.discount || 1)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormModal v-if="showProductModal" v-model:open="showProductModal" title="编辑产品明细" :loading="productLoading" :secondary-action="{ label: '添加产品行', onClick: addProductRow }">
      <div class="space-y-3 max-h-[50vh] overflow-y-auto">
        <div v-for="(p, i) in editProducts" :key="i" class="flex items-center gap-2 text-sm">
          <div class="flex-[2] relative">
            <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-content-muted pointer-events-none z-10" />
            <input
              :value="p._name || ''"
              type="text"
              readonly
              class="w-full pl-7 pr-6 py-1.5 text-sm rounded border border-line bg-surface-card cursor-pointer"
              @click="showProductModal = false; showSelectModal = true"
            />
          </div>
          <input v-model.number="p.quantity" type="number" min="1" class="w-16 px-1 py-1.5 text-center rounded border border-line text-sm" />
          <input v-model.number="p.unitPrice" type="number" step="0.01" placeholder="单价" class="w-20 px-1 py-1.5 rounded border border-line text-sm" />
          <input v-model.number="p.discount" type="number" min="0" max="100" class="w-16 px-1 py-1.5 text-center rounded border border-line text-sm" title="折扣%" />
          <span class="text-xs text-content-muted w-20 text-right">{{ formatMoney(p.quantity * p.unitPrice * (p.discount / 100)) }}</span>
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="removeProductRow(i)" />
        </div>
      </div>
      <template #footer>
        <UButton color="primary" :loading="productLoading" @click="save">保存</UButton>
        <UButton variant="ghost" color="neutral" @click="showProductModal = false">算了</UButton>
      </template>
    </FormModal>

    <!-- 产品选择弹窗 -->
    <ProductSelectModal
      v-model="selectedProductInfo"
      nested
      :open="showSelectModal"
      @update:open="showSelectModal = $event"
      @select="(p: any) => { selectedProductInfo = p; showSelectModal = false; const emptyRow = editProducts.find((ep: any) => !ep.productId); if (emptyRow) { emptyRow.productId = p.id; emptyRow._name = p.name; emptyRow.unitPrice = p.price || 0 } else { editProducts.push({ productId: p.id, _name: p.name, quantity: 1, unitPrice: p.price || 0, discount: 100 }) } }"
    />
  </div>
</template>

