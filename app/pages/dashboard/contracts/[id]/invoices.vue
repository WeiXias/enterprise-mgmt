<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '发票', middleware: ['auth'], watermark: true })

const route = useRoute()
const router = useRouter()
const contractId = route.params.id as string
const { $api } = useNuxtApp()

const contract = ref<any>(null)
const invoices = ref<any[]>([])
const loading = ref(true)

function formatMoney(v: any) {
  const n = Number(v)
  if (!n || isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function formatDate(v: any) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

const invoiceStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待开具', color: 'bg-surface-hover text-content-secondary' },
  issued: { label: '已开具', color: 'bg-brand-50 text-brand-600' },
  voided: { label: '已作废', color: 'bg-red-50 text-red-600' },
}

async function loadData() {
  loading.value = true
  try {
    const [contractRes, invoicesRes] = await Promise.all([
      $api(`/api/contracts/${contractId}`) as any,
      $api(`/api/contracts/${contractId}/invoices`) as any,
    ])
    if (contractRes?.code === 0) contract.value = contractRes.data
    if (invoicesRes?.code === 0) invoices.value = invoicesRes.data?.items || invoicesRes.data || []
  } catch {
    /* ignore */
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="mb-4 flex items-center gap-2 text-sm">
    <NuxtLink to="/dashboard/contracts/center" class="text-content-muted hover:text-brand-600">合同中心</NuxtLink>
    <span class="text-content-muted">/</span>
    <NuxtLink :to="`/dashboard/contracts/${contractId}`" class="text-content-muted hover:text-brand-600">{{ contract?.name || '合同详情' }}</NuxtLink>
    <span class="text-content-muted">/</span>
    <span class="text-content-primary">发票</span>
  </div>

  <DetailSkeleton v-if="loading" />
  <div v-else-if="!contract" class="text-center py-12 text-content-muted">合同不存在</div>
  <div v-else>
    <div class="em-card mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
          <UIcon name="i-lucide-file-text" class="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <div class="text-sm font-medium text-content-primary">{{ contract.name }}</div>
          <div class="text-xs text-content-muted">
            {{ contract.code }} · {{ contract.customer?.name }} · {{ formatMoney(contract.totalAmount) }}
          </div>
        </div>
        <NuxtLink :to="`/dashboard/contracts/${contractId}`" class="ml-auto text-xs text-brand-600 hover:text-brand-700">
          返回详情 →
        </NuxtLink>
      </div>
    </div>

    <div v-if="invoices.length === 0" class="em-card text-center py-12 text-content-muted">
      <UIcon name="i-lucide-receipt" class="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>还没有发票</p>
      <NuxtLink to="/dashboard/finance/invoices" class="inline-block mt-2 text-sm text-brand-600 hover:text-brand-700">去发票管理新建 →</NuxtLink>
    </div>
    <div v-else class="em-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line-light text-left text-content-muted">
            <th class="px-4 py-2.5 font-normal">发票号</th>
            <th class="px-4 py-2.5 font-normal">类型</th>
            <th class="px-4 py-2.5 font-normal">金额</th>
            <th class="px-4 py-2.5 font-normal">税率</th>
            <th class="px-4 py-2.5 font-normal">税额</th>
            <th class="px-4 py-2.5 font-normal">状态</th>
            <th class="px-4 py-2.5 font-normal">开具日期</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in invoices" :key="inv.id" class="border-b border-line-light last:border-b-0 hover:bg-line-light/30">
            <td class="px-4 py-2.5 text-content-primary font-mono text-xs">{{ inv.invoiceNo }}</td>
            <td class="px-4 py-2.5 text-content-secondary">{{ inv.type }}</td>
            <td class="px-4 py-2.5">{{ formatMoney(inv.amount) }}</td>
            <td class="px-4 py-2.5 text-content-secondary">{{ inv.taxRate ? inv.taxRate + '%' : '-' }}</td>
            <td class="px-4 py-2.5">{{ inv.taxAmount ? formatMoney(inv.taxAmount) : '-' }}</td>
            <td class="px-4 py-2.5">
              <span :class="['text-xs px-1.5 py-0.5 rounded-full', invoiceStatusConfig[inv.status]?.color || '']">
                {{ invoiceStatusConfig[inv.status]?.label || inv.status }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-content-secondary">{{ formatDate(inv.issuedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
