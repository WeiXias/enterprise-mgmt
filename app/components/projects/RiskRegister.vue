<script setup lang="ts">
const { getLabel } = useEnum()

interface Risk {
  id: string; title: string; description?: string
  type: 'risk' | 'issue'
  impact: 'low' | 'medium' | 'high'
  probability: 'low' | 'medium' | 'high'
  status: string
  mitigation?: string
  assignedTo?: string
}

const props = defineProps<{
  risks: Risk[]
  members?: { userId?: string; id?: string; name: string }[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update': [id: string, data: Partial<Risk>]
  delete: [id: string]
}>()

const typeColors = { risk: 'bg-brand-50 text-brand-700', issue: 'bg-red-50 text-red-600' }

const impactColors: Record<string, string> = { low: 'bg-surface-hover text-content-muted', medium: 'bg-brand-50 text-brand-700', high: 'bg-red-50 text-red-600' }
const impactScore: Record<string, number> = { low: 1, medium: 2, high: 3 }

const statusColors: Record<string, string> = {
  identified: 'bg-surface-hover text-content-muted',
  mitigating: 'bg-brand-50 text-brand-600',
  resolved: 'bg-teal-50 text-teal-600',
  closed: 'bg-surface-hover text-content-muted',
}

function riskScore(r: Risk): number {
  return (impactScore[r.impact] ?? 0) * (impactScore[r.probability] ?? 0)
}

function scoreColor(score: number): string {
  if (score >= 6) return 'bg-red-100 text-red-700'
  if (score >= 3) return 'bg-brand-100 text-brand-700'
  return 'bg-surface-hover text-content-muted'
}

const editTarget = ref<string | null>(null)
</script>

<template>
  <div>
    <!-- 风险矩阵 -->
    <div class="mb-4 p-3 rounded-md bg-surface-hover">
      <div class="text-xs text-content-muted mb-2">风险矩阵 (影响 × 概率)</div>
      <div class="grid grid-cols-4 gap-px">
        <div class="text-[10px] text-content-muted p-1 col-span-1" />
        <div v-for="pi in ['低', '中', '高']" :key="pi" class="text-[10px] text-content-muted text-center p-1">概率{{ pi }}</div>
        <template v-for="imp in ['高', '中', '低']" :key="imp">
          <div class="text-[10px] text-content-muted p-1">影响{{ imp }}</div>
          <div v-for="prob in ['low', 'medium', 'high']" :key="prob" :class="['text-center p-1 rounded text-xs', scoreColor((impactScore[imp === '高' ? 'high' : imp === '中' ? 'medium' : 'low'] ?? 0) * (impactScore[prob] ?? 0))]">
            {{ risks.filter(r => r.impact === (imp === '高' ? 'high' : imp === '中' ? 'medium' : 'low') && r.probability === prob).length || '-' }}
          </div>
        </template>
      </div>
    </div>

    <!-- 风险列表 -->
    <div v-if="loading" class="text-center py-4 text-content-muted text-xs">加载中...</div>
    <div v-else-if="risks.length === 0" class="text-center py-6 text-content-muted text-xs">暂无风险记录</div>
    <div v-else class="space-y-2">
      <div v-for="r in risks" :key="r.id" class="p-3 rounded-md bg-surface-hover">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-1.5">
            <span :class="['text-[10px] px-1 py-0.5 rounded-full', typeColors[r.type]]">{{ getLabel('RiskType', r.type) }}</span>
            <span class="text-sm text-content-secondary">{{ r.title }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span :class="['text-[10px] px-1 py-0.5 rounded-full', statusColors[r.status] || '']">{{ getLabel('RiskStatus', r.status) || r.status }}</span>
            <span :class="['text-[10px] px-1 py-0.5 rounded-full', scoreColor(riskScore(r))]">{{ riskScore(r) }}分</span>
          </div>
        </div>
        <div class="flex items-center gap-3 text-xs text-content-muted">
          <span>影响: <span :class="impactColors[r.impact] + ' px-1 rounded'">{{ getLabel('ImpactLevel', r.impact) }}</span></span>
          <span>概率: <span :class="impactColors[r.probability] + ' px-1 rounded'">{{ getLabel('ImpactLevel', r.probability) }}</span></span>
        </div>
        <p v-if="r.mitigation" class="text-xs text-content-muted mt-1">措施: {{ r.mitigation }}</p>
        <div class="flex gap-1 mt-2 pt-2 border-t border-line-light">
          <UButton size="xs" variant="ghost" color="neutral" @click="editTarget = editTarget === r.id ? null : r.id">编辑</UButton>
          <UButton size="xs" variant="ghost" color="error" @click="emit('delete', r.id)">删除</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
