import type { AIReview, AIReviewResult } from '~/types/models'

interface ApiResponse<T = unknown> { code: number; data: T; message?: string }

export function useAIReview(contractId: Ref<string | undefined>) {
  const { $api } = useNuxtApp()
  const latestReview = ref<AIReview | null>(null)
  const loading = ref(false)
  const reviewing = ref(false)

  const fetchLatest = async () => {
    if (!contractId.value) return
    loading.value = true
    try {
      const res = await $api(`/api/contracts/${contractId.value}/ai-reviews/latest`) as ApiResponse<AIReview>
      latestReview.value = res.data
    } catch {
      latestReview.value = null
    } finally {
      loading.value = false
    }
  }

  const triggerReview = async (aiEmployeeId?: string) => {
    if (!contractId.value) return
    reviewing.value = true
    try {
      const res = await $api(`/api/contracts/${contractId.value}/ai-review`, {
        method: 'POST', body: { aiEmployeeId },
      }) as ApiResponse<{ id: string; result: AIReviewResult; modelUsed: string; duration: number }>
      if (res.data) {
        latestReview.value = {
          id: res.data.id,
          contractId: contractId.value!,
          aiEmployeeId: '',
          status: 'completed',
          result: res.data.result as AIReviewResult,
          modelUsed: res.data.modelUsed,
          duration: res.data.duration,
          errorMessage: null,
          triggeredBy: 'manual',
          createdAt: new Date().toISOString(),
        }
      }
      return res
    } finally {
      reviewing.value = false
    }
  }

  const formatDuration = (ms: number | null): string => {
    if (ms == null) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTokens = (tokens: number | null | undefined): string => {
    if (tokens == null) return ''
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}k`
    return `${tokens}`
  }

  const riskColor = (level: string): string => {
    switch (level) {
      case 'low': return 'green'
      case 'medium': return 'yellow'
      case 'high': return 'orange'
      case 'critical': return 'red'
      default: return 'gray'
    }
  }

  const riskLabel = (level: string): string => {
    switch (level) {
      case 'low': return '低风险'
      case 'medium': return '中风险'
      case 'high': return '高风险'
      case 'critical': return '严重风险'
      default: return level
    }
  }

  return {
    latestReview, loading, reviewing,
    fetchLatest, triggerReview,
    formatDuration, formatTokens, riskColor, riskLabel,
  }
}
