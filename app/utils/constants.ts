import type { CustomerStatus, OpportunityStatus, ContractStatus, ProjectStatus, TaskStatus, TaskPriority, ProductStatus, CommissionStatus, FollowUpType, PaymentMethod, TodoPriority as TodoPriorityType, TodoStatus as TodoStatusType, ListColor as ListColorType } from '~/types/models'

/**
 * 通用状态配置映射
 * 从各页面提取统一管理
 */

// ============ 状态标签 + 颜色 ============

export const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, { label: string; color: string; dotColor: string }> = {
  potential: { label: '潜在客户', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
  intentional: { label: '意向客户', color: 'bg-brand-50 text-brand-700', dotColor: 'bg-brand-400' },
  closed: { label: '已成交', color: 'bg-teal-50 text-teal-700', dotColor: 'bg-teal-400' },
  lost: { label: '已流失', color: 'bg-red-50 text-red-600', dotColor: 'bg-red-400' },
}

export const OPPORTUNITY_STATUS_CONFIG: Record<OpportunityStatus, { label: string; color: string; dotColor: string }> = {
  initial_contact: { label: '初步接触', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
  requirement_confirmed: { label: '需求确认', color: 'bg-blue-50 text-blue-600', dotColor: 'bg-blue-400' },
  proposal_submitted: { label: '方案提交', color: 'bg-brand-50 text-brand-700', dotColor: 'bg-brand-400' },
  business_negotiation: { label: '商务谈判', color: 'bg-orange-50 text-orange-600', dotColor: 'bg-orange-400' },
  closed_won: { label: '已成交', color: 'bg-teal-50 text-teal-700', dotColor: 'bg-teal-400' },
  closed_lost: { label: '已输单', color: 'bg-red-50 text-red-600', dotColor: 'bg-red-400' },
}

export const CONTRACT_STATUS_CONFIG: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  approved: { label: '已审批', color: 'bg-blue-50 text-blue-600' },
  in_progress: { label: '执行中', color: 'bg-brand-50 text-brand-700' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  terminated: { label: '已终止', color: 'bg-red-50 text-red-600' },
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; dotColor: string }> = {
  not_started: { label: '未开始', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
  in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600', dotColor: 'bg-blue-400' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700', dotColor: 'bg-teal-400' },
  delayed: { label: '已延期', color: 'bg-red-50 text-red-600', dotColor: 'bg-red-400' },
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-gray-100 text-gray-600' },
  medium: { label: '中', color: 'bg-brand-50 text-brand-700' },
  high: { label: '高', color: 'bg-red-50 text-red-600' },
}

export const PRODUCT_STATUS_CONFIG: Record<ProductStatus, { label: string; color: string }> = {
  on_sale: { label: '在售', color: 'bg-teal-50 text-teal-700' },
  off_shelf: { label: '下架', color: 'bg-gray-100 text-gray-500' },
}

export const COMMISSION_STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'bg-gray-100 text-gray-600' },
  approved: { label: '已通过', color: 'bg-blue-50 text-blue-600' },
  rejected: { label: '已驳回', color: 'bg-red-50 text-red-600' },
  paid: { label: '已发放', color: 'bg-teal-50 text-teal-700' },
}

export const FOLLOWUP_TYPE_CONFIG: Record<FollowUpType, string> = {
  phone: '电话',
  visit: '拜访',
  wechat: '微信',
  email: '邮件',
  other: '其他',
}

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, string> = {
  bank_transfer: '银行转账',
  check: '支票',
  cash: '现金',
  alipay: '支付宝',
  wechat_pay: '微信支付',
  other: '其他',
}

export const USER_ROLE_CONFIG: Record<string, string> = {
  admin: '管理员',
  sales_manager: '销售负责人',
  sales_member: '销售/项目成员',
  finance: '财务',
}

// ============ 下拉选项（已迁移至数据字典）============

// ============ 待办模块 ============

export const TODO_PRIORITY_CONFIG: Record<TodoPriorityType, { label: string; color: string; dotColor: string }> = {
  urgent_important: { label: '紧急重要', color: 'bg-red-50 text-red-600', dotColor: 'bg-red-400' },
  urgent_not_important: { label: '紧急不重要', color: 'bg-orange-50 text-orange-600', dotColor: 'bg-orange-400' },
  important_not_urgent: { label: '重要不紧急', color: 'bg-brand-50 text-brand-700', dotColor: 'bg-brand-400' },
  not_urgent_not_important: { label: '不紧急不重要', color: 'bg-gray-100 text-gray-500', dotColor: 'bg-gray-400' },
}

export const TODO_STATUS_CONFIG: Record<TodoStatusType, { label: string; color: string; dotColor: string }> = {
  todo: { label: '待办', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
  in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600', dotColor: 'bg-blue-400' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700', dotColor: 'bg-teal-400' },
}

export const LIST_COLOR_CONFIG: Record<ListColorType, { label: string; bg: string; text: string; border: string; dot: string }> = {
  amber: { label: '琥珀', bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', dot: 'bg-brand-400' },
  teal: { label: '青绿', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-400' },
  blue: { label: '蓝色', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-400' },
  coral: { label: '珊瑚', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-400' },
  stone: { label: '石色', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
  violet: { label: '紫罗兰', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', dot: 'bg-violet-400' },
}

export const TODO_PRIORITY_QUADRANT: { key: TodoPriorityType; label: string; icon: string; position: string }[] = [
  { key: 'urgent_important', label: '紧急重要', icon: 'i-lucide-alert-circle', position: 'top-left' },
  { key: 'urgent_not_important', label: '紧急不重要', icon: 'i-lucide-clock', position: 'top-right' },
  { key: 'important_not_urgent', label: '重要不紧急', icon: 'i-lucide-target', position: 'bottom-left' },
  { key: 'not_urgent_not_important', label: '不紧急不重要', icon: 'i-lucide-minus', position: 'bottom-right' },
]

// 畅聊表情列表
export const CHAT_EMOJIS = [
  '😀','😂','🤣','😊','😍','🥰','😘','😎','🤩','👍','👏','🙌','❤️','🔥','🎉','💯','✅','❌','🤝','💪','🙏','🤔','😅','😢','😡','👋','🚀','⭐','💰','📌',
]
