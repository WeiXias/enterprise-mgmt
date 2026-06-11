const ENUM_LABELS: Record<string, Record<string, string>> = {
  UserRole: {
    admin: '管理员',
    sales_manager: '销售负责人',
    sales_member: '成员',
    finance: '财务'
  },
  CustomerStatus: {
    potential: '潜在客户',
    intentional: '意向客户',
    closed: '成交客户',
    lost: '流失客户'
  },
  OpportunityStatus: {
    initial_contact: '初步接触',
    requirement_confirmed: '需求确认',
    proposal_submitted: '方案提交',
    business_negotiation: '商务谈判',
    closed_won: '已成交',
    closed_lost: '已输单'
  },
  ContractStatus: {
    draft: '草稿',
    approved: '已审批',
    in_progress: '执行中',
    completed: '已完成',
    terminated: '已终止'
  },
  ProjectStatus: {
    not_started: '未开始',
    in_progress: '进行中',
    completed: '已完成',
    delayed: '已延期'
  },
  TaskStatus: {
    todo: '待办',
    in_progress: '进行中',
    completed: '已完成'
  },
  TaskPriority: {
    low: '低',
    medium: '中',
    high: '高'
  },
  ProductStatus: {
    on_sale: '在售',
    off_shelf: '下架'
  },
  CommissionStatus: {
    pending: '待审批',
    approved: '已审批',
    rejected: '已驳回',
    paid: '已发放'
  },
  FollowUpType: {
    phone: '电话',
    visit: '拜访',
    wechat: '微信',
    email: '邮件',
    other: '其他'
  }
}

export function useEnum() {
  function getLabel(enumType: string, value: string): string {
    return ENUM_LABELS[enumType]?.[value] || value
  }

  function getOptions(enumType: string): { label: string; value: string }[] {
    const map = ENUM_LABELS[enumType] || {}
    return Object.entries(map).map(([value, label]) => ({ label, value }))
  }

  return { getLabel, getOptions }
}
