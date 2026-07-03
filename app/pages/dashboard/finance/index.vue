<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '财务总览', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const stats = ref({ totalAssets: 0, totalLiabilities: 0, totalEquity: 0, netIncome: 0, netExpense: 0, netProfit: 0, overduePaymentCount: 0, pendingReimbursementCount: 0 })
const recentVouchers = ref<any[]>([])
const loading = ref(true)

function formatMoney(v: any) { const n = Number(v); if (!n) return '¥0'; return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchData() {
  loading.value = true
  try {
    const res = await $api('/api/accounting/overview') as any
    if (res?.code === 0) {
      stats.value = res.data.stats
      recentVouchers.value = res.data.recentVouchers || []
    }
  } catch { toast.add({ title: "加载概览出了点问题", color: "error" }) }
  finally { loading.value = false }
}

onMounted(() => fetchData())
</script>

<template>
  <div v-if="loading" class="py-4"><ListSkeleton /></div>
  <div v-else>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">财务总览</h1>
        <p class="text-sm text-content-secondary mt-0.5">看看财务状况怎么样</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/dashboard/finance/accounting/vouchers"><UButton icon="i-lucide-plus" color="primary">记凭证</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/invoices"><UButton icon="i-lucide-file-check" variant="ghost" color="neutral" size="sm">发票管理</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/accounting/vouchers"><UButton icon="i-lucide-list" variant="ghost" color="neutral" size="sm">凭证列表</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/accounting/reports/trial-balance"><UButton icon="i-lucide-chart-no-axes-column" variant="ghost" color="neutral" size="sm">报表</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/budgets"><UButton icon="i-lucide-target" variant="ghost" color="neutral" size="sm">预算</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/accounting/accounts"><UButton icon="i-lucide-settings" variant="ghost" color="neutral" size="sm">科目</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/ar"><UButton icon="i-lucide-receipt" variant="ghost" color="neutral" size="sm">应收</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/ap"><UButton icon="i-lucide-credit-card" variant="ghost" color="neutral" size="sm">应付</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/settings"><UButton icon="i-lucide-sliders-horizontal" variant="ghost" color="neutral" size="sm">设置</UButton></NuxtLink>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="em-card flex items-center gap-4">
        <div class="w-10 h-10 rounded-md bg-teal-50 flex items-center justify-center"><UIcon name="i-lucide-building" class="w-5 h-5 text-teal-500" /></div>
        <div><p class="text-xl font-medium text-teal-600">{{ formatMoney(stats.totalAssets) }}</p><p class="text-xs text-content-secondary">总资产</p></div>
      </div>
      <div class="em-card flex items-center gap-4">
        <div class="w-10 h-10 rounded-md bg-danger-50 flex items-center justify-center"><UIcon name="i-lucide-credit-card" class="w-5 h-5 text-danger-500" /></div>
        <div><p class="text-xl font-medium text-danger-500">{{ formatMoney(stats.totalLiabilities) }}</p><p class="text-xs text-content-secondary">总负债</p></div>
      </div>
      <div class="em-card flex items-center gap-4">
        <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-dollar-sign" class="w-5 h-5 text-brand-500" /></div>
        <div><p class="text-xl font-medium" :class="stats.netProfit >= 0 ? 'text-teal-600' : 'text-danger-500'">{{ formatMoney(stats.netProfit) }}</p><p class="text-xs text-content-secondary">净利润</p></div>
      </div>
      <div class="em-card flex items-center gap-4">
        <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-bell" class="w-5 h-5 text-brand-400" /></div>
        <div>
          <p class="text-xl font-medium text-content-primary">{{ stats.overduePaymentCount + stats.pendingReimbursementCount }}</p>
          <p class="text-xs text-content-secondary">待跟进（{{ stats.overduePaymentCount }} 逾期 + {{ stats.pendingReimbursementCount }} 报销）</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 资产负债速览 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">资产负债速览</h3>
          <NuxtLink to="/dashboard/finance/accounting/reports/balance-sheet" class="text-xs text-brand-600 hover:underline">完整报表</NuxtLink>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between py-1"><span class="text-content-secondary">资产总额</span><span class="text-teal-600 font-medium">{{ formatMoney(stats.totalAssets) }}</span></div>
          <div class="flex justify-between py-1"><span class="text-content-secondary">负债总额</span><span class="text-danger-500 font-medium">{{ formatMoney(stats.totalLiabilities) }}</span></div>
          <div class="flex justify-between py-1 border-t border-line-light pt-2"><span class="text-content-secondary">净资产</span><span class="font-medium" :class="stats.totalEquity >= 0 ? 'text-teal-600' : 'text-danger-500'">{{ formatMoney(stats.totalEquity) }}</span></div>
          <div class="flex justify-between py-1"><span class="text-content-secondary">本期收入</span><span class="text-teal-600 font-medium">{{ formatMoney(stats.netIncome) }}</span></div>
          <div class="flex justify-between py-1"><span class="text-content-secondary">本期支出</span><span class="text-danger-500 font-medium">{{ formatMoney(stats.netExpense) }}</span></div>
        </div>
      </div>

      <!-- 最近凭证 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">最近凭证</h3>
          <NuxtLink to="/dashboard/finance/accounting/vouchers" class="text-xs text-brand-600 hover:underline">查看全部</NuxtLink>
        </div>
        <div v-if="recentVouchers.length === 0" class="text-xs text-content-secondary py-4 text-center">暂无凭证</div>
        <div v-else class="space-y-1.5">
          <div v-for="v in recentVouchers" :key="v.id" class="flex items-center justify-between p-2 rounded-md hover:bg-line-light/40 text-xs">
            <div class="flex items-center gap-2">
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full',
                v.status === 'posted' ? 'bg-teal-50 text-teal-600' :
                v.status === 'approved' ? 'bg-blue-50 text-blue-600' :
                v.status === 'reviewed' ? 'bg-brand-50 text-brand-600' :
                'bg-surface-hover text-content-muted']">{{ (['draft','reviewed','approved','posted'].indexOf(v.status) >= 0 ? ['草稿','已复核','已审核','已过账'][['draft','reviewed','approved','posted'].indexOf(v.status)] : v.status) }}</span>
              <span class="text-content-primary font-mono text-xs">{{ v.voucherNo }}</span>
              <span class="text-content-muted">{{ v.summary }}</span>
            </div>
            <span class="text-xs text-content-muted">{{ v.voucherDate }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <NuxtLink to="/dashboard/finance/invoices" class="em-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-md bg-purple-50 flex items-center justify-center"><UIcon name="i-lucide-file-check" class="w-4 h-4 text-purple-500" /></div>
        <div><p class="text-sm text-content-primary">发票管理</p><p class="text-xs text-content-secondary">开票和追踪</p></div>
      </NuxtLink>
      <NuxtLink to="/dashboard/finance/accounting/vouchers/new" class="em-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-md bg-teal-50 flex items-center justify-center"><UIcon name="i-lucide-plus-circle" class="w-4 h-4 text-teal-500" /></div>
        <div><p class="text-sm text-content-primary">新建凭证</p><p class="text-xs text-content-secondary">录入会计凭证</p></div>
      </NuxtLink>
      <NuxtLink to="/dashboard/finance/reimbursements" class="em-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-receipt" class="w-4 h-4 text-brand-500" /></div>
        <div><p class="text-sm text-content-primary">提交报销</p><p class="text-xs text-content-secondary">登记日常支出</p></div>
      </NuxtLink>
      <NuxtLink to="/dashboard/finance/accounting/reports/trial-balance" class="em-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-file-spreadsheet" class="w-4 h-4 text-brand-400" /></div>
        <div><p class="text-sm text-content-primary">财务报表</p><p class="text-xs text-content-secondary">试算/利润/负债</p></div>
      </NuxtLink>
      <NuxtLink to="/dashboard/finance/accounting/periods" class="em-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-md bg-danger-50 flex items-center justify-center"><UIcon name="i-lucide-calendar-check" class="w-4 h-4 text-danger-500" /></div>
        <div><p class="text-sm text-content-primary">会计期间</p><p class="text-xs text-content-secondary">期间结账</p></div>
      </NuxtLink>
    </div>
  </div>
</template>
