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
    <div class="rounded-xl border border-[var(--color-line-light)] bg-[var(--color-line-light)]/40 p-4">
      <div class="flex items-center gap-1.5 mb-3">
        <span class="w-0.5 h-3.5 rounded-full bg-[var(--color-brand-400)]" />
        <span class="text-sm font-medium text-[var(--color-brand-700)]">基本信息</span>
      </div>
      <div class="form-group mb-3">
        <label class="block text-sm text-[var(--color-content-secondary)] mb-1">商机名称 <span class="text-[var(--color-danger-600)]">*</span></label>
        <input
          :value="modelValue.name"
          type="text"
          placeholder="商机名称"
          class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15"
          @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
        />
      </div>

      <div v-if="!preselectedCustomer && customerOptions.length > 0" class="form-group mb-3">
        <label class="block text-sm text-[var(--color-content-secondary)] mb-1">所属客户 <span class="text-[var(--color-danger-600)]">*</span></label>
        <select
          :value="modelValue.customerId"
          class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)]"
          @change="$emit('update:modelValue', { ...modelValue, customerId: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">选择客户</option>
          <option v-for="c in customerOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="form-group">
          <label class="block text-sm text-[var(--color-content-secondary)] mb-1">预估金额</label>
          <input
            :value="modelValue.estimatedAmount"
            type="number"
            step="0.01"
            placeholder="0"
            class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15"
            @input="$emit('update:modelValue', { ...modelValue, estimatedAmount: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
        <div class="form-group">
          <label class="block text-sm text-[var(--color-content-secondary)] mb-1">预计成交日期</label>
          <input
            :value="modelValue.estimatedCloseDate"
            type="date"
            class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15"
            @input="$emit('update:modelValue', { ...modelValue, estimatedCloseDate: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>
    </div>

    <!-- 补充信息 -->
    <div class="rounded-xl border border-[var(--color-line-light)] bg-[var(--color-line-light)]/40 p-4">
      <div class="flex items-center gap-1.5 mb-3">
        <span class="w-0.5 h-3.5 rounded-full bg-[var(--color-brand-400)]" />
        <span class="text-sm font-medium text-[var(--color-brand-700)]">补充信息</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="form-group">
          <label class="block text-sm text-[var(--color-content-secondary)] mb-1">来源</label>
          <select
            :value="modelValue.source"
            class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)]"
            @change="$emit('update:modelValue', { ...modelValue, source: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">选择来源</option>
            <option v-for="src in SOURCE_OPTIONS" :key="src" :value="src">{{ src }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="block text-sm text-[var(--color-content-secondary)] mb-1">竞争对手</label>
          <input
            :value="modelValue.competitor"
            type="text"
            placeholder="竞争对手名称"
            class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15"
            @input="$emit('update:modelValue', { ...modelValue, competitor: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>
    </div>
  </form>
</template>
