<script setup lang="ts">
interface Props { items?: { productName: string; quantity: number; unitPrice: number; discount: number; subtotal?: number }[]; totalAmount?: number; loading?: boolean }
withDefaults(defineProps<Props>(), { items: () => [], totalAmount: 0, loading: false })
function formatMoney(v: number) { if (!v) return '¥0'; return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function calcSubtotal(item: any) { return item.quantity * item.unitPrice * (item.discount || 1) }
</script>

<template>
  <div class="warm-card">
    <h3 class="text-sm font-medium text-gray-700 mb-3">报价预览</h3>
    <div v-if="loading" class="text-center py-4 text-gray-400">加载中...</div>
    <div v-else-if="!items?.length" class="text-xs text-gray-400 py-3">暂无明细</div>
    <div v-else>
      <table class="w-full text-sm"><thead><tr class="border-b border-gray-100 text-left text-xs text-gray-400"><th class="py-1 font-normal">产品</th><th class="py-1 font-normal text-right">数量</th><th class="py-1 font-normal text-right">单价</th><th class="py-1 font-normal text-right">金额</th></tr></thead>
        <tbody><tr v-for="(item, i) in items" :key="i"><td class="py-1.5 text-gray-700">{{ item.productName }}</td><td class="py-1.5 text-right text-gray-600">{{ item.quantity }}</td><td class="py-1.5 text-right text-gray-600">{{ formatMoney(item.unitPrice) }}</td><td class="py-1.5 text-right text-gray-800">{{ formatMoney(calcSubtotal(item)) }}</td></tr></tbody>
      </table>
      <div class="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
        <span class="text-sm font-medium text-gray-700">合计</span><span class="text-sm font-medium text-gray-800">{{ formatMoney(totalAmount) }}</span>
      </div>
    </div>
  </div>
</template>
