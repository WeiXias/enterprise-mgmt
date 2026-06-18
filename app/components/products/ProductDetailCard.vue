<script setup lang="ts">
const _statusConfig: Record<string, { label: string; color: string }> = {
  on_sale: { label: '在售', color: 'bg-teal-50 text-teal-700' },
  off_shelf: { label: '已下架', color: 'bg-surface-hover text-content-muted' },
}

function getStatusLabel(status: string) { return _statusConfig[status]?.label || status }
function getStatusColor(status: string) { return _statusConfig[status]?.color || 'bg-surface-hover text-content-muted' }

const props = defineProps<{
  product: any
  profitMargin: string | null
  mainImageUrl: string
}>()

const emit = defineEmits<{
  edit: []
  toggleStatus: []
  delete: []
  uploadImage: []
}>()
</script>

<template>
  <div class="em-card mb-5">
    <div class="flex gap-6">
      <div class="w-72 shrink-0">
        <div v-if="mainImageUrl" class="rounded-xl overflow-hidden bg-black/[0.02] aspect-square">
          <img :src="mainImageUrl" class="w-full h-full object-cover" />
        </div>
        <div v-else class="rounded-xl bg-surface-hover aspect-square flex items-center justify-center">
          <UIcon name="i-lucide-package" class="w-12 h-12 text-content-muted" />
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-3">
          <h1 class="text-xl font-medium text-content-primary">{{ product.name }}</h1>
          <span :class="['text-[11px] px-2 py-0.5 rounded-full', getStatusColor(product.status)]">{{ getStatusLabel(product.status) }}</span>
        </div>
        <p class="text-xs text-content-muted mb-4">编码 {{ product.code }} {{ product.category ? ' · ' + product.category.name : '' }}</p>

        <div class="grid grid-cols-4 gap-4 mb-5">
          <div><span class="text-xs text-content-muted">标准价格</span><p class="text-base font-medium text-content-primary">{{ formatMoney(product.standardPrice) }}</p></div>
          <div><span class="text-xs text-content-muted">成本价格</span><p class="text-base text-content-secondary">{{ formatMoney(product.costPrice) }}</p></div>
          <div><span class="text-xs text-content-muted">利润率</span><p class="text-base" :class="profitMargin && Number(profitMargin) > 0 ? 'text-teal-600' : 'text-content-muted'">{{ profitMargin !== null ? profitMargin + '%' : '-' }}</p></div>
          <div><span class="text-xs text-content-muted">当前库存</span><p class="text-base font-medium" :class="(product.stockQuantity ?? 0) > 0 ? 'text-teal-600' : 'text-danger-500'">{{ product.stockQuantity ?? 0 }}</p></div>
        </div>

        <div class="flex items-center gap-2">
          <UButton size="xs" color="primary" icon="i-lucide-pen-line" @click="emit('edit')">编辑</UButton>
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-upload" @click="emit('uploadImage')">上传图片</UButton>
          <UButton size="xs" :icon="product.status === 'on_sale' ? 'i-lucide-eye-off' : 'i-lucide-eye'" :color="product.status === 'on_sale' ? 'neutral' : 'success'" variant="ghost" @click="emit('toggleStatus')">{{ product.status === 'on_sale' ? '下架' : '上架' }}</UButton>
          <div class="flex-1" />
          <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="emit('delete')">删除</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
