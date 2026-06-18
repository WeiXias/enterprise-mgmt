<script setup lang="ts">
defineProps<{
  product: any
}>()

const emit = defineEmits<{
  'toggleStatus': [product: any]
  edit: [product: any]
  delete: [product: any]
}>()
</script>

<template>
  <div class="em-card flex items-center gap-4 hover:shadow-sm transition-shadow group">
    <div :class="['w-1 h-10 rounded-full flex-shrink-0', product.status === 'on_sale' ? 'bg-teal-400' : 'bg-line']" />

    <div class="flex-1 min-w-0 cursor-pointer" @click="$router.push(`/dashboard/products/${product.id}`)">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-content-primary truncate">{{ product.name }}</span>
        <span class="text-xs text-content-secondary">{{ product.code }}</span>
        <StatusBadge :value="product.status" enum-type="productStatus" />
      </div>
      <div class="flex items-center gap-3 text-xs text-content-secondary">
        <span v-if="product.category?.name"><UIcon name="i-lucide-tag" class="w-3 h-3 inline-block mr-0.5" />{{ product.category.name }}</span>
        <span><UIcon name="i-lucide-coins" class="w-3 h-3 inline-block mr-0.5" />标价 {{ formatMoney(product.standardPrice) }}</span>
        <span v-if="product.costPrice">成本 {{ formatMoney(product.costPrice) }}</span>
        <span class="font-medium text-teal-600">库存 {{ product.stockQuantity ?? 0 }}</span>
      </div>
    </div>

    <div class="flex items-center gap-1" @click.stop>
      <UButton :icon="product.status === 'on_sale' ? 'i-lucide-eye-off' : 'i-lucide-eye'" variant="ghost" :color="product.status === 'on_sale' ? 'neutral' : 'success'" size="xs" @click="emit('toggleStatus', product)">{{ product.status === 'on_sale' ? '下架' : '上架' }}</UButton>
      <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="emit('edit', product)" />
      <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="emit('delete', product)" />
    </div>
  </div>
</template>
