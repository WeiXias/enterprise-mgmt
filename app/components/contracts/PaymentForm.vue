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
      <label class="block text-sm text-stone-600 mb-1">收款金额 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.amount"
        type="number"
        step="0.01"
        placeholder="0"
        class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        @input="$emit('update:modelValue', { ...modelValue, amount: Number(($event.target as HTMLInputElement).value) })"
      />
    </div>

    <div>
      <label class="block text-sm text-stone-600 mb-1">收款日期 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.paymentDate"
        type="date"
        class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        @input="$emit('update:modelValue', { ...modelValue, paymentDate: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div>
      <label class="block text-sm text-stone-600 mb-1">关联收款计划</label>
      <select
        :value="modelValue.paymentPlanId"
        class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
        @change="$emit('update:modelValue', { ...modelValue, paymentPlanId: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">不关联</option>
        <option v-for="p in paymentPlans" :key="p.id" :value="p.id">
          ¥{{ p.amount }} - {{ p.planDate.slice(0, 10) }} ({{ p.status }})
        </option>
      </select>
    </div>

    <div>
      <label class="block text-sm text-stone-600 mb-1">收款方式</label>
      <select
        :value="modelValue.paymentMethod"
        class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
        @change="$emit('update:modelValue', { ...modelValue, paymentMethod: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">选择方式</option>
        <option v-for="pm in PAYMENT_METHODS" :key="pm.value" :value="pm.value">{{ pm.label }}</option>
      </select>
    </div>

    <div>
      <label class="block text-sm text-stone-600 mb-1">备注</label>
      <input
        :value="modelValue.remark"
        type="text"
        placeholder="备注信息..."
        class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLInputElement).value })"
      />
    </div>
  </form>
</template>
