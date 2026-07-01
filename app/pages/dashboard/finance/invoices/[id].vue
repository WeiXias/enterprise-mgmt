<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '发票详情', middleware: ['auth'], watermark: true })

const route = useRoute()
const toast = useToast()
const { $api } = useNuxtApp()

const invoice = ref<any>(null)
const payments = ref<any[]>([])
const loading = ref(true)

const { getLabel } = useEnum()

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchInvoice() {
  try {
    const res = await $api(`/api/invoices/${route.params.id}`) as any
    if (res?.code === 0) invoice.value = res.data
  } catch { toast.add({ title: '发票不存在', color: 'error' }) }
}

async function fetchPayments() {
  try {
    const res = await $api(`/api/contracts/${invoice.value.contractId}/payments`) as any
    if (res?.code === 0) payments.value = res.data.items || []
  } catch { }
}

onMounted(async () => {
  loading.value = true
  await fetchInvoice()
  if (invoice.value?.contractId) await fetchPayments()
  loading.value = false
})
</script>

<template>
  <div>
    <div class="mb-6">
      <NuxtLink to="/dashboard/finance/invoices" class="text-xs text-brand-600 hover:underline mb-2 inline-block">← 返回发票列表</NuxtLink>
      <div class="flex items-center gap-3 mt-1">
        <h1 class="text-lg font-medium text-content-primary">{{ invoice?.invoiceNo }}</h1>
        <span :class="['text-[11px] px-2 py-0.5 rounded-full', invoice?.status === 'issued' ? 'bg-teal-50 text-teal-700' : invoice?.status === 'voided' ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-700']">
          {{ getLabel('InvoiceStatus', invoice?.status) || invoice?.status }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>

    <template v-else-if="invoice">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <!-- 基本信息 -->
        <div class="em-card lg:col-span-2">
          <h3 class="text-sm font-medium text-content-primary mb-3">基本信息</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><span class="text-xs text-content-muted">发票号</span><p class="text-sm text-content-primary mt-0.5">{{ invoice.invoiceNo }}</p></div>
            <div><span class="text-xs text-content-muted">类型</span><p class="text-sm text-content-primary mt-0.5">{{ getLabel('InvoiceType', invoice.type) || invoice.type }}</p></div>
            <div><span class="text-xs text-content-muted">价税合计</span><p class="text-sm font-medium text-content-primary mt-0.5">{{ formatMoney(invoice.amount) }}</p></div>
            <div><span class="text-xs text-content-muted">税率</span><p class="text-sm text-content-primary mt-0.5">{{ invoice.taxRate }}%</p></div>
            <div><span class="text-xs text-content-muted">税额</span><p class="text-sm text-content-primary mt-0.5">{{ formatMoney(invoice.taxAmount) }}</p></div>
            <div><span class="text-xs text-content-muted">开票日期</span><p class="text-sm text-content-primary mt-0.5">{{ invoice.issuedAt || '-' }}</p></div>
            <div><span class="text-xs text-content-muted">关联合同</span><p class="text-sm mt-0.5">
              <NuxtLink v-if="invoice.contractId" :to="`/dashboard/contracts/${invoice.contractId}`" class="text-brand-600 hover:underline">{{ invoice.contractName }}</NuxtLink>
              <span v-else class="text-content-muted">-</span>
            </p></div>
            <div><span class="text-xs text-content-muted">客户</span><p class="text-sm text-content-primary mt-0.5">{{ invoice.customerName || '-' }}</p></div>
            <div><span class="text-xs text-content-muted">创建人</span><p class="text-sm text-content-primary mt-0.5">{{ invoice.createdByName || '-' }}</p></div>
          </div>
          <div v-if="invoice.remark" class="mt-4 pt-4 border-t border-line-light">
            <span class="text-xs text-content-muted">备注</span><p class="text-sm text-content-primary mt-0.5">{{ invoice.remark }}</p>
          </div>
        </div>

        <!-- 操作 -->
        <div class="em-card">
          <h3 class="text-sm font-medium text-content-primary mb-3">操作</h3>
          <div class="space-y-2">
            <NuxtLink :to="`/dashboard/finance/invoices?edit=${invoice.id}`" class="block text-center text-sm py-2 px-4 rounded-md border border-line hover:bg-surface-hover transition-colors">编辑发票</NuxtLink>
          </div>
        </div>
      </div>

      <!-- 电子发票文件 -->
      <div v-if="invoice.filePath" class="em-card mb-6">
        <h3 class="text-sm font-medium text-content-primary mb-3">电子发票</h3>
        <div class="flex items-center gap-2">
          <span class="text-sm text-content-primary">{{ invoice.filePath.split('/').pop() }}</span>
          <a :href="invoice.filePath" target="_blank" class="text-xs text-brand-600 hover:underline">下载</a>
        </div>
      </div>

      <!-- 关联收款记录 -->
      <div v-if="invoice.contractId" class="em-card">
        <h3 class="text-sm font-medium text-content-primary mb-3">关联收款记录</h3>
        <div v-if="!payments.length" class="text-xs text-content-muted py-6 text-center">暂无收款记录</div>
        <div v-else class="space-y-1">
          <div v-for="p in payments" :key="p.id" class="flex items-center justify-between p-2 rounded-md bg-surface-hover text-xs">
            <div class="flex items-center gap-3">
              <span class="text-content-secondary">{{ p.paymentDate }}</span>
              <span class="text-content-muted">{{ p.paymentMethod }}</span>
              <span v-if="p.remark" class="text-content-muted">{{ p.remark }}</span>
            </div>
            <span class="font-medium text-content-primary">{{ formatMoney(p.amount) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
