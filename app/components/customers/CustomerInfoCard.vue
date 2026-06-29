<script setup lang="ts">
defineProps<{
  customer: any
}>()

const emit = defineEmits<{
  edit: []
  transfer: []
  editTags: []
}>()

const _statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  potential: { label: '潜在客户', color: 'bg-surface-hover text-content-secondary', dot: 'bg-neutral-400' },
  intentional: { label: '意向客户', color: 'bg-brand-50 text-brand-700', dot: 'bg-brand-400' },
  closed: { label: '已成交', color: 'bg-teal-50 text-teal-700', dot: 'bg-teal-400' },
  lost: { label: '已流失', color: 'bg-danger-50 text-danger-600', dot: 'bg-danger-400' },
}

const { isAdminOrManager } = useCustomer()
</script>

<template>
  <div class="em-card mb-6">
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
        <span class="text-brand-700 text-lg font-medium">{{ customer.name?.charAt(0) }}</span>
      </div>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <h2 class="text-base font-medium text-content-primary">{{ customer.name }}</h2>
          <StatusBadge :value="customer.status" enum-type="customerStatus" />
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
          <span v-if="customer.industry">
            <UIcon name="i-lucide-building-2" class="w-3 h-3 inline mr-0.5" />{{ customer.industry }}
          </span>
          <span v-if="customer.registeredAddress">
            <UIcon name="i-lucide-map-pin" class="w-3 h-3 inline mr-0.5" />{{ customer.registeredAddress }}
          </span>
          <span v-if="customer.officeAddress && customer.officeAddress !== customer.registeredAddress">
            <UIcon name="i-lucide-home" class="w-3 h-3 inline mr-0.5" />{{ customer.officeAddress }}
          </span>
          <span v-if="!customer.registeredAddress && customer.officeAddress">
            <UIcon name="i-lucide-map-pin" class="w-3 h-3 inline mr-0.5" />{{ customer.officeAddress }}
          </span>
          <span v-if="customer.owner?.name">
            <UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ customer.owner.name }}
          </span>
          <span>
            <UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />创建于 {{ customer.createdAt }}
          </span>
        </div>
        <p v-if="customer.remark" class="text-sm text-content-muted mt-2">{{ customer.remark }}</p>
      </div>
    </div>
    <!-- 标签 -->
    <div class="flex items-center gap-1.5 mt-3 pt-3 border-t border-line-light">
      <span v-if="!customer.tags?.length" class="text-xs text-content-muted">还没有标签</span>
      <span
        v-for="tag in customer.tags"
        :key="tag.id"
        class="text-[10px] px-2 py-0.5 rounded-full"
        :style="{ backgroundColor: tag.color + '20', color: tag.color || '#5F5E5A' }"
      >{{ tag.name }}</span>
      <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="$emit('editTags')">标签</UButton>
    </div>
  </div>
</template>
