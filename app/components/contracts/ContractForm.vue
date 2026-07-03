<script setup lang="ts">
/**
 * 合同表单组件 — 新建/编辑合同
 */

interface Props {
  modelValue: {
    name: string
    type?: string
    customerId?: string
    supplierId?: string
    totalAmount?: number
    partyA?: string
    partyB?: string
    paymentMethod?: string
    startDate?: string
    endDate?: string
    signedAt?: string
    remark?: string
  }
  customerOptions?: { id: string; name: string }[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  customerOptions: () => [],
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  submit: []
}>()

function setQuickDate(years: number) {
  const today = new Date()
  const start = today.toISOString().slice(0, 10)
  const endDate = new Date(today)
  endDate.setFullYear(endDate.getFullYear() + years)
  emit('update:modelValue', { ...props.modelValue, startDate: start, endDate: endDate.toISOString().slice(0, 10) })
}

</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <!-- 合同类型 -->
    <div>
      <label class="block text-sm text-content-secondary mb-1">合同类型 <span class="text-red-400">*</span></label>
      <div class="flex gap-2">
        <button
          type="button"
          :class="[
            'flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors',
            (modelValue.type || 'sales') === 'sales'
              ? 'border-brand-400 bg-brand-50 text-brand-700'
              : 'border-line text-content-muted hover:border-brand-200'
          ]"
          @click="$emit('update:modelValue', { ...modelValue, type: 'sales', direction: 'income' })"
        >销售合同</button>
        <button
          type="button"
          :class="[
            'flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors',
            modelValue.type === 'purchase'
              ? 'border-brand-400 bg-brand-50 text-brand-700'
              : 'border-line text-content-muted hover:border-brand-200'
          ]"
          @click="$emit('update:modelValue', { ...modelValue, type: 'purchase', direction: 'expense' })"
        >采购合同</button>
      </div>
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">合同名称 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.name"
        type="text"
        placeholder="合同名称"
        class="w-full input-base focus-ring"
        @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div v-if="(modelValue.type || 'sales') === 'purchase'">
      <label class="block text-sm text-content-secondary mb-1">供应商 <span class="text-red-400">*</span></label>
      <SupplierSelect
        :model-value="modelValue.supplierId || ''"
        placeholder="选择供应商"
        @update:model-value="$emit('update:modelValue', { ...modelValue, supplierId: $event })"
      />
    </div>
    <div v-else>
      <label class="block text-sm text-content-secondary mb-1">客户 <span class="text-red-400">*</span></label>
      <CustomerSelect
        :model-value="modelValue.customerId || ''"
        placeholder="选择客户"
        @update:model-value="$emit('update:modelValue', { ...modelValue, customerId: $event })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-content-secondary mb-1">合同金额</label>
        <input
          :value="modelValue.totalAmount"
          type="number"
          step="0.01"
          class="w-full input-base focus-ring"
          @input="$emit('update:modelValue', { ...modelValue, totalAmount: Number(($event.target as HTMLInputElement).value) })"
        />
      </div>
      <div>
        <label class="block text-sm text-content-secondary mb-1">付款方式</label>
        <EnumSelect
          :model-value="modelValue.paymentMethod || ''"
          dict="PaymentMethod"
          placeholder="选择方式"
          @update:model-value="$emit('update:modelValue', { ...modelValue, paymentMethod: $event })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-content-secondary mb-1">甲方</label>
        <input
          :value="modelValue.partyA"
          type="text"
          placeholder="甲方名称"
          class="w-full input-base focus-ring"
          @input="$emit('update:modelValue', { ...modelValue, partyA: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div>
        <label class="block text-sm text-content-secondary mb-1">乙方</label>
        <input
          :value="modelValue.partyB"
          type="text"
          placeholder="乙方名称"
          class="w-full input-base focus-ring"
          @input="$emit('update:modelValue', { ...modelValue, partyB: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-content-secondary mb-1">开始日期</label>
        <div class="flex gap-1.5">
          <input
            :value="modelValue.startDate"
            type="date"
            class="flex-1 input-base focus-ring"
            @input="$emit('update:modelValue', { ...modelValue, startDate: ($event.target as HTMLInputElement).value })"
          />
          <UButton
            v-for="y in [1, 3, 5]"
            :key="y"
            variant="ghost"
            color="neutral"
            size="xs"
            class="text-[10px] px-1.5"
            @click="setQuickDate(y)"
          >+{{ y }}年</UButton>
        </div>
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
      <label class="block text-sm text-content-secondary mb-1">签署时间</label>
      <input
        :value="modelValue.signedAt"
        type="date"
        class="w-full input-base focus-ring max-w-[200px]"
        @input="$emit('update:modelValue', { ...modelValue, signedAt: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">备注</label>
      <textarea
        :value="modelValue.remark"
        rows="2"
        placeholder="备注信息..."
        class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none"
        @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLTextAreaElement).value })"
      />
    </div>
  </form>
</template>
