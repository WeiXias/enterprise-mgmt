<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '新建销售订单', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const saving = ref(false)

const form = ref({
  customerId: '',
  contractId: '',
  remark: '',
})

const items = ref<any[]>([{ productId: '', _name: '', quantity: 1, unitPrice: 0, discount: 1, amount: 0 }])
const showProductModal = ref(false)
const selectedProductInfo = ref<any>(null)

function onProductSelected(product: any) {
  selectedProductInfo.value = product
  const emptyIdx = items.value.findIndex(i => !i.productId)
  if (emptyIdx >= 0) {
    items.value[emptyIdx].productId = product.id
    items.value[emptyIdx]._name = product.name
    items.value[emptyIdx].unitPrice = product.price || 0
    updateItemAmount(emptyIdx)
  } else {
    items.value.push({ productId: product.id, _name: product.name, quantity: 1, unitPrice: product.price || 0, discount: 1, amount: 0 })
    updateItemAmount(items.value.length - 1)
  }
  showProductModal.value = false
}

function updateItemAmount(idx: number) {
  const item = items.value[idx]
  item.amount = Math.round(item.quantity * item.unitPrice * item.discount * 100) / 100
}

function addItem() {
  showProductModal.value = true
}

function removeItem(idx: number) {
  if (items.value.length <= 1) return
  items.value.splice(idx, 1)
}

async function handleSubmit() {
  if (!form.value.customerId) { toast.add({ title: '请选择客户', color: 'warning' }); return }
  const validItems = items.value.filter(i => i.productId)
  if (validItems.length === 0) { toast.add({ title: '至少添加一个产品', color: 'warning' }); return }

  saving.value = true
  try {
    const res = await $api('/api/sales-orders', {
      method: 'POST',
      body: { ...form.value, items: validItems },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '销售订单已创建', color: 'success' })
      router.push('/dashboard/sales')
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="新建销售订单">
      <template #actions>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/sales')">返回列表</UButton>
      </template>
    </PageHeader>

    <div class="em-card p-6">
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-content-secondary mb-1">客户 <span class="text-red-400">*</span></label>
            <CustomerSelect v-model="form.customerId" placeholder="选择客户" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">关联合同（可选）</label>
            <input v-model="form.contractId" type="text" placeholder="合同 ID" class="w-full input-base focus-ring" />
          </div>
        </div>

        <!-- 产品明细 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm text-content-secondary">销售产品</label>
            <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addItem">添加产品</UButton>
          </div>
          <div class="space-y-2">
            <div v-for="(item, idx) in items" :key="idx" class="grid grid-cols-12 gap-2 items-end">
              <div class="col-span-4">
                <div class="relative">
                  <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
                  <input
                    v-if="item.productId"
                    :value="item._name || '已选产品'"
                    type="text"
                    readonly
                    class="w-full pl-8 input-base bg-surface-hover cursor-pointer text-sm"
                    @click="showProductModal = true"
                  />
                  <input
                    v-else
                    type="text"
                    placeholder="点击选择产品"
                    readonly
                    class="w-full pl-8 input-base cursor-pointer text-sm text-content-muted"
                    @click="showProductModal = true"
                  />
                  <button
                    v-if="item.productId"
                    class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-content-muted hover:text-content-secondary"
                    @click="item.productId = ''; item._name = ''; item.unitPrice = 0; item.amount = 0"
                  ><UIcon name="i-lucide-x" class="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div class="col-span-2">
                <input v-model.number="item.quantity" type="number" min="1" placeholder="数量" class="w-full px-2 py-1.5 text-sm rounded border border-line focus-ring" @input="updateItemAmount(idx)" />
              </div>
              <div class="col-span-2">
                <input v-model.number="item.unitPrice" type="number" min="0" step="0.01" placeholder="单价" class="w-full px-2 py-1.5 text-sm rounded border border-line focus-ring" @input="updateItemAmount(idx)" />
              </div>
              <div class="col-span-2">
                <input v-model.number="item.amount" type="number" min="0" step="0.01" placeholder="金额" class="w-full px-2 py-1.5 text-sm rounded border border-line-light bg-surface-hover text-content-secondary" readonly />
              </div>
              <div class="col-span-2 flex justify-end">
                <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="removeItem(idx)" :disabled="items.length <= 1" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm text-content-secondary mb-1">备注</label>
          <textarea v-model="form.remark" rows="2" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton variant="ghost" color="neutral" @click="router.push('/dashboard/sales')">取消</UButton>
          <UButton color="primary" type="submit" :loading="saving">创建</UButton>
        </div>
      </form>
    </div>

    <ProductSelectModal
      v-model="selectedProductInfo"
      :open="showProductModal"
      @update:open="showProductModal = $event"
      @select="onProductSelected"
    />
  </div>
</template>
