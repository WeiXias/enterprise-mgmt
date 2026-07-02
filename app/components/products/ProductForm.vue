<script setup lang="ts">
interface Props {
  modelValue: {
    name: string
    code?: string
    categoryId?: string
    type?: string
    model?: string
    manufacturer?: string
    unit?: string
    standardPrice?: number
    costPrice?: number
    taxRate?: number
    description?: string
    status?: string
  }
  mode?: 'create' | 'edit'
  loading?: boolean
}

withDefaults(defineProps<Props>(), { mode: 'create', loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
      <div class="flex items-center gap-1.5 mb-3">
        <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
        <span class="text-sm font-medium text-brand-700">基本信息</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">产品名称 <span class="text-danger-600">*</span></label>
          <input :value="modelValue.name" type="text" placeholder="产品名称" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })" />
        </div>
        <div v-if="mode === 'create'">
          <label class="block text-sm text-content-secondary mb-1">产品编码 <span class="text-xs text-content-secondary">(留空时帮你填好)</span></label>
          <input :value="modelValue.code" type="text" placeholder="留空时帮你填好" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, code: ($event.target as HTMLInputElement).value })" />
        </div>
        <div v-else>
          <label class="block text-sm text-content-secondary mb-1">产品编码</label>
          <input :value="modelValue.code" type="text" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, code: ($event.target as HTMLInputElement).value })" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">型号</label>
          <EnumSelect dict="product_model" :model-value="modelValue.model" placeholder="选择型号" @update:model-value="$emit('update:modelValue', { ...modelValue, model: $event })" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">生产厂家</label>
          <EnumSelect dict="product_manufacturer" :model-value="modelValue.manufacturer" placeholder="选择厂家" @update:model-value="$emit('update:modelValue', { ...modelValue, manufacturer: $event })" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">单位</label>
          <EnumSelect dict="product_unit" :model-value="modelValue.unit" placeholder="选择单位" @update:model-value="$emit('update:modelValue', { ...modelValue, unit: $event })" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">产品分类</label>
          <slot name="category-select" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">产品类型</label>
          <select
            :value="modelValue.type || ''"
            class="w-full input-base focus-ring"
            @change="$emit('update:modelValue', { ...modelValue, type: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">不指定</option>
            <option value="hardware">硬件</option>
            <option value="software">软件</option>
            <option value="service">服务</option>
          </select>
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
      <div class="flex items-center gap-1.5 mb-3">
        <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
        <span class="text-sm font-medium text-brand-700">{{ mode === 'edit' ? '价格与状态' : '价格信息' }}</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">标准价格</label>
          <input :value="modelValue.standardPrice ?? 0" type="number" min="0" step="0.01" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, standardPrice: Number(($event.target as HTMLInputElement).value) })" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">成本价格</label>
          <input :value="modelValue.costPrice ?? 0" type="number" min="0" step="0.01" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, costPrice: Number(($event.target as HTMLInputElement).value) })" />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3 mt-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">开票税率 (%)</label>
          <input :value="modelValue.taxRate ?? 0" type="number" min="0" max="100" step="0.01" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, taxRate: Number(($event.target as HTMLInputElement).value) })" />
        </div>
      </div>
      <div v-if="mode === 'edit'" class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">状态</label>
        <slot name="status-select" />
      </div>
    </div>
    <div>
      <label class="block text-sm text-content-secondary mb-1">描述</label>
      <textarea :value="modelValue.description" rows="3" placeholder="简单描述一下这个产品..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" @input="$emit('update:modelValue', { ...modelValue, description: ($event.target as HTMLTextAreaElement).value })" />
    </div>
  </form>
</template>
