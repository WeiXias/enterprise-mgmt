<script setup lang="ts">
/**
 * 合同表单组件 — 新建/编辑合同
 */

interface Props {
  modelValue: {
    name: string
    customerId?: string
    totalAmount?: number
    partyA?: string
    partyB?: string
    paymentMethod?: string
    startDate?: string
    endDate?: string
    remark?: string
  }
  customerOptions?: { id: string; name: string }[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  customerOptions: () => [],
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  submit: []
}>()

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: '银行转账' },
  { value: 'check', label: '支票' },
  { value: 'cash', label: '现金' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat_pay', label: '微信支付' },
]
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
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

    <div v-if="customerOptions && customerOptions.length > 0">
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
          :options="PAYMENT_METHODS"
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
        placeholder="备注信息..."
        class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none"
        @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLTextAreaElement).value })"
      />
    </div>
  </form>
</template>
