<script setup lang="ts">
/**
 * 商机表单组件 — 新建/编辑商机
 */

interface Props {
  modelValue: {
    name: string
    customerId: string
    estimatedAmount?: number
    estimatedCloseDate?: string
    source?: string
    competitor?: string
  }
  /** 客户下拉选项 */
  customerOptions?: { id: string; name: string }[]
  /** 是否自动选好客户（如从客户详情页新建商机） */
  preselectedCustomer?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  customerOptions: () => [],
  preselectedCustomer: false,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  submit: []
}>()

const SOURCE_OPTIONS = ref<string[]>([])
onMounted(async () => {
  try {
    const res = await $fetch('/api/dict/opportunity_source', {
      headers: useAuthHeaders(),
    }) as any
    if (res?.code === 0) {
      SOURCE_OPTIONS.value = (res.data || []).map((o: any) => o.label)
    }
  } catch {}
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <!-- 基本信息 -->
    <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
      <div class="flex items-center gap-1.5 mb-3">
        <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
        <span class="text-sm font-medium text-brand-700">基本信息</span>
      </div>
      <div class="mb-3">
        <label class="block text-sm text-content-secondary mb-1">商机名称 <span class="text-danger-600">*</span></label>
        <input
          :value="modelValue.name"
          type="text"
          placeholder="商机名称"
          class="w-full input-base focus-ring"
          @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
        />
      </div>

      <div v-if="!preselectedCustomer" class="mb-3">
        <label class="block text-sm text-content-secondary mb-1">所属客户 <span class="text-danger-600">*</span></label>
        <CustomerSelect
          :model-value="modelValue.customerId"
          placeholder="选择客户"
          @update:model-value="$emit('update:modelValue', { ...modelValue, customerId: $event })"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="mb-4">
          <label class="block text-sm text-content-secondary mb-1">预估金额</label>
          <input
            :value="modelValue.estimatedAmount"
            type="number"
            step="0.01"
            placeholder="0"
            class="w-full input-base focus-ring"
            @input="$emit('update:modelValue', { ...modelValue, estimatedAmount: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
        <div class="mb-4">
          <label class="block text-sm text-content-secondary mb-1">预计成交日期</label>
          <input
            :value="modelValue.estimatedCloseDate"
            type="date"
            class="w-full input-base focus-ring"
            @input="$emit('update:modelValue', { ...modelValue, estimatedCloseDate: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>
    </div>

    <!-- 补充信息 -->
    <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
      <div class="flex items-center gap-1.5 mb-3">
        <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
        <span class="text-sm font-medium text-brand-700">补充信息</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="mb-4">
          <label class="block text-sm text-content-secondary mb-1">来源</label>
          <EnumSelect
            :model-value="modelValue.source"
            :options="SOURCE_OPTIONS"
            placeholder="选择来源"
            @update:model-value="$emit('update:modelValue', { ...modelValue, source: $event })"
          />
        </div>
        <div class="mb-4">
          <label class="block text-sm text-content-secondary mb-1">竞争对手</label>
          <input
            :value="modelValue.competitor"
            type="text"
            placeholder="竞争对手名称"
            class="w-full input-base focus-ring"
            @input="$emit('update:modelValue', { ...modelValue, competitor: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>
    </div>
  </form>
</template>
