<script setup lang="ts">
import type { AIReview } from '~/types/models'

const props = defineProps<{ contractId: string }>()

const { latestReview, loading, reviewing, fetchLatest, triggerReview, formatDuration, formatTokens, riskColor, riskLabel } =
  useAIReview(computed(() => props.contractId))

const emit = defineEmits<{ 'review-triggered': [] }>()

onMounted(() => { fetchLatest() })

const handleTrigger = async () => {
  await triggerReview()
  emit('review-triggered')
}

const riskBadgeColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-brand-100 text-brand-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}
</script>

<template>
  <div class="space-y-4">
    <!-- 无审核记录 -->
    <div v-if="!loading && !reviewing && !latestReview" class="warm-card text-center py-6">
      <UIcon name="i-lucide-bot" class="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500 mb-2">还没有 AI 审核记录</p>
      <p class="text-xs text-gray-400 mb-4">让 AI 数字员工帮你审核合同条款，评估风险</p>
      <UButton
        icon="i-lucide-sparkles"
        color="primary"
        size="sm"
        @click="handleTrigger"
      >
        开始 AI 审核
      </UButton>
    </div>

    <!-- 审核中 -->
    <div v-else-if="reviewing" class="warm-card text-center py-8">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 text-brand-500 mx-auto mb-3 animate-spin" />
      <p class="text-sm text-gray-500">AI 正在审核中...</p>
      <p class="text-xs text-gray-400 mt-1">这可能需要几十秒</p>
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="warm-card flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="w-6 h-6 text-gray-300 animate-spin" />
    </div>

    <!-- 审核结果 -->
    <template v-else-if="latestReview">
      <!-- 失败 -->
      <div v-if="latestReview.status === 'failed'" class="warm-card text-center py-6">
        <UIcon name="i-lucide-triangle-alert" class="w-10 h-10 text-red-300 mx-auto mb-3" />
        <p class="text-sm text-red-600 mb-2">AI 审核出错了</p>
        <p class="text-xs text-gray-400 mb-4">{{ latestReview.errorMessage || '未知错误' }}</p>
        <UButton
          icon="i-lucide-rotate-cw"
          color="secondary"
          size="sm"
          @click="handleTrigger"
        >
          重新审核
        </UButton>
      </div>

      <!-- 完成 -->
      <div v-else-if="latestReview.result" class="space-y-4">
        <!-- 总体评价卡片 -->
        <div class="warm-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-bot" class="w-5 h-5 text-brand-500" />
              <span class="text-sm font-medium text-gray-700">AI 审核结果</span>
            </div>
            <UButton
              icon="i-lucide-rotate-cw"
              color="secondary"
              variant="ghost"
              size="sm"
              @click="handleTrigger"
            >
              重新审核
            </UButton>
          </div>

          <!-- 风险等级 + 评分 -->
          <div class="flex items-center gap-3 mb-3">
            <span
              :class="riskBadgeColors[latestReview.result.riskLevel] || 'bg-gray-100 text-gray-600'"
              class="px-3 py-1 rounded-full text-xs font-medium"
            >
              {{ riskLabel(latestReview.result.riskLevel) }}
            </span>
            <span class="text-sm font-medium text-gray-600">
              综合评分 {{ latestReview.result.score }}/100
            </span>
          </div>

          <!-- 摘要 -->
          <p class="text-sm text-gray-600 leading-relaxed mb-3">{{ latestReview.result.summary }}</p>

          <!-- 元数据 -->
          <div class="flex items-center gap-4 text-xs text-gray-400">
            <span>模型 {{ latestReview.modelUsed }}</span>
            <span v-if="latestReview.duration">耗时 {{ formatDuration(latestReview.duration) }}</span>
            <span v-if="latestReview.promptTokens || latestReview.completionTokens">
              Token {{ formatTokens(latestReview.promptTokens) }} + {{ formatTokens(latestReview.completionTokens) }}
            </span>
            <span>{{ new Date(latestReview.createdAt).toLocaleString('zh-CN') }}</span>
          </div>
        </div>

        <!-- 亮点与问题 -->
        <div v-if="latestReview.result.highlights" class="grid grid-cols-2 gap-3">
          <div class="warm-card">
            <h4 class="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1">
              <UIcon name="i-lucide-thumbs-up" class="w-3.5 h-3.5" />
              合同亮点
            </h4>
            <ul class="space-y-1">
              <li v-for="(item, i) in latestReview.result.highlights.positive.slice(0, 5)" :key="'p' + i" class="text-xs text-gray-600 pl-3 leading-relaxed">
                · {{ item }}
              </li>
              <li v-if="latestReview.result.highlights.positive.length === 0" class="text-xs text-gray-400">暂无</li>
            </ul>
          </div>
          <div class="warm-card">
            <h4 class="text-xs font-medium text-red-500 mb-2 flex items-center gap-1">
              <UIcon name="i-lucide-thumbs-down" class="w-3.5 h-3.5" />
              需要关注
            </h4>
            <ul class="space-y-1">
              <li v-for="(item, i) in latestReview.result.highlights.negative.slice(0, 5)" :key="'n' + i" class="text-xs text-gray-600 pl-3 leading-relaxed">
                · {{ item }}
              </li>
              <li v-if="latestReview.result.highlights.negative.length === 0" class="text-xs text-gray-400">暂无</li>
            </ul>
          </div>
        </div>

        <!-- 风险标记 -->
        <div v-if="latestReview.result.riskFlags && latestReview.result.riskFlags.length > 0" class="warm-card">
          <h4 class="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
            <UIcon name="i-lucide-shield-alert" class="w-3.5 h-3.5 text-orange-500" />
            风险标记 ({{ latestReview.result.riskFlags.length }})
          </h4>
          <div class="space-y-2">
            <div
              v-for="(flag, i) in latestReview.result.riskFlags"
              :key="i"
              class="border border-gray-100 rounded-lg p-3 bg-gray-50/50"
            >
              <div class="flex items-start justify-between mb-1">
                <span class="text-xs font-medium text-gray-700">{{ flag.clause }}</span>
                <span :class="riskBadgeColors[flag.severity] || 'bg-gray-100 text-gray-600'" class="px-2 py-0.5 rounded-full text-xs">
                  {{ riskLabel(flag.severity) }}
                </span>
              </div>
              <p class="text-xs text-gray-500 mb-1">{{ flag.description }}</p>
              <p v-if="flag.suggestion" class="text-xs text-brand-600">
                建议：{{ flag.suggestion }}
              </p>
            </div>
          </div>
        </div>

        <!-- 修改建议 -->
        <div v-if="latestReview.result.suggestions && latestReview.result.suggestions.length > 0" class="warm-card">
          <h4 class="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
            <UIcon name="i-lucide-lightbulb" class="w-3.5 h-3.5 text-brand-500" />
            修改建议
          </h4>
          <ol class="space-y-2">
            <li v-for="(s, i) in latestReview.result.suggestions" :key="i" class="text-xs text-gray-600 pl-1 leading-relaxed">
              <span class="text-gray-400 font-medium">{{ i + 1 }}.</span> {{ s }}
            </li>
          </ol>
        </div>
      </div>
    </template>
  </div>
</template>
