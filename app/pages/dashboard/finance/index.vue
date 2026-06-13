<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '财务总览', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const stats = ref({ totalIncome: 0, totalExpense: 0, netBalance: 0, overduePaymentCount: 0, pendingReimbursementCount: 0 })
const overduePayments = ref<any[]>([])
const recentTransactions = ref<any[]>([])
const incomeCategories = ref<any[]>([])
const expenseCategories = ref<any[]>([])
const loading = ref(true)

// 快捷登记
const showQuickModal = ref(false)
const quickLoading = ref(false)
const quickForm = ref({ type: 'income', amount: 0, category: '', transactionDate: new Date().toISOString().slice(0, 10), description: '' })

function formatMoney(v: any) { const n = Number(v); if (!n) return '¥0'; return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchData() {
  loading.value = true
  try {
    const [overviewRes, categoriesRes] = await Promise.all([
      $api('/api/finance/overview') as any,
      $api('/api/finance/categories') as any,
    ])
    if (overviewRes?.code === 0) {
      stats.value = overviewRes.data.stats
      recentTransactions.value = overviewRes.data.recentTransactions || []
      overduePayments.value = overviewRes.data.overduePayments || []
    }
    if (categoriesRes?.code === 0) {
      incomeCategories.value = categoriesRes.data.income || []
      expenseCategories.value = categoriesRes.data.expense || []
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function getCategories() {
  const list = quickForm.value.type === 'income' ? incomeCategories.value : expenseCategories.value
  return list.map((c: any) => c.name)
}

async function handleQuickCreate() {
  if (!quickForm.value.amount || !quickForm.value.category) {
    toast.add({ title: '金额和分类都得填', color: 'warning' }); return
  }
  quickLoading.value = true
  try {
    const res = await $api('/api/finance/transactions', { method: 'POST', body: quickForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '已登记', color: 'success' })
      showQuickModal.value = false
      quickForm.value = { type: 'income', amount: 0, category: '', transactionDate: new Date().toISOString().slice(0, 10), description: '' }
      fetchData()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '登记失败', color: 'error' }) }
  finally { quickLoading.value = false }
}

onMounted(() => fetchData())
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-[var(--color-content-secondary)]">马上就好...</div>
  <div v-else>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-[var(--color-content-primary)]">财务总览</h1>
        <p class="text-sm text-[var(--color-content-secondary)] mt-0.5">看看财务状况怎么样</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-plus-circle" color="primary" @click="showQuickModal = true">记一笔</UButton>
        <NuxtLink to="/dashboard/finance/invoices"><UButton icon="i-lucide-file-check" variant="ghost" color="neutral" size="sm">发票管理</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/transactions"><UButton icon="i-lucide-list" variant="ghost" color="neutral" size="sm">收支明细</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/reports"><UButton icon="i-lucide-chart-no-axes-column" variant="ghost" color="neutral" size="sm">报表</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/budgets"><UButton icon="i-lucide-target" variant="ghost" color="neutral" size="sm">预算</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/categories"><UButton icon="i-lucide-settings" variant="ghost" color="neutral" size="sm">分类</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/ar"><UButton icon="i-lucide-receipt" variant="ghost" color="neutral" size="sm">应收</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/ap"><UButton icon="i-lucide-credit-card" variant="ghost" color="neutral" size="sm">应付</UButton></NuxtLink>
        <NuxtLink to="/dashboard/finance/settings"><UButton icon="i-lucide-sliders-horizontal" variant="ghost" color="neutral" size="sm">设置</UButton></NuxtLink>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="warm-card flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center"><UIcon name="i-lucide-trending-up" class="w-5 h-5 text-teal-500" /></div>
        <div><p class="text-xl font-semibold text-teal-600">{{ formatMoney(stats.totalIncome) }}</p><p class="text-xs text-[var(--color-content-secondary)]">总收入</p></div>
      </div>
      <div class="warm-card flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><UIcon name="i-lucide-trending-down" class="w-5 h-5 text-red-400" /></div>
        <div><p class="text-xl font-semibold text-red-500">{{ formatMoney(stats.totalExpense) }}</p><p class="text-xs text-[var(--color-content-secondary)]">总支出</p></div>
      </div>
      <div class="warm-card flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center"><UIcon name="i-lucide-dollar-sign" class="w-5 h-5 text-[var(--color-brand-500)]" /></div>
        <div><p class="text-xl font-semibold" :class="stats.netBalance >= 0 ? 'text-teal-600' : 'text-red-500'">{{ formatMoney(stats.netBalance) }}</p><p class="text-xs text-[var(--color-content-secondary)]">净利润</p></div>
      </div>
      <div class="warm-card flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center"><UIcon name="i-lucide-bell" class="w-5 h-5 text-[var(--color-brand-400)]" /></div>
        <div>
          <p class="text-xl font-semibold text-[var(--color-content-primary)]">{{ stats.overduePaymentCount + stats.pendingReimbursementCount }}</p>
          <p class="text-xs text-[var(--color-content-secondary)]">待处理（{{ stats.overduePaymentCount }} 逾期 + {{ stats.pendingReimbursementCount }} 报销）</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 逾期回款提醒 -->
      <div class="warm-card">
        <h3 class="text-sm font-medium text-[var(--color-content-primary)] mb-3">逾期未回款</h3>
        <div v-if="overduePayments.length === 0" class="text-xs text-[var(--color-content-secondary)] py-4 text-center">没有逾期回款，继续保持！</div>
        <div v-else class="space-y-2">
          <div v-for="p in overduePayments" :key="p.id" class="flex items-center justify-between p-2 rounded-lg bg-red-50">
            <div>
              <span class="text-sm text-[var(--color-content-primary)]">{{ p.contractName }} ({{ p.contractCode }})</span>
              <span class="text-xs text-[var(--color-content-secondary)] ml-2">{{ p.planDate }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-red-500">{{ formatMoney(p.amount) }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">逾期 {{ p.overdueDays }} 天</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近流水 -->
      <div class="warm-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-[var(--color-content-primary)]">最近流水</h3>
          <NuxtLink to="/dashboard/finance/transactions" class="text-xs text-[var(--color-brand-600)] hover:underline">查看全部</NuxtLink>
        </div>
        <div v-if="recentTransactions.length === 0" class="text-xs text-[var(--color-content-secondary)] py-4 text-center">暂无流水</div>
        <div v-else class="space-y-1.5">
          <div v-for="t in recentTransactions" :key="t.id" class="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-line-light)]/40 text-xs">
            <div class="flex items-center gap-2">
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', t.type === 'income' ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600']">{{ t.type === 'income' ? '收' : '支' }}</span>
              <span class="text-[var(--color-content-primary)]">{{ t.description || t.category }}</span>
              <span class="text-[var(--color-content-secondary)]">{{ t.transactionDate }}</span>
            </div>
            <span :class="t.type === 'income' ? 'text-teal-600' : 'text-red-500'" class="font-medium">{{ t.type === 'income' ? '+' : '-' }}{{ formatMoney(t.amount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <NuxtLink to="/dashboard/finance/invoices" class="warm-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><UIcon name="i-lucide-file-check" class="w-4 h-4 text-purple-500" /></div>
        <div><p class="text-sm text-[var(--color-content-primary)]">发票管理</p><p class="text-xs text-[var(--color-content-secondary)]">开票和追踪</p></div>
      </NuxtLink>
      <NuxtLink to="/dashboard/finance/transactions" class="warm-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><UIcon name="i-lucide-plus-circle" class="w-4 h-4 text-teal-500" /></div>
        <div><p class="text-sm text-[var(--color-content-primary)]">登记收入</p><p class="text-xs text-[var(--color-content-secondary)]">记录合同回款</p></div>
      </NuxtLink>
      <NuxtLink to="/dashboard/finance/reimbursements" class="warm-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center"><UIcon name="i-lucide-receipt" class="w-4 h-4 text-[var(--color-brand-500)]" /></div>
        <div><p class="text-sm text-[var(--color-content-primary)]">提交报销</p><p class="text-xs text-[var(--color-content-secondary)]">登记日常支出</p></div>
      </NuxtLink>
      <NuxtLink to="/dashboard/finance/reports" class="warm-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4">
        <div class="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center"><UIcon name="i-lucide-file-spreadsheet" class="w-4 h-4 text-[var(--color-brand-400)]" /></div>
        <div><p class="text-sm text-[var(--color-content-primary)]">月度报表</p><p class="text-xs text-[var(--color-content-secondary)]">看看赚了多少</p></div>
      </NuxtLink>
      <div class="warm-card flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer p-4" @click="showQuickModal = true">
        <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><UIcon name="i-lucide-minus-circle" class="w-4 h-4 text-red-400" /></div>
        <div><p class="text-sm text-[var(--color-content-primary)]">登记支出</p><p class="text-xs text-[var(--color-content-secondary)]">记录日常开销</p></div>
      </div>
    </div>

    <!-- 快捷登记弹窗 -->
    <CommonFormModal v-model="showQuickModal" title="记一笔" subtitle="快速记录一笔收入或支出" size="compact" :loading="quickLoading" @confirm="handleQuickCreate">
      <div class="flex gap-2 mb-3">
        <UButton :color="quickForm.type === 'income' ? 'primary' : 'error'" :variant="quickForm.type === 'income' ? 'solid' : 'outline'" size="sm" @click="quickForm.type = 'income'; quickForm.category = ''">收入</UButton>
        <UButton :color="quickForm.type === 'expense' ? 'error' : 'neutral'" :variant="quickForm.type === 'expense' ? 'solid' : 'outline'" size="sm" @click="quickForm.type = 'expense'; quickForm.category = ''">支出</UButton>
      </div>
      <div class="mb-3">
        <label class="block text-sm text-[var(--color-content-secondary)] mb-1">分类</label>
        <select v-model="quickForm.category" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15">
          <option value="">选择分类</option>
          <option v-for="c in getCategories()" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="block text-sm text-[var(--color-content-secondary)] mb-1">金额 <span class="text-[var(--color-danger-600)]">*</span></label>
        <input v-model.number="quickForm.amount" type="number" step="0.01" placeholder="0.00" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
      </div>
      <div class="mb-3">
        <label class="block text-sm text-[var(--color-content-secondary)] mb-1">日期</label>
        <input v-model="quickForm.transactionDate" type="date" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
      </div>
      <div>
        <label class="block text-sm text-[var(--color-content-secondary)] mb-1">说明</label>
        <input v-model="quickForm.description" type="text" placeholder="简单描述一下..." class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
      </div>
    </CommonFormModal>
  </div>
</template>
