<script setup lang="ts">
/**
 * 收款登记表单组件
 */

interface Props {
  modelValue: {
    amount: number
    paymentDate: string
    paymentMethod?: string
    paymentPlanId?: string
    remark?: string
  }
  paymentPlans?: { id: string; amount: number; planDate: string; status: string }[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  paymentPlans: () => [],
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
  { value: 'other', label: '其他' },
]
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div>
      <label class="block text-sm text-content-secondary mb-1">收款金额 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.amount"
        type="number"
        step="0.01"
        placeholder="0"
        class="w-full input-base focus-ring"
        @input="$emit('update:modelValue', { ...modelValue, amount: Number(($event.target as HTMLInputElement).value) })"
      />
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">收款日期 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.paymentDate"
        type="date"
        class="w-full input-base focus-ring"
        @input="$emit('update:modelValue', { ...modelValue, paymentDate: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">关联收款计划</label>
      <select
        :value="modelValue.paymentPlanId"
        class="w-full input-base focus-ring"
        @change="$emit('update:modelValue', { ...modelValue, paymentPlanId: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">不关联</option>
        <option v-for="p in paymentPlans" :key="p.id" :value="p.id">
          ¥{{ p.amount }} - {{ p.planDate.slice(0, 10) }} ({{ p.status }})
        </option>
      </select>
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">收款方式</label>
      <EnumSelect
        :model-value="modelValue.paymentMethod || ''"
        :options="PAYMENT_METHODS"
        placeholder="选择方式"
        @update:model-value="$emit('update:modelValue', { ...modelValue, paymentMethod: $event })"
      />
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">备注</label>
      <input
        :value="modelValue.remark"
        type="text"
        placeholder="备注信息..."
        class="w-full input-base focus-ring"
        @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLInputElement).value })"
      />
    </div>
  </form>
</template>
