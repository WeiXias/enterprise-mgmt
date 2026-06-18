// 商机模块共享状态和工具函数
export function useOpportunity() {
  const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
    initial_contact: { label: '初步接触', color: 'bg-surface-hover text-content-secondary', dotColor: 'bg-surface-muted' },
    requirement_confirmed: { label: '需求确认', color: 'bg-brand-50 text-brand-700', dotColor: 'bg-brand-400' },
    proposal_submitted: { label: '方案提交', color: 'bg-brand-50 text-brand-700', dotColor: 'bg-brand-400' },
    business_negotiation: { label: '商务谈判', color: 'bg-brand-50 text-brand-600', dotColor: 'bg-brand-400' },
    closed_won: { label: '已成交', color: 'bg-teal-50 text-teal-700', dotColor: 'bg-teal-400' },
    closed_lost: { label: '已输单', color: 'bg-danger-50 text-danger-600', dotColor: 'bg-danger-400' },
  }

  const stageFlow = ['initial_contact', 'requirement_confirmed', 'proposal_submitted', 'business_negotiation']

  function getStatusLabel(status: string) {
    return statusConfig[status]?.label || status
  }

  function getStatusColor(status: string) {
    return statusConfig[status]?.color || 'bg-surface-hover text-content-secondary'
  }

  function canAdvance(status: string) {
    const idx = stageFlow.indexOf(status)
    return idx >= 0 && idx < stageFlow.length - 1
  }

  function getNextStatusLabel(status: string) {
    const idx = stageFlow.indexOf(status)
    if (idx >= 0 && idx < stageFlow.length - 1) {
      return statusConfig[stageFlow[idx + 1] as keyof typeof statusConfig]?.label || ''
    }
    return ''
  }

  return { statusConfig, stageFlow, getStatusLabel, getStatusColor, canAdvance, getNextStatusLabel }
}
