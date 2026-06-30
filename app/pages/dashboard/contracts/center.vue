<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '合同中心', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const { getLabel } = useEnum()

const loading = ref(true)

// KPI
const kpi = ref({
  total: 0, draft: 0, approved: 0, inProgress: 0, completed: 0, terminated: 0,
  totalAmount: 0, newThisMonth: 0,
  receivedAmount: 0, unreceivedAmount: 0, overdueAmount: 0,
})

// 最近合同
const recentContracts = ref<any[]>([])
// 到期合同
const expiringContracts = ref<any[]>([])

function formatMoney(v: any) {
  const n = Number(v)
  if (!n || isNaN(n)) return '¥0'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function formatDate(v: any) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

async function loadData() {
  loading.value = true
  try {
    const [listRes, statsRes] = await Promise.all([
      $api('/api/contracts', { params: { pageSize: 1 } }) as any,
      $api('/api/contracts/payment-stats') as any,
    ])

    // 从支付统计获取回款数据
    if (statsRes?.code === 0) {
      const s = statsRes.data
      kpi.value.receivedAmount = s.totalReceivedAmount || 0
      kpi.value.unreceivedAmount = s.totalUnreceivedAmount || 0
      kpi.value.overdueAmount = s.overdueAmount || 0
    }

    // 加载全部合同用于统计状态分布（简化：用多次请求取不同状态总数）
    const [draftRes, approvedRes, inProgressRes, completedRes, terminatedRes, recentRes] = await Promise.all([
      $api('/api/contracts', { params: { pageSize: 1, status: 'draft' } }) as any,
      $api('/api/contracts', { params: { pageSize: 1, status: 'approved' } }) as any,
      $api('/api/contracts', { params: { pageSize: 1, status: 'in_progress' } }) as any,
      $api('/api/contracts', { params: { pageSize: 1, status: 'completed' } }) as any,
      $api('/api/contracts', { params: { pageSize: 1, status: 'terminated' } }) as any,
      $api('/api/contracts', { params: { pageSize: 5 } }) as any,
    ])

    kpi.value.draft = draftRes?.data?.total || 0
    kpi.value.approved = approvedRes?.data?.total || 0
    kpi.value.inProgress = inProgressRes?.data?.total || 0
    kpi.value.completed = completedRes?.data?.total || 0
    kpi.value.terminated = terminatedRes?.data?.total || 0
    kpi.value.total = kpi.value.draft + kpi.value.approved + kpi.value.inProgress + kpi.value.completed + kpi.value.terminated

    if (recentRes?.code === 0) {
      recentContracts.value = recentRes.data.items || []
      // 总金额取列表中的金额（简化处理）
      const allItems = recentRes.data.items || []
      kpi.value.totalAmount = allItems.reduce((sum: number, c: any) => sum + (c.totalAmount || 0), 0)
    }

    // 本月新增：取本月创建的合同
    const now = new Date()
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const allRes = await $api('/api/contracts', { params: { pageSize: 100 } }) as any
    if (allRes?.code === 0) {
      const items = allRes.data.items || []
      kpi.value.newThisMonth = items.filter((c: any) => c.createdAt && c.createdAt >= startOfMonth).length
    }

    // 到期提醒：30 天内到期的活跃合同
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    const threshold = thirtyDays.toISOString().slice(0, 10)
    kpi.value.newThisMonth = kpi.value.newThisMonth // already set above

    // 加载 30 天内到期合同
    const expiringRes = await $api('/api/contracts', { params: { pageSize: 100, status: 'in_progress' } }) as any
    if (expiringRes?.code === 0) {
      expiringContracts.value = (expiringRes.data.items || []).filter((c: any) => {
        if (!c.endDate) return false
        return c.endDate >= new Date().toISOString().slice(0, 10) && c.endDate <= threshold
      })
    }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-surface-hover text-content-secondary' },
  approved: { label: '已审批', color: 'bg-brand-50 text-brand-600' },
  in_progress: { label: '执行中', color: 'bg-brand-50 text-brand-700' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  terminated: { label: '已终止', color: 'bg-danger-50 text-danger-600' },
}

onMounted(() => loadData())
</script>

<template>
  <div v-if="loading" class="py-4"><DetailSkeleton /></div>
  <div v-else>
    <!-- KPI 卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
          <UIcon name="i-lucide-file-text" class="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ kpi.total }}</div>
          <div class="text-xs text-content-muted">合同总数</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ kpi.inProgress + kpi.approved }}</div>
          <div class="text-xs text-content-muted">进行中</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <UIcon name="i-lucide-dollar-sign" class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ formatMoney(kpi.receivedAmount) }}</div>
          <div class="text-xs text-content-muted">已回款</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-danger-50 flex items-center justify-center">
          <UIcon name="i-lucide-clock" class="w-5 h-5 text-danger-500" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ formatMoney(kpi.unreceivedAmount) }}</div>
          <div class="text-xs text-content-muted">待回款</div>
        </div>
      </div>
    </div>

    <!-- 状态分布 + 回款概览 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-primary mb-3">状态分布</h3>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-content-secondary">草稿</span>
            <span class="text-content-primary">{{ kpi.draft }}</span>
          </div>
          <div class="h-1.5 bg-line-light rounded-full overflow-hidden">
            <div class="h-full bg-surface-hover rounded-full" :style="{ width: kpi.total ? (kpi.draft / kpi.total * 100) + '%' : '0%' }" />
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-content-secondary">已审批</span>
            <span class="text-content-primary">{{ kpi.approved }}</span>
          </div>
          <div class="h-1.5 bg-line-light rounded-full overflow-hidden">
            <div class="h-full bg-brand-400 rounded-full" :style="{ width: kpi.total ? (kpi.approved / kpi.total * 100) + '%' : '0%' }" />
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-content-secondary">执行中</span>
            <span class="text-content-primary">{{ kpi.inProgress }}</span>
          </div>
          <div class="h-1.5 bg-line-light rounded-full overflow-hidden">
            <div class="h-full bg-brand-500 rounded-full" :style="{ width: kpi.total ? (kpi.inProgress / kpi.total * 100) + '%' : '0%' }" />
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-content-secondary">已完成</span>
            <span class="text-content-primary">{{ kpi.completed }}</span>
          </div>
          <div class="h-1.5 bg-line-light rounded-full overflow-hidden">
            <div class="h-full bg-teal-500 rounded-full" :style="{ width: kpi.total ? (kpi.completed / kpi.total * 100) + '%' : '0%' }" />
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-content-secondary">已终止</span>
            <span class="text-content-primary">{{ kpi.terminated }}</span>
          </div>
          <div class="h-1.5 bg-line-light rounded-full overflow-hidden">
            <div class="h-full bg-danger-400 rounded-full" :style="{ width: kpi.total ? (kpi.terminated / kpi.total * 100) + '%' : '0%' }" />
          </div>
        </div>
      </div>

      <div class="em-card">
        <h3 class="text-sm font-medium text-content-primary mb-3">回款概览</h3>
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-content-secondary">已回款</span>
              <span class="text-content-primary font-medium">{{ formatMoney(kpi.receivedAmount) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-content-secondary">待回款</span>
              <span class="text-content-primary font-medium">{{ formatMoney(kpi.unreceivedAmount) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs mb-2">
              <span class="text-content-secondary">逾期</span>
              <span class="text-danger-500 font-medium">{{ formatMoney(kpi.overdueAmount) }}</span>
            </div>
            <div class="h-2 bg-line-light rounded-full overflow-hidden flex">
              <div
                class="h-full bg-teal-400"
                :style="{ width: (kpi.receivedAmount + kpi.unreceivedAmount) > 0 ? (kpi.receivedAmount / (kpi.receivedAmount + kpi.unreceivedAmount) * 100) + '%' : '0%' }"
              />
              <div
                class="h-full bg-amber-300"
                :style="{ width: (kpi.receivedAmount + kpi.unreceivedAmount) > 0 ? (kpi.overdueAmount / (kpi.receivedAmount + kpi.unreceivedAmount) * 100) + '%' : '0%' }"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-3">
            <div class="p-3 rounded-lg bg-surface-page text-center">
              <div class="text-lg text-content-inverse font-medium">{{ formatMoney(kpi.overdueAmount) }}</div>
              <div class="text-xs text-content-muted">预期金额</div>
            </div>
            <div class="p-3 rounded-lg bg-surface-page text-center">
              <div class="text-lg text-content-inverse font-medium">{{ kpi.total ? Math.round(kpi.receivedAmount / Math.max(kpi.receivedAmount + kpi.unreceivedAmount, 1) * 100) : 0 }}%</div>
              <div class="text-xs text-content-muted">回款率</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="grid grid-cols-4 gap-3 mb-6">
      <NuxtLink to="/dashboard/contracts/create" class="em-card flex flex-col items-center gap-1.5 py-3 hover:shadow-sm transition-shadow text-center">
        <div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
          <UIcon name="i-lucide-plus-circle" class="w-4 h-4 text-brand-600" />
        </div>
        <span class="text-xs text-content-secondary">新建合同</span>
      </NuxtLink>
      <NuxtLink to="/dashboard/contracts" class="em-card flex flex-col items-center gap-1.5 py-3 hover:shadow-sm transition-shadow text-center">
        <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <UIcon name="i-lucide-list" class="w-4 h-4 text-indigo-600" />
        </div>
        <span class="text-xs text-content-secondary">合同列表</span>
      </NuxtLink>
      <NuxtLink to="/dashboard/contracts/ledger" class="em-card flex flex-col items-center gap-1.5 py-3 hover:shadow-sm transition-shadow text-center">
        <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <UIcon name="i-lucide-table" class="w-4 h-4 text-teal-600" />
        </div>
        <span class="text-xs text-content-secondary">合同台账</span>
      </NuxtLink>
      <NuxtLink to="/dashboard/contracts/templates" class="em-card flex flex-col items-center gap-1.5 py-3 hover:shadow-sm transition-shadow text-center">
        <div class="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <UIcon name="i-lucide-layers" class="w-4 h-4 text-violet-600" />
        </div>
        <span class="text-xs text-content-secondary">模板管理</span>
      </NuxtLink>
    </div>

    <!-- 最近合同 + 到期提醒 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">最近合同</h3>
          <NuxtLink to="/dashboard/contracts" class="text-xs text-brand-600 hover:text-brand-700">查看全部 →</NuxtLink>
        </div>
        <div v-if="recentContracts.length === 0" class="text-center py-6 text-content-muted text-xs">暂无合同</div>
        <div v-else class="space-y-2">
          <NuxtLink
            v-for="c in recentContracts" :key="c.id"
            :to="`/dashboard/contracts/${c.id}`"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-line-light/40 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm text-content-primary truncate">{{ c.name }}</div>
              <div class="text-xs text-content-muted">{{ c.code }} · {{ c.customer?.name }}</div>
            </div>
            <div class="text-xs text-content-secondary">{{ formatMoney(c.totalAmount) }}</div>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[c.status]?.color || '']">
              {{ statusConfig[c.status]?.label || c.status }}
            </span>
          </NuxtLink>
        </div>
      </div>

      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">30 天内到期</h3>
          <NuxtLink to="/dashboard/contracts" class="text-xs text-brand-600 hover:text-brand-700">查看全部 →</NuxtLink>
        </div>
        <div v-if="expiringContracts.length === 0" class="text-center py-6 text-content-muted text-xs">
          <UIcon name="i-lucide-check-circle" class="w-5 h-5 mx-auto mb-1 opacity-40" />
          近期没有到期合同
        </div>
        <div v-else class="space-y-2">
          <NuxtLink
            v-for="c in expiringContracts" :key="c.id"
            :to="`/dashboard/contracts/${c.id}`"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-line-light/40 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm text-content-primary truncate">{{ c.name }}</div>
              <div class="text-xs text-content-muted">{{ c.customer?.name }}</div>
            </div>
            <div class="text-xs text-amber-600">{{ formatDate(c.endDate) }}</div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
