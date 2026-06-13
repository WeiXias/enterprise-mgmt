<script setup lang="ts">
interface Props {
  modelValue: { commissionIds: string[]; payoutDate: string }
  /** 可选提成记录列表 */
  commissions?: { id: string; user?: { name: string }; contract?: { name: string }; amount: number }[]; loading?: boolean
}
withDefaults(defineProps<Props>(), { commissions: () => [], loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()
function formatMoney(v: number) { if (!v) return '¥0'; return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function toggleId(id: string) { const ids = [...props.modelValue.commissionIds]; const idx = ids.indexOf(id); if (idx >= 0) ids.splice(idx, 1); else ids.push(id); emit('update:modelValue', { ...props.modelValue, commissionIds: ids }) }
const totalAmount = computed(() => (props.commissions || []).filter(c => props.modelValue.commissionIds.includes(c.id)).reduce((s, c) => s + c.amount, 0))
const props = defineProps<Props>()
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div><label class="block text-sm text-gray-600 mb-1">发放日期 <span class="text-red-400">*</span></label><input :value="modelValue.payoutDate" type="date" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" @input="$emit('update:modelValue', { ...modelValue, payoutDate: ($event.target as HTMLInputElement).value })" /></div>
    <div>
      <label class="block text-sm text-gray-600 mb-2">选择提成记录</label>
      <div class="space-y-1 max-h-48 overflow-y-auto">
        <label v-for="c in commissions" :key="c.id" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm cursor-pointer">
          <input type="checkbox" :checked="modelValue.commissionIds.includes(c.id)" class="rounded border-gray-300 text-brand-500 focus:ring-brand-400" @change="toggleId(c.id)" />
          <span class="text-gray-700">{{ c.user?.name || '未知' }}</span>
          <span class="text-xs text-gray-400">{{ c.contract?.name }}</span>
          <span class="text-gray-600 ml-auto">{{ formatMoney(c.amount) }}</span>
        </label>
      </div>
    </div>
    <div class="flex items-center justify-between border-t border-gray-100 pt-2"><span class="text-sm text-gray-600">合计</span><span class="text-sm font-medium text-gray-800">{{ formatMoney(totalAmount) }}</span></div>
  </form>
</template>
