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

const SOURCE_OPTIONS = ['主动联系', '客户介绍', '展会', '网络推广', '电话营销', '其他']
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div>
      <label class="block text-sm text-stone-600 mb-1">商机名称 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.name"
        type="text"
        placeholder="商机名称"
        class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div v-if="!preselectedCustomer && customerOptions.length > 0">
      <label class="block text-sm text-stone-600 mb-1">所属客户 <span class="text-red-400">*</span></label>
      <select
        :value="modelValue.customerId"
        class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
        @change="$emit('update:modelValue', { ...modelValue, customerId: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">选择客户</option>
        <option v-for="c in customerOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-stone-600 mb-1">预估金额</label>
        <input
          :value="modelValue.estimatedAmount"
          type="number"
          step="0.01"
          placeholder="0"
          class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          @input="$emit('update:modelValue', { ...modelValue, estimatedAmount: Number(($event.target as HTMLInputElement).value) })"
        />
      </div>
      <div>
        <label class="block text-sm text-stone-600 mb-1">预计成交日期</label>
        <input
          :value="modelValue.estimatedCloseDate"
          type="date"
          class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          @input="$emit('update:modelValue', { ...modelValue, estimatedCloseDate: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-stone-600 mb-1">来源</label>
        <select
          :value="modelValue.source"
          class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
          @change="$emit('update:modelValue', { ...modelValue, source: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">选择来源</option>
          <option v-for="src in SOURCE_OPTIONS" :key="src" :value="src">{{ src }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm text-stone-600 mb-1">竞争对手</label>
        <input
          :value="modelValue.competitor"
          type="text"
          placeholder="竞争对手名称"
          class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          @input="$emit('update:modelValue', { ...modelValue, competitor: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>
  </form>
</template>
