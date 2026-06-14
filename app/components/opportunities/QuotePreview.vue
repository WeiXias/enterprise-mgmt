<script setup lang="ts">
interface Props { items?: { productName: string; quantity: number; unitPrice: number; discount: number; subtotal?: number }[]; totalAmount?: number; loading?: boolean }
withDefaults(defineProps<Props>(), { items: () => [], totalAmount: 0, loading: false })
function formatMoney(v: number) { if (!v) return '¥0'; return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function calcSubtotal(item: any) { return item.quantity * item.unitPrice * (item.discount || 1) }
</script>

<template>
  <div class="em-card">
    <h3 class="text-sm font-medium text-content-secondary mb-3">报价预览</h3>
    <div v-if="loading" class="text-center py-4 text-content-muted">加载中...</div>
    <div v-else-if="!items?.length" class="text-xs text-content-muted py-3">暂无明细</div>
    <div v-else>
      <table class="w-full text-sm"><thead><tr class="border-b border-line-light text-left text-xs text-content-muted"><th class="py-1 font-normal">产品</th><th class="py-1 font-normal text-right">数量</th><th class="py-1 font-normal text-right">单价</th><th class="py-1 font-normal text-right">金额</th></tr></thead>
        <tbody><tr v-for="(item, i) in items" :key="i"><td class="py-1.5 text-content-secondary">{{ item.productName }}</td><td class="py-1.5 text-right text-content-secondary">{{ item.quantity }}</td><td class="py-1.5 text-right text-content-secondary">{{ formatMoney(item.unitPrice) }}</td><td class="py-1.5 text-right text-content-primary">{{ formatMoney(calcSubtotal(item)) }}</td></tr></tbody>
      </table>
      <div class="flex items-center justify-between border-t border-line-light pt-2 mt-2">
        <span class="text-sm font-medium text-content-secondary">合计</span><span class="text-sm font-medium text-content-primary">{{ formatMoney(totalAmount) }}</span>
      </div>
    </div>
  </div>
</template>
