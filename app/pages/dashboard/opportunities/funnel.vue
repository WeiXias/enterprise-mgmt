<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '销售漏斗', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const loading = ref(true)
const funnelData = ref({ stages: [] as any[], total: 0, totalAmount: 0, winRate: 0 })

// 选中阶段查看详情
const selectedStage = ref<string | null>(null)
const stageOpportunities = ref<any[]>([])
const stageLoading = ref(false)

const { getLabel } = useEnum()

const stageColors: Record<string, string> = {
  initial_contact: 'bg-surface-muted',
  requirement_confirmed: 'bg-brand-400',
  proposal_submitted: 'bg-brand-400',
  business_negotiation: 'bg-brand-400',
  closed_won: 'bg-teal-400',
  closed_lost: 'bg-danger-400',
}

function formatMoney(v: any) {
  const n = Number(v)
  if (!n || isNaN(n)) return '¥0'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function fetchFunnel() {
  loading.value = true
  try {
    const res = await $api('/api/opportunities/funnel') as any
    if (res?.code === 0) {
      funnelData.value = res.data
    }
  } catch {
    toast.add({ title: '加载出了点问题', color: 'error' })
  } finally {
    loading.value = false
  }
}

const stageModalOpen = ref(false)

async function selectStage(status: string) {
  if (status === 'closed_lost' || status === 'closed_won') return
  selectedStage.value = status
  stageModalOpen.value = true
  stageLoading.value = true
  try {
    const res = await $api('/api/opportunities', {
      params: { status, pageSize: 50 }
    }) as any
    if (res?.code === 0) {
      stageOpportunities.value = res.data.items || []
    }
  } catch { /* ignore */ }
  finally { stageLoading.value = false }
}

function closeStageModal() {
  stageModalOpen.value = false
  selectedStage.value = null
}

onMounted(() => fetchFunnel())
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">销售漏斗</h1>
        <p class="text-sm text-content-muted mt-0.5">
          看看商机在哪个阶段卡住了
        </p>
      </div>
      <NuxtLink to="/dashboard/opportunities">
        <UButton icon="i-lucide-list" variant="ghost" color="neutral" size="sm">商机列表</UButton>
      </NuxtLink>
    </div>

    <!-- 概要卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="em-card flex items-center gap-3">
        <div class="w-9 h-9 rounded-md bg-brand-50 flex items-center justify-center">
          <UIcon name="i-lucide-flag" class="w-5 h-5 text-brand-500" />
        </div>
        <div>
          <p class="text-lg font-medium text-content-primary">{{ funnelData.total }}</p>
          <p class="text-xs text-content-muted">商机总数</p>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-9 h-9 rounded-md bg-teal-50 flex items-center justify-center">
          <UIcon name="i-lucide-dollar-sign" class="w-5 h-5 text-teal-500" />
        </div>
        <div>
          <p class="text-lg font-medium text-teal-600">{{ formatMoney(funnelData.totalAmount) }}</p>
          <p class="text-xs text-content-muted">总金额</p>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-9 h-9 rounded-md bg-brand-50 flex items-center justify-center">
          <UIcon name="i-lucide-trending-up" class="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <p class="text-lg font-medium text-brand-600">{{ Math.round(funnelData.winRate * 100) }}%</p>
          <p class="text-xs text-content-muted">赢单率</p>
        </div>
      </div>
    </div>

    <!-- 漏斗图 -->
    <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
    <div v-else class="em-card">
      <h3 class="text-sm font-medium text-content-secondary mb-4">各阶段分布</h3>
      <div class="space-y-3">
        <div
          v-for="(stage, i) in funnelData.stages"
          :key="stage.status"
          class="flex items-center gap-4 cursor-pointer hover:bg-surface-hover rounded-md p-2 -mx-2 transition-colors"
          :class="{ 'opacity-50': stage.status === 'closed_lost' }"
          @click="selectStage(stage.status)"
        >
          <!-- 阶段色条 -->
          <div
            :class="[stageColors[stage.status] || 'bg-surface-hover', 'w-2 h-10 rounded-full flex-shrink-0']"
          />

          <!-- 阶段信息 -->
          <div class="w-24 flex-shrink-0">
            <p class="text-sm font-medium text-content-secondary">{{ getLabel('OpportunityStatus', stage.status) }}</p>
            <p class="text-xs text-content-muted">{{ stage.count }} 个 · {{ formatMoney(stage.totalAmount) }}</p>
          </div>

          <!-- 进度条 -->
          <div class="flex-1 h-6 bg-surface-hover rounded-full overflow-hidden">
            <div
              :class="[stageColors[stage.status] || 'bg-surface-hover', 'h-full rounded-full transition-all flex items-center justify-end pr-2']"
              :style="{ width: funnelData.total > 0 ? Math.max((stage.count / funnelData.total) * 100, 5) + '%' : '0%' }"
            >
              <span v-if="stage.count > 0" class="text-xs text-white font-medium">{{ stage.count }}</span>
            </div>
          </div>

          <!-- 转化率 -->
          <div class="w-12 text-right">
            <span v-if="i > 0 && funnelData.stages[i - 1].count > 0" class="text-xs text-content-muted">
              {{ Math.round((stage.count / funnelData.stages[i - 1].count) * 100) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 阶段详情弹窗 -->
    <FormModal
      v-if="stageModalOpen"
      v-model:open="stageModalOpen"
      :title="selectedStage ? `${getLabel('OpportunityStatus', selectedStage)}阶段的商机` : ''"
      size="standard"
      @cancel="closeStageModal"
    >
      <template v-if="selectedStage">
        <div v-if="stageLoading" class="text-center py-6 text-content-muted">马上就好...</div>
        <div v-else-if="stageOpportunities.length === 0" class="text-center py-6 text-content-muted">这个阶段还没有商机</div>
        <div v-else class="space-y-2">
          <NuxtLink
            v-for="opp in stageOpportunities"
            :key="opp.id"
            :to="`/dashboard/opportunities/${opp.id}`"
            class="em-card flex items-center gap-3 !py-3 !px-4 hover:bg-surface-page transition-colors block"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm text-content-primary truncate">{{ opp.name }}</p>
              <p class="text-xs text-content-muted mt-0.5">
                {{ opp.customer?.name || '-' }}
                <span v-if="opp.owner?.name" class="ml-2">{{ opp.owner.name }}</span>
              </p>
            </div>
            <p class="text-sm font-medium text-content-secondary">{{ formatMoney(opp.estimatedAmount) }}</p>
          </NuxtLink>
        </div>
      </template>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="closeStageModal">关闭</UButton>
      </template>
    </FormModal>
  </div>
</template>
