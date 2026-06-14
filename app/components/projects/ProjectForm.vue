<script setup lang="ts">
/**
 * 项目表单组件 — 新建/编辑项目
 */

interface Props {
  modelValue: {
    name: string
    contractId?: string
    budget?: number
    startDate?: string
    endDate?: string
    remark?: string
  }
  contractOptions?: { id: string; name: string; code?: string }[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  contractOptions: () => [],
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  submit: []
}>()
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div>
      <label class="block text-sm text-content-secondary mb-1">项目名称 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.name"
        type="text"
        placeholder="项目名称"
        class="w-full input-base focus-ring"
        @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div v-if="contractOptions && contractOptions.length > 0">
      <label class="block text-sm text-content-secondary mb-1">关联合同</label>
      <EnumSelect
        :model-value="modelValue.contractId || ''"
        :options="contractOptions.map(c => ({ value: c.id, label: (c.code ? c.code + ' - ' : '') + c.name }))"
        placeholder="不关联合同"
        @update:model-value="$emit('update:modelValue', { ...modelValue, contractId: $event })"
      />
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">预算</label>
      <input
        :value="modelValue.budget"
        type="number"
        step="0.01"
        placeholder="0"
        class="w-full input-base focus-ring"
        @input="$emit('update:modelValue', { ...modelValue, budget: Number(($event.target as HTMLInputElement).value) })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-content-secondary mb-1">开始日期</label>
        <input
          :value="modelValue.startDate"
          type="date"
          class="w-full input-base focus-ring"
          @input="$emit('update:modelValue', { ...modelValue, startDate: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div>
        <label class="block text-sm text-content-secondary mb-1">结束日期</label>
        <input
          :value="modelValue.endDate"
          type="date"
          class="w-full input-base focus-ring"
          @input="$emit('update:modelValue', { ...modelValue, endDate: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">备注</label>
      <textarea
        :value="modelValue.remark"
        rows="2"
        placeholder="项目备注..."
        class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none"
        @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLTextAreaElement).value })"
      />
    </div>
  </form>
</template>
