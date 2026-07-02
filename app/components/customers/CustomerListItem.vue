<script setup lang="ts">
defineProps<{
  customer: any
  selected: boolean
  showCheckbox: boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
  edit: [customer: any]
  transfer: [customer: any]
  delete: [customer: any]
}>()

const _statusColors: Record<string, string> = {
  potential: 'bg-neutral-300',
  intentional: 'bg-brand-400',
  closed: 'bg-teal-400',
  lost: 'bg-danger-400',
}
</script>

<template>
  <div
    class="em-card !p-2.5 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer group"
    @click="$router.push(`/dashboard/customers/${customer.id}`)"
  >
    <!-- 复选框 -->
    <div v-if="showCheckbox" class="flex-shrink-0" @click.stop>
      <input type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500 focus:ring-brand-400" :checked="selected" @change="$emit('toggle', customer.id)" />
    </div>

    <!-- 状态色条 -->
    <div
      :class="['w-1 h-10 rounded-full flex-shrink-0', {
        'bg-neutral-300': customer.status === 'potential',
        'bg-brand-400': customer.status === 'intentional',
        'bg-teal-400': customer.status === 'closed',
        'bg-danger-400': customer.status === 'lost',
      }]"
    />

    <!-- 主体信息 -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-content-primary truncate">{{ customer.name }}</span>
        <StatusBadge :value="customer.status" enum-type="customerStatus" />
      </div>
      <div class="flex items-center gap-3 text-xs text-content-muted">
        <span v-if="customer.industry">{{ customer.industry }}</span>
        <span v-if="customer.primaryContact?.name">
          <UIcon name="i-lucide-user" class="w-3 h-3 inline-block mr-0.5" />
          {{ customer.primaryContact.name }}
          <span v-if="customer.primaryContact.phone" class="ml-1">{{ customer.primaryContact.phone }}</span>
        </span>
        <span v-if="customer.owner?.name">
          <UIcon name="i-lucide-user-check" class="w-3 h-3 inline-block mr-0.5" />
          {{ customer.owner.name }}
        </span>
      </div>
    </div>

    <!-- 标签 -->
    <div class="flex gap-1">
      <span
        v-for="tag in (customer.tags || []).slice(0, 2)"
        :key="tag.id"
        class="text-[10px] px-1.5 py-0.5 rounded"
        :style="{ backgroundColor: tag.color + '20', color: tag.color || '#5F5E5A' }"
      >{{ tag.name }}</span>
    </div>

    <!-- 操作 -->
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
      <UButton v-if="showCheckbox" icon="i-lucide-arrow-left-right" variant="ghost" color="warning" size="xs" @click="$emit('transfer', customer)" />
      <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="$emit('edit', customer)" />
      <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="$emit('delete', customer)" />
    </div>
  </div>
</template>
